/**
 * 현장 인증(체크인) API (checkins 테이블, DEV_RULES 2-2)
 * 화면은 좌표만 넘긴다. 거리 계산 · 500m 판정 · 만료 시각(2시간) 계산은 이 파일 안에서만 한다.
 * 이 파일이 '서버' 역할이라, Supabase 연결 시 함수 내부만 RPC/Edge Function 호출로 바꾸면 된다.
 * user_id 는 화면에서 넘기지 않고 현재 세션으로 정한다(서버에서는 auth.uid()).
 * 사용처: src/pages/stock-grid/useCheckin.ts, src/api/reports.ts (체류자 재검증), src/pages/my/useMyRecords.ts (getMyCheckins)
 *
 * 유효 규칙 (사용자 결정 A안, 2026-10-16)
 * - 내 체크인 기록 전체 중 가장 최근 한 줄만 본다.
 * - 그 줄이 지금 팝업이고 expires_at 전이면 인증 상태. 다른 팝업에서 인증하면 이전 팝업 인증은 끝난다.
 *
 * [인계 메모] 서버 연결 시
 * - checkins(user_id, popup_id, checked_in_at, expires_at), RLS 본인 것만 읽기. 쓰기는 RPC/Edge Function 만
 * - 거리 계산·종료/시작 전 검증·expires_at 계산을 서버 함수에서 한다(프론트 검증 금지)
 * - 가장 최근 기록: order by checked_in_at desc limit 1
 * - 위치 오차(accuracy)는 지금 판정에 쓰지 않는다
 */
import { getSession } from './auth';
import { mockPopups } from './mock/popups';
import { isPopupEnded, isPopupUpcoming } from './popups';
import type { ActiveCheckinResult, Checkin, CheckInResult, CheckinPosition, MyCheckin, MyCheckinsResult } from './types';

/** 네트워크 지연 흉내 (모달 '확인 중' 확인용). 서버 연결 시 삭제 */
const MOCK_DELAY_MS = 600;
const CHECKINS_KEY = 'moapop:mock-checkins';

/** 인증 반경 500m, 유효 2시간 (DEV_RULES 2-2) */
const CHECKIN_RADIUS_M = 500;
const CHECKIN_DURATION_MS = 2 * 60 * 60 * 1000;
const EARTH_RADIUS_M = 6_371_000;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isCheckinRow(value: unknown): value is Checkin {
  return (
    isRecord(value) &&
    typeof value.user_id === 'string' &&
    typeof value.popup_id === 'string' &&
    typeof value.checked_in_at === 'string' &&
    typeof value.expires_at === 'string'
  );
}

