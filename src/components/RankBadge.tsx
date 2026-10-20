/**
 * 순위 뱃지 (components/popup-list.md 'rank-badge')
 * 1위는 brand 채움, 2·3위는 brand-soft 채움 + brand 테두리.
 * 사용처: PopupListItem (TOP3 변형)
 */

interface RankBadgeProps {
  rank: number;
}

export default function RankBadge({ rank }: RankBadgeProps) {
  const fill = rank === 1 ? 'bg-brand' : 'border-[1.5px] border-brand bg-brand-soft';

  return (
    <span
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-number-md font-bold tabular-nums text-ink ${fill}`}
      aria-label={`${rank}위`}
    >
      {rank}
    </span>
  );
}
