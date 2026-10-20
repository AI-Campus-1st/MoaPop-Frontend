/**
 * 재고 확인 데이터 + 실시간 갱신 (pages/stock-grid.md, feedback.md 'update-flash' · 'offline-banner')
 * 로그인 상태(useAuth)를 따라 상태가 정해진다.
 * - 세션 확인 중 → loading / 비로그인 → signedOut / 로그인 → 불러와서 done | notFound | error
 * 불러온 뒤에는 src/api/stock.ts 의 subscribeStock 을 구독한다.
 * - 다른 사람 제보로 값이 바뀌면 그 카드만 바꾸고 번쩍인다(flashKeys), 스크린리더에 상태 변경을 알린다(announcement)
 * - 연결이 끊기면 connected=false (오프라인 배너). 다시 이어지면 놓친 변경을 반영한다
 * - 내 제보 성공은 applySku 로 바로 반영한다(번쩍임 O, 스크린리더 알림 X — 토스트가 알린다)
 * 사용처: StockGridPage
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { getStockGrid, subscribeStock } from '../../api/stock';
import type { SkuStatus, StockGrid, StockSku } from '../../api/types';
import { useAuth } from '../../lib/auth/AuthProvider';

export type StockGridState =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'notFound' }
  | { status: 'error' }
  | ({ status: 'done' } & StockGrid);

export interface StockGridView {
  state: StockGridState;
  /** 실시간 연결 중인지. false 면 오프라인 배너 */
  connected: boolean;
  /** SKU id → 번쩍임 번호. 값이 바뀔 때마다 1씩 는다 (SkuCard flashKey) */
  flashKeys: Record<string, number>;
  /** 스크린리더에 읽어 줄 최근 변경 문구 (다른 사람 제보) */
  announcement: string;
  /** 내 제보 결과를 바로 반영한다 (번쩍임 포함) */
  applySku: (sku: StockSku) => void;
  /** 이 SKU 를 '내가 제보함'으로 표시한다 ("제보 완료!") */
  markReported: (skuId: string) => void;
}

/** 스크린리더 알림 문구에 붙일 조사까지 포함한 상태 이름 */
const STATUS_PHRASE: Record<SkuStatus, string> = {
  available: '여유로',
  low: '소진 임박으로',
  soldout: '품절로',
};

export function useStockGrid(popupId: string): StockGridView {
  const { status: authStatus, session } = useAuth();
  const userId = session?.user_id ?? null;
  const [state, setState] = useState<StockGridState>({ status: 'loading' });
  const [connected, setConnected] = useState(true);
  const [flashKeys, setFlashKeys] = useState<Record<string, number>>({});
  const [announcement, setAnnouncement] = useState('');

  // 실시간 콜백에서 지금 그리는 값과 비교하려고 최신 state 를 ref 로도 들고 있다
  const stateRef = useRef(state);
  stateRef.current = state;

  /** state 를 바꾸면서 ref 도 바로 맞춘다 (같은 순간 연달아 온 변경을 올바르게 비교하려고) */
  const commit = useCallback((next: StockGridState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  // 진입·팝업 변경·로그인 변경 시 불러온다
  useEffect(() => {
    setConnected(true);
    setFlashKeys({});
    setAnnouncement('');

    if (authStatus === 'loading') {
      commit({ status: 'loading' });
      return;
    }
    if (authStatus === 'signedOut') {
      commit({ status: 'signedOut' });
      return;
    }

    // 팝업·유저가 바뀐 뒤에 도착한 예전 응답은 버린다
    let cancelled = false;
    commit({ status: 'loading' });

    getStockGrid(popupId)
      .then((result) => {
        if (cancelled) return;
        if (result.ok) {
          commit({
            status: 'done',
            popup: result.popup,
            skus: result.skus,
            myReportedSkuIds: result.myReportedSkuIds,
            isEnded: result.isEnded,
            isUpcoming: result.isUpcoming,
          });
          return;
        }
        // 세션이 그사이 끊긴 경우는 로그인 안내로
        if (result.code === 'not_signed_in') commit({ status: 'signedOut' });
        else if (result.code === 'not_found') commit({ status: 'notFound' });
        else commit({ status: 'error' });
      })
      .catch(() => {
        if (!cancelled) commit({ status: 'error' });
      });

    return () => {
      cancelled = true;
    };
  }, [authStatus, userId, popupId, commit]);

  /**
   * SKU 하나를 새 값으로 바꾼다. 상태·인원 수가 그대로면 아무것도 하지 않는다
   * (내 제보는 응답과 실시간 알림이 둘 다 오므로, 두 번째는 여기서 걸러진다).
   * announce: 상태가 바뀌었으면 스크린리더에 알릴지
   */
  const applyChange = useCallback(
    (sku: StockSku, announce: boolean) => {
      const current = stateRef.current;
      if (current.status !== 'done') return;
      const previous = current.skus.find((item) => item.id === sku.id);
      if (!previous || (previous.status === sku.status && previous.reportCount === sku.reportCount)) return;

      // 등록 순서는 그대로, 해당 카드만 바꾼다
      commit({ ...current, skus: current.skus.map((item) => (item.id === sku.id ? sku : item)) });
      setFlashKeys((keys) => ({ ...keys, [sku.id]: (keys[sku.id] ?? 0) + 1 }));
      if (announce && previous.status !== sku.status) setAnnouncement(`'${sku.name}' ${STATUS_PHRASE[sku.status]} 바뀌었어요`);
    },
    [commit],
  );

  const ready = state.status === 'done';

  // 불러온 뒤 실시간 구독. 팝업·유저가 바뀌거나 화면을 떠나면 해제
  useEffect(() => {
    const current = stateRef.current;
    if (!ready || current.status !== 'done') return;

    return subscribeStock(popupId, current.skus, {
      // 내 제보로 바뀐 값은 이미 applySku 로 반영했거나 곧 반영된다. 번쩍임만 같이 하고 알림은 토스트에 맡긴다
      onSkuChange: (sku, { mine }) => applyChange(sku, !mine),
      onConnection: setConnected,
    });
  }, [ready, popupId, userId, applyChange]);

  const applySku = useCallback((sku: StockSku) => applyChange(sku, false), [applyChange]);

  const markReported = useCallback(
    (skuId: string) => {
      const current = stateRef.current;
      if (current.status !== 'done' || current.myReportedSkuIds.includes(skuId)) return;
      commit({ ...current, myReportedSkuIds: [...current.myReportedSkuIds, skuId] });
    },
    [commit],
  );

  return { state, connected, flashKeys, announcement, applySku, markReported };
}
