/**
 * 재고 확인 로딩 자리 (pages/stock-grid.md '상태' 로딩, feedback.md 'skeleton')
 * 상단바 선택자 → 인증 배너(80px) → 섹션 제목 → SKU 카드 4개(2열) 자리를 실제 모양대로 채운다.
 * 사용처: StockGridPage
 */
import Skeleton from '../../components/Skeleton';

/** SKU 카드 한 장 자리: 사진(정사각형) + 굿즈명 + 가격 + 버튼 */
function SkuCardSkeleton() {
  return (
    <div className="rounded-lg border border-hairline bg-card p-2.5">
      <Skeleton className="aspect-square" />
      <Skeleton className="mt-2 h-4 w-4/5" />
      <Skeleton className="mt-2 h-4 w-1/2" />
      <Skeleton className="mt-2.5 h-11" />
    </div>
  );
}

export default function StockGridSkeleton() {
  return (
    <div aria-busy="true" aria-label="불러오는 중">
      <div className="flex h-14 items-center">
        <Skeleton className="h-6 w-48" />
      </div>
      <Skeleton className="h-20" />
      <Skeleton className="mt-6 h-7 w-44" />
      <div className="mt-3 grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((key) => (
          <SkuCardSkeleton key={key} />
        ))}
      </div>
    </div>
  );
}
