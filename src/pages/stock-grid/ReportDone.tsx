/**
 * 제보 완료 표시 (components/controls.md 'report-done')
 * 내가 이미 제보한 SKU 카드 하단에 둔다. surface 면 + CheckCircle(regular, muted) + "제보 완료!".
 * 한 계정은 같은 SKU 에 영구 1회만 제보하므로, 현장 인증이 끝나도 잠긴 버튼 대신 이 표시를 유지한다.
 * 버튼이 아니지만 제보 직후 시트가 닫히면 포커스를 받는다(사라진 [제보] 대신). 그래서 id 와 tabIndex -1 을 둔다.
 * 사용처: StockGridPage (SkuCard footer), ReportSheet (닫힐 때 포커스 받을 곳: reportDoneId)
 */
import { CheckCircle } from '@phosphor-icons/react';

/** 시트가 닫힐 때 포커스를 돌려줄 요소의 id */
export function reportDoneId(skuId: string): string {
  return `report-done-${skuId}`;
}

interface ReportDoneProps {
  skuId: string;
  /** 스크린리더에서 어느 굿즈의 표시인지 알리기 위한 이름 */
  skuName: string;
}

export default function ReportDone({ skuId, skuName }: ReportDoneProps) {
  return (
    <div
      id={reportDoneId(skuId)}
      tabIndex={-1}
      aria-label={`${skuName} 제보 완료`}
      className="flex h-11 w-full items-center justify-center gap-1.5 rounded-full bg-surface text-[14px] font-bold leading-none text-muted outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-deep"
    >
      <CheckCircle size={18} weight="regular" aria-hidden />
      제보 완료!
    </div>
  );
}
