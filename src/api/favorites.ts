/**
 * 찜 API (favorites 테이블, DEV_RULES 2-5)
 * 화면은 이 파일의 함수만 호출한다. user_id 는 화면에서 넘기지 않고 현재 세션으로 정한다
 * (서버에서는 RLS 의 auth.uid() 가 같은 역할을 한다).
 * 지금은 찜 목록을 localStorage 에 둔다. Supabase 연결 시 함수 내부만 쿼리로 바꾼다.
 * 사용처: src/pages/popup-detail/useFavorite.ts (찜 여부·추가·해제)
 *         src/pages/stock-favorites/useFavoritePopups.ts (찜 목록·해제)
 *
 * [인계 메모] 서버 연결 시
 * - favorites: unique(user_id, popup_id), RLS 본인 것만 읽기·쓰기
 * - 추가는 insert ... on conflict do nothing (이미 찜했으면 그대로 성공)
 * - 종료된 팝업 찜 금지도 서버에서 검증한다
 * - favorites.popup_id 는 popups.id 를 가리키는 FK + on delete cascade (팝업이 지워지면 찜도 지워짐)
 * - 찜 목록은 favorites 와 popups 를 한 번에 읽는 조인 쿼리 (select popup:popups(*), created_at ...)
 */
import { getSession } from './auth';
import { mockPopups } from './mock/popups';
import { isPopupEnded } from './popups';
import type { Favorite, FavoriteListResult, FavoritePopup, FavoriteResult } from './types';

/** 네트워크 지연 흉내 (스피너·하트 잠금 확인용). 서버 연결 시 삭제 */
const MOCK_DELAY_MS = 400;
const FAVORITES_KEY = 'moapop:mock-favorites';

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isFavoriteRow(value: unknown): value is Favorite {
  return (
    isRecord(value) &&
    typeof value.user_id === 'string' &&
    typeof value.popup_id === 'string' &&
    typeof value.created_at === 'string'
  );
}

/** 저장된 찜 목록 (모든 유저). 없거나 깨졌으면 빈 목록 */
function loadFavorites(): Favorite[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(isFavoriteRow) : [];
  } catch {
    return [];
  }
}

function saveFavorites(rows: Favorite[]): void {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(rows));
}

async function currentUserId(): Promise<string | null> {
  const session = await getSession();
  return session?.user_id ?? null;
}

/** 지금 로그인한 유저가 이 팝업을 찜했는지. 비로그인이면 false */
export async function isFavorite(popupId: string): Promise<boolean> {
  await wait(MOCK_DELAY_MS);

  const userId = await currentUserId();
  if (!userId) return false;
  return loadFavorites().some((row) => row.user_id === userId && row.popup_id === popupId);
}

/**
 * 찜 추가. 이미 찜했으면 새로 쌓지 않고 성공으로 돌려준다(처음 created_at 유지).
 * 종료된 팝업은 찜할 수 없다(popup_ended).
 */
export async function addFavorite(popupId: string): Promise<FavoriteResult> {
  await wait(MOCK_DELAY_MS);

  const userId = await currentUserId();
  if (!userId) return { ok: false, code: 'not_signed_in' };

  const popup = mockPopups.find((item) => item.id === popupId);
  if (!popup) return { ok: false, code: 'unknown' };
  if (isPopupEnded(popup)) return { ok: false, code: 'popup_ended' };

  try {
    const rows = loadFavorites();
    if (!rows.some((row) => row.user_id === userId && row.popup_id === popupId)) {
      saveFavorites([...rows, { user_id: userId, popup_id: popupId, created_at: new Date().toISOString() }]);
    }
    return { ok: true };
  } catch {
    return { ok: false, code: 'unknown' };
  }
}

/** 찜 해제. 찜이 없어도 성공으로 돌려준다. 종료된 팝업도 해제는 할 수 있다 */
export async function removeFavorite(popupId: string): Promise<FavoriteResult> {
  await wait(MOCK_DELAY_MS);

  const userId = await currentUserId();
  if (!userId) return { ok: false, code: 'not_signed_in' };

  try {
    saveFavorites(loadFavorites().filter((row) => !(row.user_id === userId && row.popup_id === popupId)));
    return { ok: true };
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

/**
 * 지금 로그인한 유저의 찜 목록 (stock-favorites, DEV_RULES 2-6)
 * 각 찜에 팝업 정보와 종료 여부를 붙여 정렬해서 돌려준다.
 * 팝업이 지워져 찾을 수 없는 찜은 목록에서 뺀다(저장된 찜은 건드리지 않음).
 */
export async function getFavoritePopups(): Promise<FavoriteListResult> {
  await wait(MOCK_DELAY_MS);

  const userId = await currentUserId();
  if (!userId) return { ok: false, code: 'not_signed_in' };

  try {
    const items = loadFavorites()
      .filter((row) => row.user_id === userId)
      // 팝업을 찾으면 항목 하나, 못 찾으면 빈 배열 → flatMap 이 못 찾은 찜을 걸러 낸다
      .flatMap((row): FavoritePopup[] => {
        const popup = mockPopups.find((item) => item.id === row.popup_id);
        return popup ? [{ popup, favoritedAt: row.created_at, isEnded: isPopupEnded(popup) }] : [];
      });

    return { ok: true, items: items.sort(compareFavoritePopups) };
  } catch {
    return { ok: false, code: 'unknown' };
  }
}
