/**
 * 최근 검색어 저장소 (브라우저 localStorage)
 * 최신순 최대 3개, 같은 검색어는 맨 앞으로 이동. DB 저장·집계는 하지 않는다(DEV_RULES 4번).
 * 계정별로 따로 저장한다: 'moapop:recent-searches:{user_id}', 비로그인은 'moapop:recent-searches:guest'.
 * 로그인할 때 비로그인 기록을 계정 기록에 합치지 않는다(2026-10-16 사용자 결정).
 * 사용처: src/pages/PopupSearchPage.tsx
 */

const KEY_PREFIX = 'moapop:recent-searches';
const GUEST_ID = 'guest';
const MAX_ITEMS = 3;

/** 계정 구분 전에 쓰던 키. 누구의 기록인지 알 수 없어 지운다 */
const LEGACY_KEY = 'moapop:recent-searches';

/** ownerId: 로그인한 사용자의 user_id, 비로그인이면 null */
function storageKey(ownerId: string | null): string {
  return `${KEY_PREFIX}:${ownerId ?? GUEST_ID}`;
}

let legacyCleared = false;

/** 예전 공용 키를 한 번만 지운다 (앱을 열고 처음 읽을 때) */
function clearLegacyKey(): void {
  if (legacyCleared) return;
  legacyCleared = true;
  try {
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    // 저장소를 못 쓰는 환경이면 지울 것도 없다
  }
}

/** 그 사용자의 기록을 읽어 문자열 배열로 돌려준다. 값이 없거나 깨져 있으면 빈 배열 */
export function getRecentSearches(ownerId: string | null): string[] {
  clearLegacyKey();
  try {
    const raw = localStorage.getItem(storageKey(ownerId));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === 'string').slice(0, MAX_ITEMS);
  } catch {
    // 사생활 보호 모드 등으로 저장소를 못 쓰면 기록 없이 동작
    return [];
  }
}

function save(ownerId: string | null, items: string[]): void {
  try {
    localStorage.setItem(storageKey(ownerId), JSON.stringify(items));
  } catch {
    // 저장 실패는 화면 동작에 영향이 없으므로 무시
  }
}

/** 그 사용자의 기록 맨 앞에 검색어를 추가하고 갱신된 목록을 돌려준다 */
export function addRecentSearch(ownerId: string | null, query: string): string[] {
  const keyword = query.trim();
  if (!keyword) return getRecentSearches(ownerId);

  const next = [keyword, ...getRecentSearches(ownerId).filter((item) => item !== keyword)].slice(0, MAX_ITEMS);
  save(ownerId, next);
  return next;
}

/** 그 사용자의 기록에서 검색어 하나를 지우고 갱신된 목록을 돌려준다 */
export function removeRecentSearch(ownerId: string | null, query: string): string[] {
  const next = getRecentSearches(ownerId).filter((item) => item !== query);
  save(ownerId, next);
  return next;
}
