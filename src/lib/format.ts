/**
 * 화면 표기 도우미 (날짜 · 가격 · 남은 시간 · 제보 시각)
 * 여러 화면이 같은 모양으로 보이도록 표기 규칙을 한곳에 모았다.
 * 사용처: components/PopupListItem (기간), pages/popup-detail (기간 · 가격), pages/stock-grid (가격 · 인증 남은 시간),
 *         pages/my (제보 시각 '10:50', 날짜 '오늘'/'어제'/'10.14')
 */

/** '2026-10-10' → '10.10' */
export function formatShortDate(date: string): string {
  const [, month, day] = date.split('-');
  return `${month}.${day}`;
}

/** 팝업 기간: '10.10 ~ 10.26' */
export function formatPeriod(startDate: string, endDate: string): string {
  return `${formatShortDate(startDate)} ~ ${formatShortDate(endDate)}`;
}

/** 가격: 14000 → '14,000원' (stock.md 'sku-price') */
export function formatPrice(price: number): string {
  return `${price.toLocaleString('ko-KR')}원`;
}

/**
 * 남은 시간 H:MM (checkin.md 인증 배너 '남은 시간 1:42')
 * 분 단위로 올림한다: 인증 직후 2:00, 마지막 1분은 0:01, 0 이하는 0:00.
 */
export function formatRemaining(remainingMs: number): string {
  const totalMinutes = Math.max(0, Math.ceil(remainingMs / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = String(totalMinutes % 60).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/** 두 자리로 채운다: 7 → '07' */
function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

/** ISO 시각 → 기기 현지 시각 24시간제 '10:50' (my 제보 내역·통계 카드) */
export function formatClock(iso: string): string {
  const date = new Date(iso);
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

/** 현지 날짜의 자정 시각(ms). 날짜만 비교할 때 쓴다 */
function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/**
 * ISO 시각 → 날짜 표기: 오늘이면 '오늘', 어제면 '어제', 그 전이면 '10.14' (기기 현지 날짜 기준)
 * 사용처: my 제보 내역 2줄 '팝업명 · 오늘', 통계 카드 '최근 제보 - 오늘 10:50'
 */
export function formatDayLabel(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  // 하루 = 86,400,000ms. 서머타임이 없는 지역 기준이라 반올림으로 날짜 차이를 구한다
  const dayDiff = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
  if (dayDiff === 0) return '오늘';
  if (dayDiff === 1) return '어제';
  return `${pad2(date.getMonth() + 1)}.${pad2(date.getDate())}`;
}
