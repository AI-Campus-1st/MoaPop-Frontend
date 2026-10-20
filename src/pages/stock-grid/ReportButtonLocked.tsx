/**
 * 잠긴 제보 버튼 (components/controls.md 'button-report-disabled')
 * 현장 인증 전 SKU 카드 하단에 둔다. disabled-bg 면 + Lock + "제보".
 * 보기에는 비활성이지만 탭은 받는다: 누르면 화면이 "현장 인증 후 제보할 수 있어요" 토스트를 띄운다.
 * [다음 단계] 인증 후의 [제보](button-report)·"제보 완료!"(report-done)는 별도 컴포넌트로 만들어 SkuCard footer 에 넣는다.
 * 사용처: StockGridPage (SkuCard footer)
 */
import { Lock } from '@phosphor-icons/react';

interface ReportButtonLockedProps {
  /** 스크린리더에서 어느 굿즈의 버튼인지 알리기 위한 이름 */
  skuName: string;
  onClick: () => void;
}

export default function ReportButtonLocked({ skuName, onClick }: ReportButtonLockedProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      // disabled 속성을 쓰면 탭이 막히므로 aria-disabled 로 '잠김'만 알린다
      aria-disabled="true"
      aria-label={`${skuName} 제보, 현장 인증 후 가능`}
      className="flex h-11 w-full items-center justify-center gap-1.5 rounded-full bg-disabled-bg text-[14px] font-bold leading-none text-disabled-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-deep"
    >
      <Lock size={18} weight="regular" aria-hidden />
      제보
    </button>
  );
}
