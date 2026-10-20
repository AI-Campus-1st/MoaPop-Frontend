/**
 * 누적 포인트 → 칭호 · 다음 칭호까지 진행률 (DEV_RULES 3번, components/my-widgets.md 'title-progress')
 * 칭호는 DB 에 저장하지 않고 여기서 계산한다. 입력만으로 결과가 정해지는 순수 함수다.
 * 사용처: StockGridPage (제보 토스트 '현재 칭호'), 이후 MY (칭호 칩, 진행바)
 *
 * 구간 (QA 경계값): 0~29 뚜벅이 덕후 / 30~99 현장 정찰병 / 100~299 헛걸음 방지단 / 300~ 오픈런 마스터
 */

interface TitleTier {
  /** 이 칭호가 시작되는 누적 포인트 */
  min: number;
  name: string;
}

/** 낮은 구간부터. 순서를 바꾸지 말 것 */
const TITLE_TIERS: TitleTier[] = [
  { min: 0, name: '뚜벅이 덕후' },
  { min: 30, name: '현장 정찰병' },
  { min: 100, name: '헛걸음 방지단' },
  { min: 300, name: '오픈런 마스터' },
];

/** 지금 포인트가 속한 구간 번호. 음수·소수는 0P 이상 정수로 다룬다 */
function tierIndex(points: number): number {
  const safe = Math.max(0, Math.floor(points));
  let index = 0;
  TITLE_TIERS.forEach((tier, i) => {
    if (safe >= tier.min) index = i;
  });
  return index;
}

/** 누적 포인트의 칭호 이름 */
export function getTitle(points: number): string {
  return TITLE_TIERS[tierIndex(points)].name;
}

export interface TitleProgress {
  title: string;
  /** 다음 칭호 이름. 최고 칭호면 null */
  nextTitle: string | null;
  /** 다음 칭호까지 남은 포인트. 최고 칭호면 0 */
  remaining: number;
  /** 진행률 0~1. 최고 칭호면 1 (진행바 가득) */
  ratio: number;
  /** 최고 칭호(오픈런 마스터)인지. 화면 문구 "최고 칭호예요" */
  isMax: boolean;
}

/**
 * 다음 칭호까지 진행 (MY 진행바)
 * 남은 포인트 = 다음 구간 시작 − 현재, 진행률 = (현재 − 구간 시작) ÷ (다음 구간 시작 − 구간 시작)
 */
export function getTitleProgress(points: number): TitleProgress {
  const safe = Math.max(0, Math.floor(points));
  const index = tierIndex(safe);
  const current = TITLE_TIERS[index];
  const next = TITLE_TIERS[index + 1];

  if (!next) return { title: current.name, nextTitle: null, remaining: 0, ratio: 1, isMax: true };

  return {
    title: current.name,
    nextTitle: next.name,
    remaining: next.min - safe,
    ratio: (safe - current.min) / (next.min - current.min),
    isMax: false,
  };
}
