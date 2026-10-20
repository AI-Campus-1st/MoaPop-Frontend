/**
 * 누적 포인트 큰 숫자 (components/my-widgets.md 'points-callout')
 * 숫자는 number-display(44px/800, tabular-nums), 뒤의 'P'는 title-md 꾹꾹체 20px.
 * 'P'는 ASCII 라서 꾹꾹체 서브셋에 항상 들어 있다.
 * 사용처: ProfileCard
 */
interface PointsCalloutProps {
  points: number;
}

export default function PointsCallout({ points }: PointsCalloutProps) {
  return (
    <p className="flex items-baseline text-ink">
      <span className="sr-only">누적 포인트 </span>
      {/* number-display 토큰: 44px / 800 / 줄 간격 1.1 */}
      <span className="text-[44px] font-extrabold leading-[1.1] tabular-nums">{points.toLocaleString('ko-KR')}</span>
      <span className="ml-0.5 font-display text-title-md">P</span>
    </p>
  );
}
