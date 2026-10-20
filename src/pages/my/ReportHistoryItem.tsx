/**
 * 제보 내역 한 줄 (components/my-widgets.md 'report-history-item')
 * 1줄: 굿즈명(sku-name-compact) | 시각 '10:50'(caption muted)
 * 2줄: 팝업명 · 날짜('오늘'/'어제'/'10.14', caption muted) | +10P(number-md, brand-deep)
 * 상태 칩·점·틴트는 쓰지 않는다(흰 카드 + 회색 글자).
 * tabIndex -1: 더보기로 새로 펼쳐진 첫 줄에 포커스를 옮기기 위해 (Tab 순서에는 들어가지 않음)
 * 사용처: ReportHistoryList
 */
import { forwardRef } from 'react';
import { REPORT_POINTS } from '../../api/reports';
import type { MyReport } from '../../api/types';
import { formatClock, formatDayLabel } from '../../lib/format';

interface ReportHistoryItemProps {
  item: MyReport;
}

const ReportHistoryItem = forwardRef<HTMLElement, ReportHistoryItemProps>(function ReportHistoryItem({ item }, ref) {
  const day = formatDayLabel(item.report.reported_at);
  const time = formatClock(item.report.reported_at);

  return (
    <article
      ref={ref}
      tabIndex={-1}
      className="rounded-md border border-hairline bg-card px-4 py-3.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-deep"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="min-w-0 truncate text-sku-name-compact font-bold text-ink">{item.skuName}</h3>
        <time dateTime={item.report.reported_at} className="shrink-0 text-caption text-muted tabular-nums">
          {time}
        </time>
      </div>
      <div className="mt-1 flex items-baseline justify-between gap-3">
        <p className="min-w-0 truncate text-caption text-muted">
          {item.popupName} · {day}
        </p>
        <p className="shrink-0 text-number-md font-bold text-brand-deep tabular-nums">+{REPORT_POINTS}P</p>
      </div>
    </article>
  );
});

export default ReportHistoryItem;
