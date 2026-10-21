/**
 * 재고 확인 API (SKU Grid, DEV_RULES 2-1 · 2-3 · 2-7, API_spec STK-1 · STK-2)
 * 화면은 이 파일의 함수만 호출한다.
 * - getStockGrid: 팝업 + SKU(상태·제보 인원 수, 등록 순서) + 내가 제보한 SKU — 로그인 유저만(RLS)
 * - subscribeStock: Supabase Realtime 으로 이 팝업의 skus 변경을 구독. 끊기면 알리고, 다시 이어지면 놓친 변경을 다시 읽는다
 * 사용처: src/pages/stock-grid/useStockGrid.ts, src/api/reports.ts (toStockSkus — 제보 연결 전까지)
 */
import { REALTIME_CHANNEL_STATES } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { getSession } from './auth';
import { deriveSkuStates } from './mock/realtime';
import { isPopupEnded, isPopupUpcoming } from './popups';
import type { Popup, Sku, SkuStatus, StockGridResult, StockSku } from './types';

/** 재고 화면이 쓰는 skus 칸 */
const SKU_COLUMNS = 'id,popup_id,name,price,image_url,status,report_count';

/**
 * [임시] 목업 제보(src/api/reports.ts)가 쓰는 변환. 제보 연결(연결 5번)에서 reports.ts 와 함께 삭제한다.
 * 목업 skus 행에 목업 제보로 계산한 상태·인원 수를 입힌다.
 */
