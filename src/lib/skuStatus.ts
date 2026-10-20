/**
 * 재고 상태별 표시 규칙 (BASE.md '상태 색 매핑', stock.md 'status-band-*')
 * 상태마다 라벨·아이콘·채움색·아이콘색을 한곳에 모았다. 상태는 항상 색 + 아이콘 + 텍스트로 함께 쓴다.
 * 사용처: src/pages/stock-grid/SkuCard.tsx (상태 띠), src/pages/stock-grid/ReportOption.tsx (제보 선택지)
 * Tailwind 가 클래스 이름을 찾을 수 있도록 클래스는 문자열 전체로 적는다(조립 금지).
 */
import { ArrowsClockwise, CheckCircle, Warning, XCircle } from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import type { ReportChoice, SkuStatus } from '../api/types';

export interface SkuStatusStyle {
  label: string;
  /** fill 굵기로 쓴다 */
  icon: Icon;
  /** 칩·띠 채움 (strong) */
  fillClass: string;
  /** 아이콘 색 (deep). 글자에는 쓰지 않는다 */
  iconClass: string;
}

export const SKU_STATUS_STYLE: Record<SkuStatus, SkuStatusStyle> = {
  available: { label: '여유', icon: CheckCircle, fillClass: 'bg-safe-strong', iconClass: 'text-safe-deep' },
  low: { label: '소진 임박', icon: Warning, fillClass: 'bg-warn-strong', iconClass: 'text-warn-deep' },
  soldout: { label: '품절', icon: XCircle, fillClass: 'bg-soldout-strong', iconClass: 'text-soldout-deep' },
};

/** 제보 선택지 표시 규칙: 상태 스타일 + 테두리(deep, 1.5px) */
export interface ReportChoiceStyle extends SkuStatusStyle {
  borderClass: string;
}

/**
 * 제보 바텀시트 선택지 (components/checkin.md 'report-option-*')
 * 재입고는 결과가 소진 임박(노랑)이라 warn 색을 쓰고, 아이콘만 ArrowsClockwise 로 구분한다 (2026-10-16 사용자 결정)
 */
export const REPORT_CHOICE_STYLE: Record<ReportChoice, ReportChoiceStyle> = {
  low: { ...SKU_STATUS_STYLE.low, borderClass: 'border-warn-deep' },
  soldout: { ...SKU_STATUS_STYLE.soldout, borderClass: 'border-soldout-deep' },
  restock: { label: '재입고', icon: ArrowsClockwise, fillClass: 'bg-warn-strong', iconClass: 'text-warn-deep', borderClass: 'border-warn-deep' },
};

/**
 * 지금 상태에서 보여 줄 선택지 (pages/report-sheet.md '상태')
 * 여유: 소진 임박 · 품절 / 소진 임박: 소진 임박(현재 상태) · 품절 / 품절: 재입고 · 품절(현재 상태)
 */
export function reportChoicesFor(status: SkuStatus): ReportChoice[] {
  return status === 'soldout' ? ['restock', 'soldout'] : ['low', 'soldout'];
}
