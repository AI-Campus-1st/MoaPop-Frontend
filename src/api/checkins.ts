/**
 * 현장 인증(체크인) API (checkins 테이블, DEV_RULES 2-2, API_spec CHK-1~3)
 * 화면은 좌표만 넘긴다. 거리(500m)·종료·시작 전·이동 가능성 판정과 만료 시각(2시간) 계산은 서버 check_in 이 한다.
 * user_id 는 보내지 않는다(서버의 auth.uid()). 기기 위치는 서버 판정에만 쓰고 저장되지 않는다.
 * 유효 규칙: 내 기록 전체 중 가장 최근 한 줄이 이 팝업이고 만료 전이면 인증 상태(다른 팝업에서 인증하면 이전 인증은 끝).
 * 사용처: src/pages/stock-grid/useCheckin.ts, src/pages/my/useMyRecords.ts (getMyCheckins)
 */
import { supabase } from '../lib/supabase';
import { getSession } from './auth';
import type {
  ActiveCheckinResult,
  Checkin,
  CheckInErrorCode,
  CheckInResult,
  CheckinPosition,
  MyCheckin,
  MyCheckinsResult,
} from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** 서버의 인증 기록(객체)을 화면 타입으로 바꾼다. 모양이 다르면 null */
function toCheckin(value: unknown): Checkin | null {
  if (!isRecord(value)) return null;
  const { user_id, popup_id, checked_in_at, expires_at } = value;
  if (
    typeof user_id !== 'string' ||
    typeof popup_id !== 'string' ||
    typeof checked_in_at !== 'string' ||
    typeof expires_at !== 'string'
  ) {
    return null;
  }
  return { user_id, popup_id, checked_in_at, expires_at };
}

/** 서버가 돌려주는 체크인 실패 코드 중 화면이 아는 것만 그대로 쓰고, 나머지는 unknown */
const CHECKIN_CODES: readonly CheckInErrorCode[] = [
  'not_signed_in',
  'not_found',
  'popup_ended',
  'popup_not_started',
  'out_of_range',
];
function toCheckInCode(value: unknown): CheckInErrorCode {
  return CHECKIN_CODES.find((code) => code === value) ?? 'unknown';
}

/** 이 팝업에서 지금 유효한 내 인증(CHK-1). 없으면 checkin: null */
export async function getActiveCheckin(popupId: string): Promise<ActiveCheckinResult> {
  if (!(await getSession())) return { ok: false, code: 'not_signed_in' };
  try {
    const { data, error } = await supabase.rpc('get_active_checkin', { p_popup_id: popupId });
    if (error) return { ok: false, code: 'unknown' };
    const result: unknown = data;
    if (!isRecord(result)) return { ok: false, code: 'unknown' };
    if (result.ok !== true) return { ok: false, code: result.code === 'not_signed_in' ? 'not_signed_in' : 'unknown' };
    if (result.checkin === null) return { ok: true, checkin: null };
    const checkin = toCheckin(result.checkin);
    return checkin ? { ok: true, checkin } : { ok: false, code: 'unknown' };
  } catch {
    return { ok: false, code: 'unknown' };
  }
}

/**
 * 현장 인증(CHK-2). 위치 오차(accuracy)는 판정에 쓰지 않아 보내지 않는다.
 * 이미 유효한 인증이 있으면 서버가 그 기록을 그대로 돌려준다(새 기록·연장 없음).
 * 이동 가능성 검사(시속 200km)에 걸려도 out_of_range 로 온다(BUSINESS_LOGICS U-10).
 */
export async function checkIn(popupId: string, position: CheckinPosition): Promise<CheckInResult> {
  if (!(await getSession())) return { ok: false, code: 'not_signed_in' };
  try {
    const { data, error } = await supabase.rpc('check_in', {
      p_popup_id: popupId,
      p_latitude: position.latitude,
      p_longitude: position.longitude,
    });
    if (error) return { ok: false, code: 'unknown' };
    const result: unknown = data;
    if (!isRecord(result)) return { ok: false, code: 'unknown' };
    if (result.ok !== true) return { ok: false, code: toCheckInCode(result.code) };
    const checkin = toCheckin(result.checkin);
    return checkin ? { ok: true, checkin } : { ok: false, code: 'unknown' };
  } catch {
    return { ok: false, code: 'unknown' };
  }
}

/**
 * 내 체크인 이력(CHK-3, MY '체류 인증 이력': 누적 횟수 + 최근 팝업). 최신순 전체.
 * 전체 건수는 서버가 세어 준다(Prefer: count=exact → Content-Range). 팝업 이름을 못 읽은 기록은 목록에서만 뺀다.
 */
export async function getMyCheckins(): Promise<MyCheckinsResult> {
  if (!(await getSession())) return { ok: false, code: 'not_signed_in' };
  try {
    const { data, error, count } = await supabase
      .from('checkins')
      .select('user_id,popup_id,checked_in_at,expires_at,popup:popups(name)', { count: 'exact' })
      .order('checked_in_at', { ascending: false })
      .order('id', { ascending: false });
    if (error) return { ok: false, code: 'unknown' };

    const rows: unknown = data;
    const items: MyCheckin[] = [];
    for (const row of Array.isArray(rows) ? rows : []) {
      const checkin = toCheckin(row);
      const popup = isRecord(row) && isRecord(row.popup) ? row.popup : null;
      if (checkin && popup && typeof popup.name === 'string') items.push({ checkin, popupName: popup.name });
    }
    return { ok: true, items, totalCount: count ?? items.length };
  } catch {
    return { ok: false, code: 'unknown' };
  }
}
