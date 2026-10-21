/**
 * 인증 API (로그인 · 회원가입 · 로그아웃 · 세션)
 * 화면과 src/lib/auth 는 이 파일의 함수만 호출한다. 함수 이름과 결과 모양은 목업 때와 같다.
 * 처리: Supabase Auth(이메일·비밀번호) + profiles 테이블(닉네임·포인트). 세션은 supabase-js 가 브라우저에 저장·갱신한다.
 * 근거: docs/logics/AUTH_PROFILE.md, API_spec.md AUTH-1~5
 * 사용처: src/lib/auth/AuthProvider.tsx, src/api/reports.ts (refreshSession — 제보 후 포인트 갱신)
 */
import type { Session as AuthSession } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { AuthResult, Profile, Session, SignInErrorCode, SignUpErrorCode, SignUpInput } from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** 서버에서 받은 값이 프로필 모양인지 검사한다 */
function isProfile(value: unknown): value is Profile {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.nickname === 'string' &&
    typeof value.total_points === 'number'
  );
}

/** 내 프로필(닉네임·포인트)을 읽는다(AUTH-5). 행 접근 제한으로 본인 행만 읽힌다. 실패하면 null */
async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id,nickname,total_points')
    .eq('id', userId)
    .maybeSingle();
  if (error) return null;
  const row: unknown = data;
  return isProfile(row) ? row : null;
}

/**
 * Supabase 세션에 프로필을 붙여 앱의 Session 모양으로 만든다.
 * 로그인 정보가 없거나 프로필을 못 읽으면 null(로그아웃 상태로 본다).
 */
async function toSession(auth: AuthSession | null): Promise<Session | null> {
  if (!auth) return null;
  const profile = await fetchProfile(auth.user.id);
  if (!profile) return null;
  return { user_id: auth.user.id, email: auth.user.email ?? '', profile };
}

/* ------------------------------------------------------------------ */
/* 상태 변화 구독 (supabase.auth.onAuthStateChange)                      */
/* ------------------------------------------------------------------ */

type AuthListener = (session: Session | null) => void;

/** 이 앱이 직접 알릴 때 쓰는 구독자 목록(제보 후 포인트 갱신 등 Supabase 가 알려 주지 않는 변화) */
const localListeners = new Set<AuthListener>();

/**
 * 로그인·로그아웃·토큰 갱신이 일어날 때마다 listener 를 부른다. 돌려준 함수를 부르면 구독 해제.
 * 다른 탭의 로그인·로그아웃도 supabase-js 가 알려 준다.
 */
export function onAuthChange(listener: AuthListener): () => void {
  localListeners.add(listener);
  // 프로필을 읽는 동안 다음 변화가 오면 늦게 끝난 이전 결과로 덮어쓰지 않도록 차례 번호를 매긴다
  let latest = 0;
  const { data } = supabase.auth.onAuthStateChange((_event, authSession) => {
    const turn = ++latest;
    // 이 콜백 안에서 바로 다른 Supabase 호출을 기다리면 멈출 수 있어(공식 문서 경고) 다음 차례로 미룬다
    setTimeout(() => {
      toSession(authSession)
        .then((session) => {
          if (turn === latest) listener(session);
        })
        .catch(() => {
          if (turn === latest) listener(null);
        });
    }, 0);
  });
  return () => {
    localListeners.delete(listener);
    data.subscription.unsubscribe();
  };
}

/**
 * 내 프로필(포인트 등)을 다시 읽어 구독자에게 알린다.
 * 포인트는 서버(submit_report)가 바꾸는데 Supabase 로그인 알림은 오지 않으므로, 제보 성공 뒤 이걸 부른다.
 * 사용처: src/api/reports.ts submitReport
 */
export async function refreshSession(): Promise<void> {
  const session = await getSession();
  localListeners.forEach((listener) => listener(session));
}

/* ------------------------------------------------------------------ */
/* 공개 함수                                                            */
/* ------------------------------------------------------------------ */

/** 저장된 세션을 읽는다. 앱을 처음 열 때 한 번 부른다(새로고침해도 로그인 유지) */
export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  return toSession(data.session);
}

/** 이메일 · 비밀번호 로그인(AUTH-3). 이메일이 없거나 비밀번호가 틀리면 같은 invalid_credentials */
export async function signIn(email: string, password: string): Promise<AuthResult<SignInErrorCode>> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) return { ok: false, code: error.code === 'invalid_credentials' ? 'invalid_credentials' : 'unknown' };

    const session = await toSession(data.session);
    if (!session) return { ok: false, code: 'unknown' };
    return { ok: true, session };
  } catch {
    // 네트워크 끊김 등 서버에 닿지 못한 경우
    return { ok: false, code: 'unknown' };
  }
}

/**
 * 회원가입(AUTH-1 → AUTH-2 → AUTH-5). 성공하면 바로 로그인된 상태가 된다(이메일 확인 단계 없음).
 * 1) 닉네임 사용 가능 확인 2) 가입(닉네임은 메타데이터로 넘기고, 서버 트리거가 profiles 행을 만든다) 3) 프로필 읽기
 * 서버도 닉네임 규칙·중복을 다시 검사한다. 동시에 같은 닉네임으로 가입해 트리거가 실패하면 unknown.
 * 주의: 클라우드에서 이메일 확인(Confirm email)이 켜져 있으면 세션이 오지 않아 unknown 이 된다 → 배포 때 끈다.
 */
export async function signUp({ email, password, nickname }: SignUpInput): Promise<AuthResult<SignUpErrorCode>> {
  try {
    const trimmedNickname = nickname.trim();

    const { data: check, error: checkError } = await supabase.rpc('nickname_available', {
      p_nickname: trimmedNickname,
    });
    const checkResult: unknown = check;
    if (checkError || !isRecord(checkResult) || checkResult.ok !== true) return { ok: false, code: 'unknown' };
    if (checkResult.available !== true) return { ok: false, code: 'nickname_taken' };

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { nickname: trimmedNickname } },
    });
    if (error) {
      // 이미 가입된 이메일: Auth 가 user_already_exists(2026-10-20 확인) 또는 email_exists 로 알려 준다
      const taken = error.code === 'user_already_exists' || error.code === 'email_exists';
      return { ok: false, code: taken ? 'email_taken' : 'unknown' };
    }

    const session = await toSession(data.session);
    if (!session) return { ok: false, code: 'unknown' };
    return { ok: true, session };
  } catch {
    return { ok: false, code: 'unknown' };
  }
}

/** 로그아웃. 서버 요청이 실패해도 이 기기의 로그인은 지운다 */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) await supabase.auth.signOut({ scope: 'local' });
}
