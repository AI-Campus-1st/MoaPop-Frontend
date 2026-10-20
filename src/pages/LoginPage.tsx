/**
 * 로그인 화면 (pages/login.md '로그인 구조')
 * 위 → 아래: 닫기(X) → 워드마크 → 서브카피 → 이메일 · 비밀번호 → [로그인] → 회원가입 링크
 * - 로그인을 요구한 화면 정보는 location.state(AuthRedirectState)로 받고, 회원가입으로 갈 때도 그대로 넘긴다.
 * - 로그인에 성공하면(또는 이미 로그인 상태면) 요구한 화면으로 돌아간다. 이동은 아래 Navigate 한 곳에서만 한다.
 * 라우트: /login (App.tsx, 탭바 없음)
 */
import { useCallback, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { X } from '@phosphor-icons/react';
import { useAuth } from '../lib/auth/AuthProvider';
import { DEFAULT_RETURN_PATH, getReturnTarget, readRedirectState } from '../lib/auth/redirect';
import ButtonPrimary from '../components/ButtonPrimary';
import HeaderIconButton from '../components/HeaderIconButton';
import TextInput from '../components/TextInput';
import Toast from '../components/Toast';

const INVALID_CREDENTIALS_MESSAGE = '이메일 또는 비밀번호를 확인해 주세요';
const UNKNOWN_ERROR_MESSAGE = '로그인에 실패했어요. 다시 시도해 주세요';

/** 같은 문구가 연달아 떠도 토스트가 새로 3초를 세도록 id 를 붙인다 */
interface ToastState {
  id: number;
  message: string;
}

export default function LoginPage() {
  const { status, signIn } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const redirect = readRedirectState(location.state);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const closeToast = useCallback(() => setToast(null), []);

  // 로그인 성공 직후와 이미 로그인한 채 들어온 경우 모두 여기서 원래 화면으로 보낸다
  if (status === 'signedIn') {
    const target = getReturnTarget(redirect);
    return <Navigate to={target.to} replace state={target.state} />;
  }

  const canSubmit = email.trim() !== '' && password !== '';

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit || submitting) return;

    setSubmitting(true);
    try {
      const result = await signIn(email, password);
      // 성공하면 로그인 상태가 바뀌어 위의 Navigate 가 이동시킨다
      if (!result.ok) {
        const message = result.code === 'invalid_credentials' ? INVALID_CREDENTIALS_MESSAGE : UNKNOWN_ERROR_MESSAGE;
        setToast({ id: Date.now(), message });
      }
    } catch {
      setToast({ id: Date.now(), message: UNKNOWN_ERROR_MESSAGE });
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * 닫기(X): 직전 화면으로
   * - 버튼 동작에서 왔으면 그 화면(from)으로
   * - 화면 진입(MY 탭)에서 왔으면 막힌 화면 대신 방문 기록 한 칸 뒤로
   * - 주소를 직접 열어 앱 안 기록이 없으면(key 가 'default') 팝업 검색으로
   */
  const handleClose = () => {
    if (redirect?.closeToFrom) {
      navigate(redirect.from, { replace: true });
    } else if (location.key !== 'default') {
      navigate(-1);
    } else {
      navigate(DEFAULT_RETURN_PATH, { replace: true });
    }
  };

  return (
    <main className="mx-auto max-w-[480px] px-4 pb-12 pt-2">
      <HeaderIconButton icon={X} label="닫기" onClick={handleClose} />

      <h1 className="mt-6 font-display text-display-lg text-ink">모아팝</h1>
      <p className="mt-2 text-body-md text-muted">모덕우가 모은 현장 소식, 헛걸음 전에 확인하세요</p>

      <form onSubmit={handleSubmit} noValidate className="mt-8">
        <div className="flex flex-col gap-3">
          <TextInput
            id="login-email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="이메일"
            autoComplete="email"
            inputMode="email"
            enterKeyHint="next"
          />
          <TextInput
            id="login-password"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="비밀번호"
            autoComplete="current-password"
            enterKeyHint="go"
          />
        </div>

        <div className="mt-6">
          <ButtonPrimary type="submit" disabled={!canSubmit} loading={submitting}>
            로그인
          </ButtonPrimary>
        </div>
      </form>

      <p className="mt-4 flex items-center justify-center text-body-sm text-muted">
        아직 계정이 없나요?
        {/* replace: 로그인 ↔ 회원가입은 같은 자리를 바꿔 쓴다. 요구한 화면 정보(state)는 그대로 넘긴다 */}
        <Link
          to="/signup"
          replace
          state={location.state}
          className="ml-1 flex h-11 items-center rounded-sm px-1 font-bold text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-deep"
        >
          회원가입
        </Link>
      </p>

      {toast && (
        <Toast key={toast.id} message={toast.message} variant="error" placement="bottom" onClose={closeToast} />
      )}
    </main>
  );
}
