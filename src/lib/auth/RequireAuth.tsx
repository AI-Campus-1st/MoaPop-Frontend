/**
 * 화면 단위 로그인 요구 (라우트 가드)
 * 비로그인이면 지금 주소를 기억한 채 /login 으로 보낸다. 막힌 화면은 방문 기록에 남기지 않는다(replace).
 * 연결: App.tsx 의 /my 라우트. 로그인이 필요한 화면 전체를 감쌀 때 쓴다.
 * 버튼 동작(찜·인증·제보)에는 useRequireAuth 를 쓴다.
 */
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { buildRedirectState } from './redirect';

export default function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();

  // 세션 확인 전에는 아무것도 그리지 않는다 (로그인한 사람이 로그인 화면을 잠깐 보는 깜빡임 방지)
  if (status === 'loading') return null;

  if (status === 'signedOut') {
    return <Navigate to="/login" replace state={buildRedirectState(location, false)} />;
  }

  return <>{children}</>;
}
