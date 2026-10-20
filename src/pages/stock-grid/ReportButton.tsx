/**
 * 제보 버튼 (components/controls.md 'button-report')
 * 현장 인증 후 SKU 카드 하단에 둔다. ink 보다 한 톤 부드러운 차콜(#4A4953) 면 + Megaphone + "제보".
 * 누르면 화면이 제보 바텀시트를 연다.
 * loading: 그 SKU 를 제출 중일 때 스피너 + 비활성 (stock.md '카드 상태' 제출 중, 중복 탭 방지).
 *          제출 중에는 시트가 닫히지 않아 보통 가려져 있지만, 카드 상태를 문서와 맞춰 둔다.
 * "제보 완료!"는 ReportDone. 어느 버튼을 쓸지는 StockGridPage 의 renderFooter 가 고른다.
 * 사용처: StockGridPage (SkuCard footer)
 */
import { CircleNotch, Megaphone } from '@phosphor-icons/react';

interface ReportButtonProps {
  /** 스크린리더에서 어느 굿즈의 버튼인지 알리기 위한 이름 */
  skuName: string;
  onClick: () => void;
  /** 제출 중: 스피너 + 비활성 */
  loading?: boolean;
}

export default function ReportButton({ skuName, onClick, loading = false }: ReportButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      aria-busy={loading || undefined}
      aria-label={`${skuName} 제보`}
      // #4A4953 은 토큰이 아닌 controls.md 지정 값. 눌림 면은 ink (checkin.md 정리, 2026-10-16). 제출 중에도 면 색은 유지
      className="flex h-11 w-full items-center justify-center gap-1.5 rounded-full bg-[#4A4953] text-[14px] font-bold leading-none text-on-ink active:bg-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-deep"
    >
      {loading ? (
        <CircleNotch size={18} weight="bold" className="animate-spin motion-reduce:animate-none" aria-hidden />
      ) : (
        <>
          <Megaphone size={18} weight="regular" aria-hidden />
          제보
        </>
      )}
    </button>
  );
}