/** 저장된 체크인 기록 (모든 유저). 없거나 깨졌으면 빈 목록 */
function loadCheckins(): Checkin[] {
  try {
    const raw = localStorage.getItem(CHECKINS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(isCheckinRow) : [];
  } catch {
    return [];
  }
}

function saveCheckins(rows: Checkin[]): void {
  localStorage.setItem(CHECKINS_KEY, JSON.stringify(rows));
}

/** 이 유저의 가장 최근 체크인 한 줄. 없으면 null */
function latestCheckin(rows: Checkin[], userId: string): Checkin | null {
  let latest: Checkin | null = null;
  for (const row of rows) {
    if (row.user_id !== userId) continue;
    // ISO 시각 문자열은 사전순 비교가 시간순 비교와 같다
    if (!latest || row.checked_in_at > latest.checked_in_at) latest = row;
  }
  return latest;
}

/** 가장 최근 체크인이 이 팝업에서 아직 유효한지 (A안) */
function activeFor(latest: Checkin | null, popupId: string, now: number): Checkin | null {
  if (!latest || latest.popup_id !== popupId) return null;
  return new Date(latest.expires_at).getTime() > now ? latest : null;
}

function toRadians(degree: number): number {
  return (degree * Math.PI) / 180;
}

/** 두 좌표 사이 지표면 거리(미터). 하버사인 공식 */
function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

/**
 * 이 유저가 지금 이 팝업의 현장 체류자인지 (가장 최근 한 줄 규칙, A안). 아니면 null.
 * 제보 API(src/api/reports.ts)가 서버 쪽 체류자 재검증에 쓴다. 규칙을 한 곳에만 두려고 내보낸다.
 * [인계 메모] 서버에서는 제보 RPC 안에서 같은 쿼리로 검증한다.
 */
export function findActiveCheckin(userId: string, popupId: string): Checkin | null {
  return activeFor(latestCheckin(loadCheckins(), userId), popupId, Date.now());
}

/**
 * 이 팝업에서 지금 유효한 체크인 (재고 확인 화면 진입 시)
 * 유효하지 않으면 checkin: null.
 */
export async function getActiveCheckin(popupId: string): Promise<ActiveCheckinResult> {
  await wait(MOCK_DELAY_MS);

  try {
    const session = await getSession();
    if (!session) return { ok: false, code: 'not_signed_in' };

    const latest = latestCheckin(loadCheckins(), session.user_id);
    return { ok: true, checkin: activeFor(latest, popupId, Date.now()) };
  } catch {
    return { ok: false, code: 'unknown' };
  }
}

/**
 * 현장 인증 (checkin-modal [위치 확인])
 * 팝업 반경 500m 안이면 체크인 기록을 쌓고 돌려준다. expires_at = 지금 + 2시간.
 * 이 팝업에서 이미 유효한 체크인이 있으면 새로 쌓지 않고 그대로 돌려준다(시간 연장 없음).
 */
export async function checkIn(popupId: string, position: CheckinPosition): Promise<CheckInResult> {
  await wait(MOCK_DELAY_MS);

  try {
    const session = await getSession();
    if (!session) return { ok: false, code: 'not_signed_in' };

    const popup = mockPopups.find((item) => item.id === popupId);
    if (!popup) return { ok: false, code: 'not_found' };
    if (isPopupEnded(popup)) return { ok: false, code: 'popup_ended' };
    if (isPopupUpcoming(popup)) return { ok: false, code: 'popup_not_started' };

    const rows = loadCheckins();
    const now = Date.now();
    const existing = activeFor(latestCheckin(rows, session.user_id), popupId, now);
    if (existing) return { ok: true, checkin: existing };

    const distance = distanceMeters(position.latitude, position.longitude, popup.latitude, popup.longitude);
    if (distance > CHECKIN_RADIUS_M) return { ok: false, code: 'out_of_range' };

    const checkin: Checkin = {
      user_id: session.user_id,
      popup_id: popupId,
      checked_in_at: new Date(now).toISOString(),
      expires_at: new Date(now + CHECKIN_DURATION_MS).toISOString(),
    };
    saveCheckins([...rows, checkin]);
    return { ok: true, checkin };
  } catch {
    return { ok: false, code: 'unknown' };
  }
}

/**
 * 내 체크인 이력 (MY '체류 인증 이력': 누적 횟수 + 최근 팝업)
 * 최신순 전체. 팝업을 찾지 못한 기록은 목록에서 빼지만 totalCount 에는 센다.
 * [인계 메모] 서버 연결 시: 건수는 count(*), 최근 팝업은 checkins + popups 조인 order by checked_in_at desc limit 1
 */
export async function getMyCheckins(): Promise<MyCheckinsResult> {
  await wait(MOCK_DELAY_MS);

  try {
    const session = await getSession();
    if (!session) return { ok: false, code: 'not_signed_in' };

    const mine = loadCheckins()
      .filter((row) => row.user_id === session.user_id)
      .sort((a, b) => b.checked_in_at.localeCompare(a.checked_in_at));

    const items: MyCheckin[] = [];
    for (const checkin of mine) {
      const popup = mockPopups.find((item) => item.id === checkin.popup_id);
      if (popup) items.push({ checkin, popupName: popup.name });
    }
    return { ok: true, items, totalCount: mine.length };
  } catch {
    return { ok: false, code: 'unknown' };
  }
}
