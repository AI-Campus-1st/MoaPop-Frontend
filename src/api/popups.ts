/**
 * 팝업 데이터 API
 * 화면은 이 파일의 함수만 호출한다. 검색·TOP3·상세는 Supabase(RPC·테이블·view)에서 읽는다(API_spec POP-1~3).
 * 서버 응답은 모양을 검사한 뒤 화면 타입(Popup·SkuPreview)으로 바꾼다. 종료·시작 전 판정은 화면용으로 여기 둔다.
 * 사용처: src/pages/PopupSearchPage.tsx (검색·TOP3), src/pages/popup-detail (상세·종료 판정),
 *         src/api/favorites.ts (종료된 팝업 찜 막기), src/api/stock.ts · src/api/checkins.ts (종료·시작 전 판정)
 */
import { supabase } from '../lib/supabase';
import type { Popup, PopupDetail, SkuPreview, TopReportedPopup } from './types';

/** 브라우저 현지 시간 기준 오늘 'YYYY-MM-DD' */
function todayString(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/**
 * 종료된 팝업인지 (오늘이 종료일 다음 날 이후). 시작 전 팝업은 종료가 아니다.
 * 종료된 팝업은 찜할 수 없다(popup-detail.md). 화면과 favorites API 가 함께 쓴다.
 * 서버도 찜 저장 때 같은 검증을 한다(favorites 삽입 정책, 한국 날짜 기준).
 */
export function isPopupEnded(popup: Popup): boolean {
  return todayString() > popup.end_date;
}

/**
 * 시작 전 팝업인지 (오늘이 시작일보다 앞). 시작 전 팝업에서는 현장 인증을 막는다.
 * 재고 확인 API(isUpcoming)와 체크인 API(popup_not_started)가 함께 쓴다.
 */
export function isPopupUpcoming(popup: Popup): boolean {
  return todayString() < popup.start_date;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * 서버의 팝업 행(popups, search_popups·top_reported_popups 응답)을 화면 타입으로 바꾼다.
 * 서버에는 이미지 참조·공식 계정 같은 칸이 더 있지만 화면은 쓰지 않으므로 고르지 않는다. 모양이 다르면 null.
 */
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

/** 서버의 굿즈 미리보기 행(sku_previews)을 화면 타입으로 바꾼다. 재고 상태는 원래 없다 */
function toSkuPreview(row: unknown): SkuPreview | null {
  if (!isRecord(row)) return null;
  const { id, popup_id, name, price, image_url } = row;
  if (typeof id !== 'string' || typeof popup_id !== 'string' || typeof name !== 'string') return null;
  return {
    id,
    popup_id,
    name,
    price: typeof price === 'number' ? price : null,
    image_url: typeof image_url === 'string' ? image_url : '',
  };
}

/** 배열의 각 항목을 바꾸고, 모양이 다른 항목은 뺀다 */
function mapRows<T>(rows: unknown, convert: (row: unknown) => T | null): T[] {
  if (!Array.isArray(rows)) return [];
  return rows.map(convert).filter((item): item is T => item !== null);
}

/**
 * 팝업 이름 부분 일치 검색 (POP-1, DEV_RULES 2-4)
 * 정렬(관련도 → 진행 중 → 이름순)·대소문자 무시·특수문자 안전 처리는 서버 search_popups 가 한다.
 * 검색어가 비면 서버를 부르지 않고 빈 목록. 실패하면 예외(화면이 오류 상태를 보여 준다).
 */
export async function searchPopups(query: string): Promise<Popup[]> {
  if (!query.trim()) return [];
  const { data, error } = await supabase.rpc('search_popups', { p_keyword: query });
  if (error) throw new Error(`searchPopups: ${error.message}`);
  return mapRows(data as unknown, toPopup);
}

/** TOP3 응답 항목 하나를 화면 타입으로 바꾼다 */
function toTopReported(row: unknown): TopReportedPopup | null {
  if (!isRecord(row)) return null;
  const popup = toPopup(row.popup);
  const { report_count, last_reported_at } = row;
  if (!popup || typeof report_count !== 'number' || typeof last_reported_at !== 'string') return null;
  return { popup, reportCount: report_count, lastReportedAt: last_reported_at };
}

/**
 * 실시간 제보 TOP3 (POP-2, popup-search.md 'TOP3 산정')
 * 최근 24시간 제보 건수·정렬·3개 자르기는 서버 top_reported_popups 가 한다. 제보가 없으면 빈 목록.
 */
export async function getTopReportedPopups(): Promise<TopReportedPopup[]> {
  const { data, error } = await supabase.rpc('top_reported_popups');
  if (error) throw new Error(`getTopReportedPopups: ${error.message}`);
  return mapRows(data as unknown, toTopReported);
}

/**
 * 팝업 상세 (POP-3, pages/popup-detail.md): 팝업 정보 + 판매 굿즈 미리보기(등록 순서)
 * 비로그인도 읽는다. 굿즈 미리보기에는 재고 상태가 없다(sku_previews view).
 * 없는 팝업(주소가 잘못된 경우)이면 null. 그 밖의 실패는 예외.
 */
export async function getPopupDetail(popupId: string): Promise<PopupDetail | null> {
  const [popupRes, skuRes] = await Promise.all([
    supabase.from('popups').select('*').eq('id', popupId).maybeSingle(),
    supabase
      .from('sku_previews')
      .select('id,popup_id,name,price,image_url,sort_order')
      .eq('popup_id', popupId)
      .order('sort_order', { ascending: true }),
  ]);

  // 주소의 id가 uuid 형식이 아니면 서버가 형식 오류(22P02)를 돌려준다 → 없는 팝업으로 본다
  if (popupRes.error?.code === '22P02') return null;
  if (popupRes.error) throw new Error(`getPopupDetail: ${popupRes.error.message}`);
  const popup = toPopup(popupRes.data as unknown);
  if (!popup) return null;
  if (skuRes.error) throw new Error(`getPopupDetail skus: ${skuRes.error.message}`);

  return { popup, skus: mapRows(skuRes.data as unknown, toSkuPreview) };
}
