/**
 * 회원가입 화면 (pages/login.md '회원가입 구조')
 * 위 → 아래: 뒤로가기(CaretLeft) → 제목 → 이메일 · 비밀번호 · 비밀번호 확인 · 닉네임 → [가입하기]
 * - [가입하기]는 네 칸을 모두 채우기 전엔 비활성.
 * - 검사는 [가입하기]를 처음 누를 때 하고, 그 뒤로는 입력할 때마다 다시 해서 고치면 문구가 바로 사라진다.
 * - 가입에 성공하면 바로 로그인 상태가 되어, 로그인을 요구했던 화면으로 돌아간다.
 * 라우트: /signup (App.tsx, 탭바 없음)
 */
import { useCallback, useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { CaretLeft } from '@phosphor-icons/react';
import type { SignUpErrorCode } from '../api/types';
import { useAuth } from '../lib/auth/AuthProvider';
import { getReturnTarget, readRedirectState } from '../lib/auth/redirect';
import ButtonPrimary from '../components/ButtonPrimary';
import HeaderIconButton from '../components/HeaderIconButton';
import TextInput from '../components/TextInput';
import Toast from '../components/Toast';

/* ------------------------------------------------------------------ */
/* 입력 검사 (규칙은 login 작업 시 사용자 확정, 2026-10-15)               */
/* ------------------------------------------------------------------ */

const PASSWORD_MIN_LENGTH = 6;
const NICKNAME_MIN_LENGTH = 2;
const NICKNAME_MAX_LENGTH = 10;
// '@' 앞뒤에 공백·@ 아닌 글자가 있고, 뒤쪽에 '.'으로 나뉜 도메인이 있는지만 본다 (최종 확인은 서버 몫)
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MESSAGES = {
  emailFormat: '이메일 형식을 확인해 주세요',
  emailTaken: '이미 가입된 이메일이에요',
  passwordLength: `비밀번호는 ${PASSWORD_MIN_LENGTH}자 이상이에요`,
  passwordMismatch: '비밀번호가 일치하지 않아요',
  nicknameLength: `닉네임은 ${NICKNAME_MIN_LENGTH}~${NICKNAME_MAX_LENGTH}자예요`,
  nicknameTaken: '이미 쓰고 있는 닉네임이에요',
  unknown: '가입에 실패했어요. 다시 시도해 주세요',
} as const;

interface SignupValues {
  email: string;
  password: string;
  passwordConfirm: string;
  nickname: string;
}

type FieldName = keyof SignupValues;
type FieldErrors = Partial<Record<FieldName, string>>;

const EMPTY_VALUES: SignupValues = { email: '', password: '', passwordConfirm: '', nickname: '' };

/** 화면에서 바로 알 수 있는 오류(형식·길이·일치)를 칸별로 돌려준다 */
function validate(values: SignupValues): FieldErrors {
  const errors: FieldErrors = {};
  const nicknameLength = values.nickname.trim().length;

  if (!EMAIL_PATTERN.test(values.email.trim())) errors.email = MESSAGES.emailFormat;
  if (values.password.length < PASSWORD_MIN_LENGTH) errors.password = MESSAGES.passwordLength;
  if (values.passwordConfirm !== values.password) errors.passwordConfirm = MESSAGES.passwordMismatch;
  if (nicknameLength < NICKNAME_MIN_LENGTH || nicknameLength > NICKNAME_MAX_LENGTH) {
    errors.nickname = MESSAGES.nicknameLength;
  }
  return errors;
}

/** 서버가 알려 주는 오류(중복)를 해당 칸의 문구로 바꾼다. 칸에 붙지 않는 오류는 null */
function serverErrorToField(code: SignUpErrorCode): { field: FieldName; message: string } | null {
  if (code === 'email_taken') return { field: 'email', message: MESSAGES.emailTaken };
  if (code === 'nickname_taken') return { field: 'nickname', message: MESSAGES.nicknameTaken };
  return null;
}

/* ------------------------------------------------------------------ */
/* 화면                                                                */
/* ------------------------------------------------------------------ */

export default function SignupPage() {
  const { status, signUp } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [values, setValues] = useState<SignupValues>(EMPTY_VALUES);
  /** 한 번이라도 [가입하기]를 눌렀는지. 이후로는 입력할 때마다 검사 결과를 보여 준다 */
  const [attempted, setAttempted] = useState(false);
  /** 서버가 알려 준 중복 오류. 그 칸을 고치면 지운다 */
  const [serverErrors, setServerErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);

  const closeToast = useCallback(() => setToast(null), []);

  // 가입 성공 직후(바로 로그인됨)와 이미 로그인한 채 들어온 경우 모두 원래 화면으로
  if (status === 'signedIn') {
    const target = getReturnTarget(readRedirectState(location.state));
    return <Navigate to={target.to} replace state={target.state} />;
  }

  const clientErrors = attempted ? validate(values) : {};
  // 형식 오류가 있으면 그 문구를 먼저, 없으면 서버 중복 오류를 보여 준다
  const errorOf = (field: FieldName) => clientErrors[field] ?? serverErrors[field];

  const allFilled =
    values.email.trim() !== '' && values.password !== '' && values.passwordConfirm !== '' && values.nickname.trim() !== '';

  const setField = (field: FieldName) => (value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setServerErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!allFilled || submitting) return;

    setAttempted(true);
    if (Object.keys(validate(values)).length > 0) return;

    setSubmitting(true);
    try {
      const result = await signUp({ email: values.email, password: values.password, nickname: values.nickname });
      // 성공하면 로그인 상태가 바뀌어 위의 Navigate 가 이동시킨다
      if (!result.ok) {
        const fieldError = serverErrorToField(result.code);
        if (fieldError) setServerErrors((prev) => ({ ...prev, [fieldError.field]: fieldError.message }));
        else setToast({ id: Date.now(), message: MESSAGES.unknown });
      }
    } catch {
      setToast({ id: Date.now(), message: MESSAGES.unknown });
    } finally {
      setSubmitting(false);
    }
  };

  // 뒤로가기는 로그인으로. 로그인을 요구한 화면 정보(state)를 그대로 돌려준다
  const handleBack = () => navigate('/login', { replace: true, state: location.state });

  return (
    <main className="mx-auto max-w-[480px] px-4 pb-12 pt-2">
      <HeaderIconButton icon={CaretLeft} label="로그인으로 돌아가기" onClick={handleBack} />

      <h1 className="mt-4 font-display text-display-md text-ink">모덕우 등록하기</h1>

      <form onSubmit={handleSubmit} noValidate className="mt-8">
        <div className="flex flex-col gap-3">
          <TextInput
            id="signup-email"
            type="email"
            value={values.email}
            onChange={setField('email')}
            placeholder="이메일"
            autoComplete="email"
            inputMode="email"
            enterKeyHint="next"
            error={errorOf('email')}
          />
          <TextInput
            id="signup-password"
            type="password"
            value={values.password}
            onChange={setField('password')}
            placeholder="비밀번호"
            autoComplete="new-password"
            enterKeyHint="next"
            error={errorOf('password')}
          />
          <TextInput
            id="signup-password-confirm"
            type="password"
            value={values.passwordConfirm}
            onChange={setField('passwordConfirm')}
            placeholder="비밀번호 확인"
            autoComplete="new-password"
            enterKeyHint="next"
            error={errorOf('passwordConfirm')}
          />
          <TextInput
            id="signup-nickname"
            value={values.nickname}
            onChange={setField('nickname')}
            placeholder="닉네임"
            autoComplete="nickname"
            enterKeyHint="done"
            error={errorOf('nickname')}
          />
        </div>

        <div className="mt-6">
          <ButtonPrimary type="submit" disabled={!allFilled} loading={submitting}>
            가입하기
          </ButtonPrimary>
        </div>
      </form>

      {toast && (
        <Toast key={toast.id} message={toast.message} variant="error" placement="bottom" onClose={closeToast} />
      )}
    </main>
  );
}
