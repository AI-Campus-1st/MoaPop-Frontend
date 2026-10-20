/**
 * 인증 API (로그인 · 회원가입 · 로그아웃 · 세션)
 * 화면과 src/lib/auth 는 이 파일의 함수만 호출한다.
 * 함수 이름과 동작을 Supabase Auth(supabase.auth.*)와 비슷하게 맞춰서, 서버 연결 시 함수 내부만 바꾼다.
 * 지금은 계정 목록과 현재 세션을 localStorage 에 둔다 (Supabase 도 세션을 브라우저에 저장한다).
 * 사용처: src/lib/auth/AuthProvider.tsx, src/api/reports.ts (applyPointsMock)
 */
import { seedAccounts, type MockAccount } from './mock/accounts';
import type { AuthResult, Session, SignInErrorCode, SignUpErrorCode, SignUpInput } from './types';

/** 네트워크 지연 흉내 (스피너 확인용). 서버 연결 시 삭제 */
const MOCK_DELAY_MS = 600;
const ACCOUNTS_KEY = 'moapop:mock-accounts';
const SESSION_KEY = 'moapop:session';

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/* ------------------------------------------------------------------ */
/* localStorage 읽기 · 쓰기                                             */
/* ------------------------------------------------------------------ */

function readJson(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as unknown) : null;
  } catch {
    // 저장소를 못 쓰거나 값이 깨졌으면 없는 것으로 본다
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 저장 실패 시 이번 실행 동안만 로그인이 유지된다
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** 저장된 값이 프로필 모양인지 검사 (깨진 값을 걸러낸다) */
function isProfile(value: unknown): value is Session['profile'] {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.nickname === 'string' &&
    typeof value.total_points === 'number'
  );
}

function isMockAccount(value: unknown): value is MockAccount {
  return isRecord(value) && typeof value.email === 'string' && typeof value.password === 'string' && isProfile(value.profile);
}

function isSession(value: unknown): value is Session {
  return isRecord(value) && typeof value.user_id === 'string' && typeof value.email === 'string' && isProfile(value.profile);
}

/** 저장된 계정 목록. 처음이면 시드 계정으로 채운다 */
function loadAccounts(): MockAccount[] {
  const stored = readJson(ACCOUNTS_KEY);
  if (Array.isArray(stored)) return stored.filter(isMockAccount);
  writeJson(ACCOUNTS_KEY, seedAccounts);
  return [...seedAccounts];
}

function loadSession(): Session | null {
  const stored = readJson(SESSION_KEY);
  return isSession(stored) ? stored : null;
}

function toSession(account: MockAccount): Session {
  return { user_id: account.profile.id, email: account.email, profile: account.profile };
}

/** 이메일은 대소문자 구분 없이 비교한다 (Supabase Auth 와 같은 기준) */
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/* ------------------------------------------------------------------ */
/* 상태 변화 구독 (supabase.auth.onAuthStateChange 대응)                 */
/* ------------------------------------------------------------------ */

type AuthListener = (session: Session | null) => void;
const listeners = new Set<AuthListener>();

function setSession(session: Session | null): void {
  if (session) writeJson(SESSION_KEY, session);
  else {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      // 무시
    }
  }
  listeners.forEach((listener) => listener(session));
}

if (typeof window !== 'undefined') {
  // 다른 탭에서 로그인·로그아웃·포인트 적립이 일어나면 이 탭에는 storage 이벤트로 온다 → 저장된 세션을 다시 읽어 알린다
  // (storage 이벤트는 값을 바꾼 탭 자신에게는 오지 않는다) [인계 메모] Supabase 연결 시 onAuthStateChange 가 대신하므로 삭제
  window.addEventListener('storage', (event) => {
    if (event.key !== SESSION_KEY && event.key !== null) return;
    const session = loadSession();
    listeners.forEach((listener) => listener(session));
  });
}

/** 로그인·로그아웃이 일어날 때마다 listener 를 부른다. 돌려준 함수를 부르면 구독 해제 */
export function onAuthChange(listener: AuthListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/* ------------------------------------------------------------------ */
/* 공개 함수                                                            */
/* ------------------------------------------------------------------ */

/** 저장된 세션을 읽는다. 앱을 처음 열 때 한 번 부른다 */
export async function getSession(): Promise<Session | null> {
  return loadSession();
}

/** 이메일 · 비밀번호 로그인 */
export async function signIn(email: string, password: string): Promise<AuthResult<SignInErrorCode>> {
  await wait(MOCK_DELAY_MS);

  const account = loadAccounts().find(
    (item) => normalizeEmail(item.email) === normalizeEmail(email) && item.password === password,
  );
  if (!account) return { ok: false, code: 'invalid_credentials' };

  const session = toSession(account);
  setSession(session);
  return { ok: true, session };
}

/**
 * 회원가입. 성공하면 바로 로그인된 상태가 된다 (이메일 인증 단계 없음).
 * 닉네임 중복 금지는 디자인 문구("이미 쓰고 있는 닉네임이에요") 기준.
 * [인계 메모] 서버 연결 시 profiles.nickname 에 unique 제약이 필요하다.
 */
export async function signUp({ email, password, nickname }: SignUpInput): Promise<AuthResult<SignUpErrorCode>> {
  await wait(MOCK_DELAY_MS);

  const accounts = loadAccounts();
  const trimmedNickname = nickname.trim();

  if (accounts.some((item) => normalizeEmail(item.email) === normalizeEmail(email))) {
    return { ok: false, code: 'email_taken' };
  }
  if (accounts.some((item) => item.profile.nickname === trimmedNickname)) {
    return { ok: false, code: 'nickname_taken' };
  }

  const account: MockAccount = {
    email: email.trim(),
    password,
    profile: { id: `user-${Date.now()}`, nickname: trimmedNickname, total_points: 0 },
  };
  writeJson(ACCOUNTS_KEY, [...accounts, account]);

  const session = toSession(account);
  setSession(session);
  return { ok: true, session };
}

/**
 * [Mock 전용] 포인트 적립 (profiles.total_points 누적, 차감 없음)
 * 제보 API(src/api/reports.ts)가 제보를 저장할 때 같이 부른다. 계정과, 같은 유저의 세션을 함께 고치고
 * 로그인 상태 구독자(AuthProvider)에게 새 세션을 알린다 → MY 등 화면이 새 포인트를 받는다.
 * 계정을 못 찾으면 아무것도 바꾸지 않고 null.
 * [인계 메모] 서버 연결 시 삭제한다. 적립은 제보 RPC 안에서 하고, AuthProvider 가 profiles 를 다시 읽는다.
 */
export function applyPointsMock(userId: string, points: number): number | null {
  const accounts = loadAccounts();
  const index = accounts.findIndex((account) => account.profile.id === userId);
  if (index === -1) return null;

  const profile = { ...accounts[index].profile, total_points: accounts[index].profile.total_points + points };
  const nextAccounts = [...accounts];
  nextAccounts[index] = { ...accounts[index], profile };
  writeJson(ACCOUNTS_KEY, nextAccounts);

  const session = loadSession();
  if (session?.user_id === userId) setSession({ ...session, profile });
  return profile.total_points;
}

/** 로그아웃 */
export async function signOut(): Promise<void> {
  setSession(null);
}
