/**
 * 현재 칭호 칩 (components/my-widgets.md 'title-chip')
 * brand(민트) 면 + ink 글자, 높이 32px 알약. 민트 위 글자는 ink (BASE: 민트를 글자색으로 쓰지 않음).
 * 사용처: ProfileCard
 */
interface TitleChipProps {
  title: string;
}

export default function TitleChip({ title }: TitleChipProps) {
  return (
    <span className="inline-flex h-8 shrink-0 items-center rounded-full bg-brand px-[14px] text-chip font-bold text-ink">
      <span className="sr-only">현재 칭호 </span>
      {title}
    </span>
  );
}
