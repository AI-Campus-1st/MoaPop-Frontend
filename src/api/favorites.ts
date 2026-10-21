/**
 * 찜 API (favorites 테이블, DEV_RULES 2-5, API_spec FAV-1~4)
 * 화면은 이 파일의 함수만 호출한다. user_id 는 보내지 않는다 — 서버 기본값(auth.uid())이 채우고,
 * 행 접근 제한(RLS)이 본인 행만 읽기·추가·삭제하게 한다.
 * 종료된 팝업 찜은 서버 삽입 정책이 막고(HTTP 403) 여기서 popup_ended 로 바꾼다(2026-10-20 확인, 4단계 D7).
 * 사용처: src/pages/popup-detail/useFavorite.ts (찜 여부·추가·해제)
 *         src/pages/stock-favorites/useFavoritePopups.ts (찜 목록·해제)
 */
import { supabase } from '../lib/supabase';
import { getSession } from './auth';
import { isPopupEnded } from './popups';
import type { FavoriteListResult, FavoritePopup, FavoriteResult, Popup } from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** 로그인했는지. 비로그인 요청은 서버에 보내지 않고 바로 not_signed_in 으로 돌려준다 */
async function isSignedIn(): Promise<boolean> {
  return (await getSession()) !== null;
}

/** 지금 로그인한 유저가 이 팝업을 찜했는지(FAV-1). 비로그인이면 false. 실패하면 예외 */
export async function isFavorite(popupId: string): Promise<boolean> {
  if (!(await isSignedIn())) return false;
  const { data, error } = await supabase.from('favorites').select('popup_id').eq('popup_id', popupId).limit(1);
  if (error) throw new Error(`isFavorite: ${error.message}`);
  return Array.isArray(data) && data.length > 0;
}

/**
 * 찜 추가(FAV-2). 이미 찜했으면 새로 쌓지 않고 성공(처음 created_at 유지, 서버 201).
 * 종료된 팝업은 popup_ended.
 */
export async function addFavorite(popupId: string): Promise<FavoriteResult> {
  if (!(await isSignedIn())) return { ok: false, code: 'not_signed_in' };
  try {
    // ignoreDuplicates: 이미 있으면 아무것도 하지 않는다(Prefer: resolution=ignore-duplicates)
    const { error } = await supabase.from('favorites').upsert({ popup_id: popupId }, { ignoreDuplicates: true });
    if (!error) return { ok: true };
    // 42501: 행 접근 제한(삽입 정책)에서 거부됨 → 로그인 상태의 앱에서 거부되는 이유는 종료된 팝업뿐
    return { ok: false, code: error.code === '42501' ? 'popup_ended' : 'unknown' };
  } catch {
    return { ok: false, code: 'unknown' };
  }
}

/** 찜 해제(FAV-3). 찜이 없어도 성공. 종료된 팝업도 해제할 수 있다 */
export async function removeFavorite(popupId: string): Promise<FavoriteResult> {
  if (!(await isSignedIn())) return { ok: false, code: 'not_signed_in' };
  try {
    const { error } = await supabase.from('favorites').delete().eq('popup_id', popupId);
    return error ? { ok: false, code: 'unknown' } : { ok: true };
  } catch {
    return { ok: false, code: 'unknown' };
  }
}

/** 찜 목록 정렬: 진행 중·시작 전 팝업 먼저, 종료된 팝업은 뒤로. 각 묶음 안에서는 찜한 시각 최신순 */
function compareFavoritePopups(a: FavoritePopup, b: FavoritePopup): number {
  if (a.isEnded !== b.isEnded) return a.isEnded ? 1 : -1;
  // created_at 은 같은 형식의 ISO 문자열이라 문자열 비교가 시각 비교와 같다
  return b.favoritedAt.localeCompare(a.favoritedAt);
}

/** 찜 목록 응답의 팝업 객체를 화면 타입으로 바꾼다(필수 칸이 빠졌으면 null) */
function toPopup(value: unknown): Popup | null {
  if (!isRecord(value)) return null;
  const { id, name, place_name, latitude, longitude, start_date, end_date, open_hours, description, image_url } = value;
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

/**
 * 지금 로그인한 유저의 찜 목록(FAV-4, DEV_RULES 2-6)
 * 찜과 팝업 정보를 한 번에 읽고(popup:popups(*)), 종료 여부를 붙여 정렬해서 돌려준다.
 * 팝업 정보를 읽지 못한 찜은 목록에서 뺀다.
 */
export async function getFavoritePopups(): Promise<FavoriteListResult> {
  if (!(await isSignedIn())) return { ok: false, code: 'not_signed_in' };
  try {
    const { data, error } = await supabase
      .from('favorites')
      .select('created_at,popup:popups(*)')
      .order('created_at', { ascending: false });
    if (error) return { ok: false, code: 'unknown' };

    const rows: unknown = data;
    const items = (Array.isArray(rows) ? rows : [])
      // 팝업을 읽으면 항목 하나, 못 읽으면 빈 배열 → flatMap 이 못 읽은 찜을 걸러 낸다
      .flatMap((row): FavoritePopup[] => {
        if (!isRecord(row) || typeof row.created_at !== 'string') return [];
        const popup = toPopup(row.popup);
        return popup ? [{ popup, favoritedAt: row.created_at, isEnded: isPopupEnded(popup) }] : [];
      });

    return { ok: true, items: items.sort(compareFavoritePopups) };
  } catch {
    return { ok: false, code: 'unknown' };
  }
}
