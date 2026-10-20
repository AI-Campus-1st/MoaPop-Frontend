/**
 * 이 팝업의 찜 상태와 찜 추가·해제
 * - 비로그인: 찜 안 함으로 본다. 로그인·로그아웃이 바뀌면 다시 읽는다.
 * - 추가·해제는 서버 응답 후에 화면을 바꾼다(하트는 요청 중 잠김). 실패하면 원래 상태 그대로.
 * - 요청 중 다시 부르면 무시하고 { ok: false, code: 'unknown' } 을 돌려준다(중복 탭 방지).
 * 데이터는 src/api/favorites.ts 를 거친다.
 * 사용처: PopupDetailPage
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { addFavorite, isFavorite as fetchIsFavorite, removeFavorite } from '../../api/favorites';
import type { FavoriteResult } from '../../api/types';
import { useAuth } from '../../lib/auth/AuthProvider';

export interface UseFavoriteResult {
  isFavorite: boolean;
  /** 찜 여부를 아직 확인하는 중 */
  checking: boolean;
  /** 추가·해제 요청 중 */
  busy: boolean;
  add: () => Promise<FavoriteResult>;
  remove: () => Promise<FavoriteResult>;
}

const BUSY_RESULT: FavoriteResult = { ok: false, code: 'unknown' };

export function useFavorite(popupId: string): UseFavoriteResult {
  const { status: authStatus } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);

  // state 는 다음 렌더에 바뀌므로, 같은 순간의 연속 탭은 ref 로 막는다
  const busyRef = useRef(false);
  // 추가·해제가 일어날 때마다 1씩 올린다. 그 전에 시작된 '찜 여부 읽기' 응답이 새 값을 덮지 않게 한다
  const mutationSeqRef = useRef(0);

  useEffect(() => {
    if (authStatus === 'loading') return;
    if (authStatus === 'signedOut') {
      setIsFavorite(false);
      setChecking(false);
      return;
    }

    let cancelled = false;
    const seqAtStart = mutationSeqRef.current;
    setChecking(true);

    fetchIsFavorite(popupId)
      .then((value) => {
        if (!cancelled && seqAtStart === mutationSeqRef.current) setIsFavorite(value);
      })
      .catch(() => {
        // 읽기 실패는 '찜 안 함'으로 둔다. 하단 버튼으로 찜하면 이미 있어도 성공 처리된다
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });

    return () => {
      cancelled = true;
    };
  }, [popupId, authStatus]);

  /** 추가·해제 공통: 중복 요청 막기 + 성공하면 찜 상태 반영 */
  const mutate = useCallback(
    async (request: (id: string) => Promise<FavoriteResult>, nextValue: boolean): Promise<FavoriteResult> => {
      if (busyRef.current) return BUSY_RESULT;
      busyRef.current = true;
      mutationSeqRef.current += 1;
      setBusy(true);

      try {
        const result = await request(popupId);
        if (result.ok) setIsFavorite(nextValue);
        return result;
      } catch {
        return { ok: false, code: 'unknown' };
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [popupId],
  );

  const add = useCallback(() => mutate(addFavorite, true), [mutate]);
  const remove = useCallback(() => mutate(removeFavorite, false), [mutate]);

  return { isFavorite, checking, busy, add, remove };
}
