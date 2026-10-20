/**
 * 재고 확인 API (SKU Grid, DEV_RULES 2-1 · 2-3 · 2-7)
 * 화면은 이 파일의 함수만 호출한다. 지금은 Mock 을 읽고, Supabase 연결 시 함수 내부만 쿼리/구독으로 바꾼다.
 * - getStockGrid: 팝업 + SKU(상태·제보 인원 수) + 내가 제보한 SKU
 * - subscribeStock: 실시간 갱신 구독 (다른 사람 제보, 연결 끊김·복구)
 * 사용처: src/pages/stock-grid/useStockGrid.ts
 *
 * [인계 메모] 서버 연결 시
 * - 팝업 + SKU 를 한 번에 읽는 조인 쿼리 (select *, skus(*) from popups where id = ...)
 * - 재고 조회도 로그인 필요(DEV_RULES 2-7): RLS 로 로그인 유저만 읽게 한다
 * - SKU 순서는 등록 순 고정이다. skus 에 순서 컬럼(created_at 등)을 두고 그 순서로 정렬한다
 * - 제보 인원 수는 view/RPC 로 계산, 내가 제보한 SKU 는 reports where user_id = auth.uid()
 * - subscribeStock 은 Supabase Realtime(skus 변경 구독)으로 바꾼다. 재연결 시 놓친 변경을 다시 읽는다
 */
import { getSession } from './auth';
import { mockPopups, mockSkus } from './mock/popups';
import { deriveSkuStates, hasReported, isConnected, onConnectionChange, onReportsChange } from './mock/realtime';
import { isPopupEnded, isPopupUpcoming } from './popups';
import type { Sku, StockGridResult, StockSku } from './types';

/** 네트워크 지연 흉내 (스켈레톤 확인용). 서버 연결 시 삭제 */
const MOCK_DELAY_MS = 400;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** skus 행에 지금 상태·제보 인원 수를 입힌다 (Mock 배열 순서 = 등록 순서 유지) */
export function toStockSkus(skus: Sku[]): StockSku[] {
  const states = deriveSkuStates(skus);
  return skus.map((sku) => {
    const state = states.get(sku.id);
    return state ? { ...sku, status: state.status, reportCount: state.reportCount } : { ...sku, reportCount: 0 };
  });
}

/**
 * 선택한 팝업의 재고 현황 (pages/stock-grid.md)
 * 비로그인이면 not_signed_in, 팝업이 없으면 not_found.
 * 찜 여부는 확인하지 않는다(찜하지 않은 팝업도 조회 가능).
 */
export async function getStockGrid(popupId: string): Promise<StockGridResult> {
  await wait(MOCK_DELAY_MS);

  try {
    const session = await getSession();
    if (!session) return { ok: false, code: 'not_signed_in' };

    const popup = mockPopups.find((item) => item.id === popupId);
    if (!popup) return { ok: false, code: 'not_found' };

    const skus = toStockSkus(mockSkus.filter((sku) => sku.popup_id === popupId));
    const myReportedSkuIds = skus.filter((sku) => hasReported(session.user_id, sku.id)).map((sku) => sku.id);

    return {
      ok: true,
      popup,
      skus,
      myReportedSkuIds,
      isEnded: isPopupEnded(popup),
      isUpcoming: isPopupUpcoming(popup),
    };
  } catch {
    return { ok: false, code: 'unknown' };
  }
}

export interface StockSubscriptionHandlers {
  /** SKU 의 상태나 제보 인원 수가 바뀌었을 때. mine: 가장 최근 제보가 내 것인지 (내 제보는 화면이 이미 반영했다) */
  onSkuChange: (sku: StockSku, info: { mine: boolean }) => void;
  /** 실시간 연결이 끊기거나 다시 이어졌을 때 */
  onConnection: (connected: boolean) => void;
}

/**
 * 실시간 재고 구독. 돌려준 함수를 부르면 해제한다.
 * baseline: 화면이 지금 그리고 있는 SKU. 구독 직후 한 번 비교해서, 불러온 뒤 구독 전 사이의 변경도 알려 준다.
 * 끊긴 동안의 변경은 다시 이어질 때 한꺼번에 알려 준다(카드가 그때 번쩍인다).
 */
export function subscribeStock(popupId: string, baseline: StockSku[], handlers: StockSubscriptionHandlers): () => void {
  const popupSkus = mockSkus.filter((sku) => sku.popup_id === popupId);
  // 마지막으로 알려 준 값 (sku id → 상태 + 인원 수)
  const snapshot = new Map(baseline.map((sku) => [sku.id, { status: sku.status, reportCount: sku.reportCount }]));
  let userId: string | null = null;
  let closed = false;

  // '내 제보' 판별용. 세션 확인 전에 온 변경은 남의 것으로 본다
  void getSession().then((session) => {
    userId = session?.user_id ?? null;
  });

  /** 지금 값과 snapshot 을 비교해 바뀐 SKU 만 알린다. 끊긴 동안에는 알리지 않는다 */
  const check = () => {
    if (closed || !isConnected()) return;
    const states = deriveSkuStates(popupSkus);
    for (const sku of popupSkus) {
      const state = states.get(sku.id);
      const previous = snapshot.get(sku.id);
      if (!state || (previous && previous.status === state.status && previous.reportCount === state.reportCount)) continue;
      snapshot.set(sku.id, { status: state.status, reportCount: state.reportCount });
      handlers.onSkuChange(
        { ...sku, status: state.status, reportCount: state.reportCount },
        { mine: userId !== null && state.lastUserId === userId },
      );
    }
  };

  const offReports = onReportsChange(check);
  const offConnection = onConnectionChange((connected) => {
    // 다시 이어지면 놓친 변경을 먼저 반영하고 배너를 내린다
    if (connected) check();
    if (!closed) handlers.onConnection(connected);
  });

  if (isConnected()) check();
  else handlers.onConnection(false);

  return () => {
    closed = true;
    offReports();
    offConnection();
  };
}
