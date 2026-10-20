/**
 * 통계 카드 (components/my-widgets.md 'stat-card')
 * surface 면, 라벨(caption muted) → 큰 숫자(24px/700 tabular, number-md 굵기) → 보조 문구(caption muted).
 * 값이 없으면(불러오기 실패) 숫자 자리에 '–'.
 * 사용처: MyPage (내 제보 횟수, 체류 인증 이력)
 */
interface StatCardProps {
  label: string;
  /** null 이면 '–' */
  count: number | null;
  sub: string;
}

export default function StatCard({ label, count, sub }: StatCardProps) {
  return (
    <div className="flex h-full flex-col rounded-lg bg-surface p-4">
      <p className="text-caption text-muted">{label}</p>
      <p className="mt-1 text-[24px] font-bold leading-[1.3] text-ink tabular-nums">
        {count === null ? (
          <>
            <span aria-hidden>–</span>
            <span className="sr-only">알 수 없음</span>
          </>
        ) : (
          `${count}회`
        )}
      </p>
      <p className="mt-1 line-clamp-2 break-keep text-caption text-muted">{sub}</p>
    </div>
  );
}
