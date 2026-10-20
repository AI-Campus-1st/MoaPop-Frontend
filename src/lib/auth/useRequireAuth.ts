/**
 * 동작 단위 로그인 요구 (찜·인증 버튼, 화면 안 [로그인하기]용)
 * requireAuth(intent) 를 버튼 처리 맨 앞에서 부른다.
 * - 로그인 상태면 true → 버튼 동작을 그대로 실행
 * - 아니면 false → 지금 화면과 할 일(intent)을 기억한 채 /login 으로 이동
 * 로그인 후 돌아온 화면은 readAuthIntent(location.state) 로 할 일을 꺼내 이어서 실행한다.
 * 사용처: popup-detail(찜 하트·하단 버튼, intent 있음)
 *         stock-favorites·stock-grid([로그인하기], [인증하기], intent 없음. 로그인 후 같은 화면으로 돌아오기만 한다)
 *
 * 예) const requireAuth = useRequireAuth();
 *     const handleFavorite = () => { if (!requireAuth('favorite')) return; saveFavorite(); };
 */
import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { buildRedirectState, type AuthIntent } from './redirect';

export function useRequireAuth(): (intent?: AuthIntent) => boolean {
  const { status } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  return useCallback(
    (intent?: AuthIntent) => {
      if (status === 'signedIn') return true;
      // 세션 확인 중에 누른 탭은 무시한다 (곧 상태가 정해진다)
      if (status === 'loading') return false;

      // replace: 로그인 화면이 지금 화면 자리를 대신한다. 닫으면(closeToFrom) 이 화면으로 돌아온다
      navigate('/login', { replace: true, state: buildRedirectState(location, true, intent) });
      return false;
    },
    [status, location, navigate],
  );
}
