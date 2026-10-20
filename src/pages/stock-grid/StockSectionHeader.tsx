/**
 * 재고 섹션 제목 (components/stock.md 'section-header')
 * 라이브 점(brand-deep) + "실시간 재고 현황"(꾹꾹체 title-md) + "N개 품목"(body-sm, muted).
 * 갱신 시각은 표시하지 않는다. SKU 가 0개면 개수를 숨긴다(stock-grid.md '상태').
 * 실시간 연결이 끊기면 라이브 점을 disabled-text 로 바꾼다(feedback.md 오프라인 배너와 함께).
 * 사용처: StockGridPage
 */

interface StockSectionHeaderProps {
  /** 품목 수. null 이면 숨김 */
  count: number | null;
  /** 실시간 연결 중인지. false 면 라이브 점이 회색 */
  live?: boolean;
}

export default function StockSectionHeader({ count, live = true }: StockSectionHeaderProps) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-2 w-2 shrink-0 rounded-full ${live ? 'bg-brand-deep' : 'bg-disabled-text'}`} aria-hidden />
      <h1 className="font-display text-title-md text-ink">실시간 재고 현황</h1>
      {count !== null && <span className="text-body-sm text-muted tabular-nums">{count}개 품목</span>}
    </div>
  );
}
