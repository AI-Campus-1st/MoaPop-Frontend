/**
 * 팝업 데이터 API
 * 화면은 이 파일의 함수만 호출한다(직접 Mock 을 읽지 않음).
 * 지금은 Mock 을 읽고, Supabase 연결 시 함수 내부만 서버 쿼리/RPC 로 바꾼다.
 * 사용처: src/pages/PopupSearchPage.tsx (검색·TOP3), src/pages/popup-detail (상세·종료 판정),
 *         src/api/favorites.ts (종료된 팝업 찜 막기), src/api/stock.ts · src/api/checkins.ts (종료·시작 전 판정)
 */
import { mockPopups, mockSkus } from './mock/popups';
import { getAllReports } from './mock/realtime';
import type { Popup, PopupDetail, TopReportedPopup } from './types';

/** 네트워크 지연 흉내 (로딩 스켈레톤 확인용). 서버 연결 시 삭제 */
const MOCK_DELAY_MS = 400;
const TOP3_WINDOW_MS = 24 * 60 * 60 * 1000;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 오늘 날짜가 팝업 기간(시작·종료일 포함) 안에 있는지 */
function isOngoing(popup: Popup, today: string): boolean {
  // 'YYYY-MM-DD' 문자열은 사전순 비교가 날짜순 비교와 같다
  return popup.start_date <= today && today <= popup.end_date;
}

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
 * [인계 메모] 서버 연결 시 찜 저장 쪽(RLS 또는 RPC)에서도 같은 검증이 필요하다.
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

/** 검색 관련도: 0 정확 일치 > 1 앞부분 일치 > 2 포함 (작을수록 위) */
function matchRank(name: string, keyword: string): number {
  if (name === keyword) return 0;
  if (name.startsWith(keyword)) return 1;
  return 2;
}

/** 앞뒤 공백 제거 + 영문 소문자화 (서버의 대소문자 무시 검색 ilike 와 같은 기준) */
function normalize(text: string): string {
  return text.trim().toLowerCase();
}

/**
 * 팝업 이름 부분 일치 검색 (DEV_RULES 2-4)
 * 정렬: 정확 일치 → 앞부분 일치 → 포함, 같으면 진행 중 팝업 우선.
 */
export async function searchPopups(query: string): Promise<Popup[]> {
  await wait(MOCK_DELAY_MS);

  const keyword = normalize(query);
  if (!keyword) return [];

  const today = todayString();

  return mockPopups
    .filter((popup) => normalize(popup.name).includes(keyword))
    .map((popup) => ({
      popup,
      rank: matchRank(normalize(popup.name), keyword),
      ongoing: isOngoing(popup, today),
    }))
    // 1순위 관련도, 2순위 진행 중 여부(진행 중이 앞)
    .sort((a, b) => a.rank - b.rank || Number(b.ongoing) - Number(a.ongoing))
    .map(({ popup }) => popup);
}

/**
 * 실시간 제보 TOP3 (popup-search.md 'TOP3 산정')
 * 최근 24시간 제보 건수 내림차순, 같으면 최근 제보가 더 늦은 팝업이 앞. 제보 0건 팝업은 제외.
 */
export async function getTopReportedPopups(): Promise<TopReportedPopup[]> {
  await wait(MOCK_DELAY_MS);

  const since = Date.now() - TOP3_WINDOW_MS;
  const skuToPopup = new Map(mockSkus.map((sku) => [sku.id, sku.popup_id]));
  const stats = new Map<string, { count: number; last: string }>();

  // 시드 제보 + 이 브라우저에서 쌓인 제보 (제보 단계 이후 DEV_RULES 6번 'TOP3 다시 확인')
  for (const report of getAllReports()) {
    if (new Date(report.reported_at).getTime() < since) continue;
    const popupId = skuToPopup.get(report.sku_id);
    if (!popupId) continue;

    const current = stats.get(popupId) ?? { count: 0, last: report.reported_at };
    stats.set(popupId, {
      count: current.count + 1,
      last: report.reported_at > current.last ? report.reported_at : current.last,
    });
  }

  const ranked: TopReportedPopup[] = [];
  for (const popup of mockPopups) {
    const stat = stats.get(popup.id);
    if (stat) ranked.push({ popup, reportCount: stat.count, lastReportedAt: stat.last });
  }

  return ranked
    // ISO 시각 문자열은 사전순 비교가 시간순 비교와 같다
    .sort((a, b) => b.reportCount - a.reportCount || b.lastReportedAt.localeCompare(a.lastReportedAt))
    .slice(0, 3);
}

/**
 * 팝업 상세 (pages/popup-detail.md): 팝업 정보 + 판매 굿즈 목록
 * 없는 팝업(삭제됐거나 주소가 잘못된 경우)이면 null.
 */
export async function getPopupDetail(popupId: string): Promise<PopupDetail | null> {
  await wait(MOCK_DELAY_MS);

  const popup = mockPopups.find((item) => item.id === popupId);
  if (!popup) return null;

  return { popup, skus: mockSkus.filter((sku) => sku.popup_id === popupId) };
}
