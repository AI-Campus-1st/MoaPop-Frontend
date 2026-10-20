/**
 * 찜 목록 불러오기 + 찜 해제 (pages/stock-favorites.md)
 * 로그인 상태(useAuth)를 따라 상태가 정해진다.
 * - 세션 확인 중 → loading / 비로그인 → signedOut / 로그인 → 목록을 불러와 done | error
 * 해제에 성공하면 서버에 다시 묻지 않고 목록에서 그 항목만 뺀다.
 * 사용처: StockFavoritesPage
 */
import { useCallback, useEffect, useState } from 'react';
import { getFavoritePopups, removeFavorite } from '../../api/favorites';
import type { FavoritePopup } from '../../api/types';
import { useAuth } from '../../lib/auth/AuthProvider';

export type FavoritePopupsState =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'done'; items: FavoritePopup[] }
  | { status: 'error' };

interface UseFavoritePopups {
  state: FavoritePopupsState;
  /** 찜 해제. 성공하면 true (목록에서도 빠짐), 실패하면 false */
  remove: (popupId: string) => Promise<boolean>;
}

export function useFavoritePopups(): UseFavoritePopups {
  const { status: authStatus, session } = useAuth();
  const userId = session?.user_id ?? null;
  const [state, setState] = useState<FavoritePopupsState>({ status: 'loading' });

  useEffect(() => {
    if (authStatus === 'loading') {
      setState({ status: 'loading' });
      return;
    }
    if (authStatus === 'signedOut') {
      setState({ status: 'signedOut' });
      return;
    }

    // 유저가 바뀐 뒤에 도착한 예전 응답은 버린다
    let cancelled = false;
    setState({ status: 'loading' });

    getFavoritePopups()
      .then((result) => {
        if (cancelled) return;
        if (result.ok) setState({ status: 'done', items: result.items });
        // 세션이 그사이 끊긴 경우: 로그인 안내로
        else setState(result.code === 'not_signed_in' ? { status: 'signedOut' } : { status: 'error' });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error' });
      });

    return () => {
      cancelled = true;
    };
  }, [authStatus, userId]);

  const remove = useCallback(async (popupId: string) => {
    try {
      const result = await removeFavorite(popupId);
      if (!result.ok) return false;

      setState((prev) =>
        prev.status === 'done' ? { status: 'done', items: prev.items.filter((item) => item.popup.id !== popupId) } : prev,
      );
      return true;
    } catch {
      return false;
    }
  }, []);

  return { state, remove };
}
