/**
 * MY 기록 불러오기: 내 제보 목록(더보기) + 내 체크인 이력 (pages/my.md)
 * - 화면에 들어올 때, 그리고 다른 탭·앱에서 돌아와 화면이 다시 보일 때 다시 불러온다.
 * - 다시 불러올 때는 지금 보이는 개수만큼 받아서, 더보기로 펼친 목록이 접히지 않게 한다.
 * - 처음 불러오기에 실패하면 error. 그 뒤 다시 불러오기(화면 복귀)에 실패하면 보이던 값을 그대로 둔다.
 * 포인트는 여기서 다루지 않는다(useAuth().session.profile.total_points 가 바로 갱신된다).
 * 데이터: src/api/reports.ts getMyReports, src/api/checkins.ts getMyCheckins
 * 사용처: src/pages/my/MyPage.tsx
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { getMyCheckins } from '../../api/checkins';
import { getMyReports } from '../../api/reports';
import type { MyReport } from '../../api/types';
import { useAuth } from '../../lib/auth/AuthProvider';

/** 처음에 보이는 개수, 더보기 한 번에 더 받는 개수 */
export const REPORT_PAGE_SIZE = 5;

export interface MyRecords {
  reports: MyReport[];
  /** 내 제보 전체 건수 */
  reportTotal: number;
  /** 다음 페이지 표시. null 이면 더 없음 */
  nextCursor: string | null;
  /** 체크인 기록 전체 건수 */
  checkinTotal: number;
  /** 가장 최근 체크인 팝업명. 없으면 null */
  latestCheckinPopupName: string | null;
}

export type MyRecordsState = { status: 'loading' } | { status: 'error' } | { status: 'done'; records: MyRecords };

interface UseMyRecords {
  state: MyRecordsState;
  /** 더보기 요청 중 */
  loadingMore: boolean;
  /** 실패 화면의 [다시 시도] */
  retry: () => void;
  /** 다음 페이지를 받아 목록 뒤에 붙인다. 성공하면 true, 실패하면 false (화면이 토스트를 띄운다) */
  loadMore: () => Promise<boolean>;
}

export function useMyRecords(): UseMyRecords {
  const { session } = useAuth();
  const userId = session?.user_id ?? null;

  const [state, setState] = useState<MyRecordsState>({ status: 'loading' });
  const [loadingMore, setLoadingMore] = useState(false);
  /** 요청 번호. 새 요청이 나가면 늦게 온 예전 응답은 버린다 */
  const requestIdRef = useRef(0);
  /** 다시 불러올 때 받을 개수 (더보기로 펼친 만큼) */
  const shownCountRef = useRef(REPORT_PAGE_SIZE);
  /** 상태를 effect 의존성 없이 읽기 위한 사본 */
  const stateRef = useRef(state);
  stateRef.current = state;

  /** 첫 페이지(+ 펼친 만큼) 제보와 체크인을 함께 불러온다. silent 면 스켈레톤 없이 값만 바꾼다 */
  const load = useCallback(async (silent: boolean) => {
    const requestId = ++requestIdRef.current;
    if (!silent) setState({ status: 'loading' });
    // 다시 불러오면 진행 중이던 더보기 응답은 버려지므로 스피너도 끈다
    setLoadingMore(false);

    try {
      const [reports, checkins] = await Promise.all([
        getMyReports({ limit: Math.max(REPORT_PAGE_SIZE, shownCountRef.current) }),
        getMyCheckins(),
      ]);
      if (requestId !== requestIdRef.current) return;

      if (!reports.ok || !checkins.ok) {
        // 이미 보이는 값이 있으면 조용히 실패: 그대로 둔다
        if (!silent || stateRef.current.status !== 'done') setState({ status: 'error' });
        return;
      }

      shownCountRef.current = Math.max(REPORT_PAGE_SIZE, reports.items.length);
      setState({
        status: 'done',
        records: {
          reports: reports.items,
          reportTotal: reports.totalCount,
          nextCursor: reports.nextCursor,
          checkinTotal: checkins.totalCount,
          latestCheckinPopupName: checkins.items[0]?.popupName ?? null,
        },
      });
    } catch {
      if (requestId !== requestIdRef.current) return;
      if (!silent || stateRef.current.status !== 'done') setState({ status: 'error' });
    }
  }, []);

  // 화면 진입(유저가 바뀌어도) 시 처음부터
  useEffect(() => {
    if (!userId) return;
    shownCountRef.current = REPORT_PAGE_SIZE;
    void load(false);
    return () => {
      // 화면을 떠난 뒤 온 응답은 버린다
      requestIdRef.current += 1;
    };
  }, [userId, load]);

  // 다른 탭·앱에서 돌아오면 조용히 다시 불러온다 (다른 탭에서 제보·인증한 기록 반영)
  useEffect(() => {
    if (!userId) return;
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void load(stateRef.current.status === 'done');
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [userId, load]);

  const retry = useCallback(() => {
    void load(false);
  }, [load]);

  const loadMore = useCallback(async () => {
    const current = stateRef.current;
    if (current.status !== 'done' || !current.records.nextCursor) return true;

    const requestId = ++requestIdRef.current;
    setLoadingMore(true);
    try {
      const result = await getMyReports({ limit: REPORT_PAGE_SIZE, cursor: current.records.nextCursor });
      // 그사이 다시 불러오기가 시작됐으면 이 응답은 버린다(새 목록이 기준)
      if (requestId !== requestIdRef.current) return true;
      setLoadingMore(false);
      if (!result.ok) return false;

      setState((prev) => {
        if (prev.status !== 'done') return prev;
        const reports = [...prev.records.reports, ...result.items];
        shownCountRef.current = reports.length;
        return {
          status: 'done',
          records: { ...prev.records, reports, reportTotal: result.totalCount, nextCursor: result.nextCursor },
        };
      });
      return true;
    } catch {
      if (requestId !== requestIdRef.current) return true;
      setLoadingMore(false);
      return false;
    }
  }, []);

  return { state, loadingMore, retry, loadMore };
}