export function toStockSkus(skus: Sku[]): StockSku[] {
  const states = deriveSkuStates(skus);
  return skus.map((sku) => {
    const state = states.get(sku.id);
    return state ? { ...sku, status: state.status, reportCount: state.reportCount } : { ...sku, reportCount: 0 };
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isSkuStatus(value: unknown): value is SkuStatus {
  return value === 'available' || value === 'low' || value === 'soldout';
}

/** 서버 skus 행(조회 응답·실시간 알림의 새 값)을 화면 타입으로 바꾼다. 모양이 다르면 null */
function toStockSku(row: unknown): StockSku | null {
  if (!isRecord(row)) return null;
  const { id, popup_id, name, price, image_url, status, report_count } = row;
  if (typeof id !== 'string' || typeof popup_id !== 'string' || typeof name !== 'string' || !isSkuStatus(status)) {
    return null;
  }
  return {
    id,
    popup_id,
    name,
    price: typeof price === 'number' ? price : null,
    image_url: typeof image_url === 'string' ? image_url : '',
    status,
    reportCount: typeof report_count === 'number' ? report_count : 0,
  };
}

/** 서버 popups 행을 화면 타입으로 바꾼다. 필수 칸이 빠졌으면 null */
function toPopup(row: unknown): Popup | null {
  if (!isRecord(row)) return null;
  const { id, name, place_name, latitude, longitude, start_date, end_date, open_hours, description, image_url } = row;
  if (
    typeof id !== 'string' ||
    typeof name !== 'string' ||
    typeof place_name !== 'string' ||
    typeof latitude !== 'number' ||
    typeof longitude !== 'number' ||
    typeof start_date !== 'string' ||
    typeof end_date !== 'string' ||
    typeof open_hours !== 'string' ||
    typeof description !== 'string'
  ) {
    return null;
  }
  return {
    id,
    name,
    place_name,
    latitude,
    longitude,
    start_date,
    end_date,
    open_hours,
    description,
    image_url: typeof image_url === 'string' ? image_url : '',
  };
}

/** 이 팝업의 SKU 를 등록 순서(sort_order, 같으면 만든 시각)로 읽는다. 실패하면 예외 */
async function fetchStockSkus(popupId: string): Promise<StockSku[]> {
  const { data, error } = await supabase
    .from('skus')
    .select(SKU_COLUMNS)
    .eq('popup_id', popupId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw new Error(`fetchStockSkus: ${error.message}`);
  const rows: unknown = data;
  return Array.isArray(rows) ? rows.map(toStockSku).filter((sku): sku is StockSku => sku !== null) : [];
}

/**
 * 선택한 팝업의 재고 현황 (STK-1, pages/stock-grid.md)
 * 비로그인이면 not_signed_in, 팝업이 없으면 not_found. 찜 여부는 확인하지 않는다(찜하지 않은 팝업도 조회 가능).
 */
export async function getStockGrid(popupId: string): Promise<StockGridResult> {
  try {
    if (!(await getSession())) return { ok: false, code: 'not_signed_in' };

    const { data: popupRow, error: popupError } = await supabase.from('popups').select('*').eq('id', popupId).maybeSingle();
    // 주소의 id가 uuid 형식이 아니면 형식 오류(22P02) → 없는 팝업으로 본다
    if (popupError?.code === '22P02') return { ok: false, code: 'not_found' };
    if (popupError) return { ok: false, code: 'unknown' };
    const popup = toPopup(popupRow as unknown);
    if (!popup) return { ok: false, code: 'not_found' };

    const skus = await fetchStockSkus(popupId);

    // 내가 제보한 SKU: reports 는 본인 행만 읽힌다(RLS). 이 팝업의 SKU id 로 좁혀 읽는다
    let myReportedSkuIds: string[] = [];
    if (skus.length > 0) {
      const { data: reportRows, error: reportError } = await supabase
        .from('reports')
        .select('sku_id')
        .in(
          'sku_id',
          skus.map((sku) => sku.id),
        );
      if (reportError) return { ok: false, code: 'unknown' };
      const rows: unknown = reportRows;
      myReportedSkuIds = (Array.isArray(rows) ? rows : [])
        .map((row) => (isRecord(row) && typeof row.sku_id === 'string' ? row.sku_id : null))
        .filter((id): id is string => id !== null);
    }

    return { ok: true, popup, skus, myReportedSkuIds, isEnded: isPopupEnded(popup), isUpcoming: isPopupUpcoming(popup) };
  } catch {
    return { ok: false, code: 'unknown' };
  }
}

export interface StockSubscriptionHandlers {
  /**
   * SKU 의 상태나 제보 인원 수가 바뀌었을 때. mine: 가장 최근 제보가 내 것인지.
   * 실시간 알림은 누가 바꿨는지 알려 주지 않아 지금은 항상 false 다(제보 연결 단계에서 보완).
   */
  onSkuChange: (sku: StockSku, info: { mine: boolean }) => void;
  /** 실시간 연결이 끊기거나 다시 이어졌을 때 */
  onConnection: (connected: boolean) => void;
}

/**
 * 실시간 재고 구독(STK-2). 돌려준 함수를 부르면 해제한다.
 * baseline: 화면이 지금 그리고 있는 SKU. 이 값과 비교해 실제로 바뀐 SKU 만 알린다.
 * 연결될 때마다(처음 포함) SKU 를 한 번 다시 읽어, 불러온 뒤 구독 전·끊긴 동안의 변경도 알린다.
 */
export function subscribeStock(popupId: string, baseline: StockSku[], handlers: StockSubscriptionHandlers): () => void {
  // 마지막으로 알려 준 값 (sku id → 상태 + 인원 수)
  const snapshot = new Map(baseline.map((sku) => [sku.id, { status: sku.status, reportCount: sku.reportCount }]));
  let closed = false;
  let connected: boolean | null = null;

  /** 연결 상태가 실제로 바뀔 때만 화면에 알린다 */
  const setConnected = (next: boolean) => {
    if (closed || connected === next) return;
    connected = next;
    handlers.onConnection(next);
  };

  /** snapshot 과 다를 때만 알린다(같은 변경이 실시간 알림과 다시 읽기로 두 번 와도 한 번만) */
  const notify = (sku: StockSku) => {
    if (closed) return;
    const previous = snapshot.get(sku.id);
    if (previous && previous.status === sku.status && previous.reportCount === sku.reportCount) return;
    snapshot.set(sku.id, { status: sku.status, reportCount: sku.reportCount });
    handlers.onSkuChange(sku, { mine: false });
  };

  /** 놓친 변경을 메우려고 SKU 를 다시 읽어 비교한다. 실패하면 다음 연결 때 다시 한다 */
  const resync = async () => {
    try {
      const skus = await fetchStockSkus(popupId);
      skus.forEach(notify);
    } catch {
      // 무시: 연결이 다시 이어지면 또 시도한다
    }
  };

  const channel = supabase
    .channel(`stock:${popupId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'skus', filter: `popup_id=eq.${popupId}` },
      (payload) => {
        const sku = toStockSku(payload.new as unknown);
        if (sku) notify(sku);
      },
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        setConnected(true);
        void resync();
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        setConnected(false);
      }
    });

  // 브라우저가 오프라인을 알리면 배너를 바로 띄운다. 온라인이 되었는데 채널이 그대로 붙어 있으면 다시 연결됨으로
  const handleOffline = () => setConnected(false);
  const handleOnline = () => {
    if (channel.state === REALTIME_CHANNEL_STATES.joined) {
      setConnected(true);
      void resync();
    }
  };
  window.addEventListener('offline', handleOffline);
  window.addEventListener('online', handleOnline);

  return () => {
    closed = true;
    window.removeEventListener('offline', handleOffline);
    window.removeEventListener('online', handleOnline);
    void supabase.removeChannel(channel);
  };
}
