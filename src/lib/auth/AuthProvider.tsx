/**
 * 로그인 상태 공유 (React Context)
 * 앱을 열 때 저장된 세션을 읽고, 로그인·로그아웃이 일어나면 모든 화면에 새 상태를 알린다.
 * 실제 처리는 src/api/auth.ts 가 하고, 여기서는 상태를 들고 있다가 나눠 줄 뿐이다.
 * 연결: main.tsx 에서 <App /> 을 감싼다. 화면에서는 useAuth() 로 꺼내 쓴다.
 */
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { getSession, onAuthChange, signIn, signOut, signUp } from '../../api/auth';
import type { Session } from '../../api/types';

/**
 * - loading: 저장된 세션 확인 중 (이때는 로그인 화면으로 보내지 않는다)
 * - signedIn / signedOut: 확인 완료
 */
export type AuthStatus = 'loading' | 'signedIn' | 'signedOut';

interface AuthContextValue {
  status: AuthStatus;
  session: Session | null;
  signIn: typeof signIn;
  signUp: typeof signUp;
  signOut: typeof signOut;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let cancelled = false;

    const apply = (next: Session | null) => {
      if (cancelled) return;
      setSession(next);
      setStatus(next ? 'signedIn' : 'signedOut');
    };

    // 구독을 먼저 걸어 두어, 세션을 읽는 사이에 일어난 변화도 놓치지 않는다
    const unsubscribe = onAuthChange(apply);
    getSession()
      .then(apply)
      .catch(() => apply(null));

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ status, session, signIn, signUp, signOut }),
    [status, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** 로그인 상태와 로그인·가입·로그아웃 함수를 꺼낸다. AuthProvider 안에서만 쓸 수 있다 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth 는 AuthProvider 안에서만 쓸 수 있어요. main.tsx 를 확인하세요.');
  }
  return context;
}
