/**
 * 팝업 상세 로딩 자리 (feedback.md 'skeleton', popup-detail.md 상태 '로딩')
 * 대표 이미지(4:3) + 팝업명 + 정보 3줄 + 소개 글 자리.
 * 뒤로가기는 로딩 중에도 누를 수 있도록 부모가 위에 얹는다.
 * 사용처: PopupDetailPage
 */
import Skeleton from '../../components/Skeleton';

export default function PopupDetailSkeleton() {
  return (
    <div aria-busy="true" aria-label="불러오는 중">
      {/* 대표 이미지는 화면 가로를 꽉 채우므로 곡률을 없앤다 (Skeleton 기본 rounded-lg 를 덮어씀) */}
      <Skeleton className="aspect-[4/3] w-full !rounded-none" />
      <div className="px-4 pt-5">
        <Skeleton className="h-8 w-3/4" />
        <div className="mt-3 flex flex-col gap-2">
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-5 w-2/5" />
          <Skeleton className="h-5 w-1/3" />
        </div>
        <Skeleton className="mt-6 h-20 w-full" />
      </div>
    </div>
  );
}
