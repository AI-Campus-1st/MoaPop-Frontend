/**
 * 로딩 자리 표시 (components/feedback.md 'skeleton')
 * surface 면 위로 canvas 색 반짝임이 지나간다. 크기는 className 으로 정한다.
 * 사용처: PopupSearchPage (TOP3·검색 결과 로딩)
 */

interface SkeletonProps {
  className?: string;
}

export default function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`skeleton-shimmer rounded-lg bg-surface ${className}`} aria-hidden />;
}
