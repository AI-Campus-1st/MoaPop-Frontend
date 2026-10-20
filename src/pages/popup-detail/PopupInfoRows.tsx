/**
 * 팝업 기본 정보 3줄: 장소명 · 기간 · 운영 시간 (pages/popup-detail.md 구조 2)
 * 줄마다 MapPin / CalendarBlank / Clock 아이콘, body-sm muted.
 * 사용처: PopupDetailPage
 */
import { CalendarBlank, Clock, MapPin } from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import type { Popup } from '../../api/types';
import { formatPeriod } from '../../lib/format';

interface InfoRow {
  icon: Icon;
  /** 스크린리더용 항목 이름 */
  label: string;
  value: string;
}

export default function PopupInfoRows({ popup }: { popup: Popup }) {
  const rows: InfoRow[] = [
    { icon: MapPin, label: '장소', value: popup.place_name },
    { icon: CalendarBlank, label: '기간', value: formatPeriod(popup.start_date, popup.end_date) },
    { icon: Clock, label: '운영 시간', value: popup.open_hours },
  ];

  return (
    <dl className="flex flex-col gap-1.5">
      {rows.map(({ icon: IconComponent, label, value }) => (
        <div key={label} className="flex items-center gap-2 text-body-sm text-muted">
          <IconComponent size={18} weight="regular" className="shrink-0" aria-hidden />
          <dt className="sr-only">{label}</dt>
          <dd className="tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
