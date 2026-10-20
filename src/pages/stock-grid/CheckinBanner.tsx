/**
 * 현장 인증 배너 (components/checkin.md 'checkin-banner', '-unverified', '-verified', controls.md 'button-verify')
 * 같은 자리·같은 높이(최소 80px)에서 두 모습을 바꿔 보여 준다. 상태가 바뀌어도 그리드가 튀지 않게.
 * - 인증 전: Warning(빨강) + "잠깐! 현장 인증 하셨나요?" / "지금은 재고 조회만 가능해요" + [인증하기]
 * - 인증 완료: SealCheck(brand-deep) + "현장 인증 완료" / "남은 시간 1:42" (오른쪽 버튼 없음)
 * 인증 성공 뒤 모달이 닫히면 [인증하기]가 사라졌으므로 이 배너가 포커스를 받는다(ref, tabIndex -1).
 * 사용처: StockGridPage
 */
import { forwardRef } from 'react';
import { SealCheck, Warning } from '@phosphor-icons/react';

interface CheckinBannerProps {
  /** 남은 시간 'H:MM'. null 이면 인증 전 모습 */
  remainingLabel: string | null;
  /** [인증하기] 탭 */
  onVerify: () => void;
}

const CheckinBanner = forwardRef<HTMLElement, CheckinBannerProps>(function CheckinBanner({ remainingLabel, onVerify }, ref) {
  const verified = remainingLabel !== null;

  return (
    <section
      ref={ref}
      tabIndex={-1}
      aria-label="현장 인증"
      className="flex min-h-20 items-center gap-3.5 rounded-lg bg-banner p-4 outline-none"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-canvas">
        {verified ? (
          <SealCheck size={26} weight="fill" className="text-brand-deep" aria-hidden />
        ) : (
          <Warning size={26} weight="fill" className="text-soldout-deep" aria-hidden />
        )}
      </div>

      <div className="min-w-0 flex-1">
        {/* banner-title: Tailwind 에 따로 없어서 같은 값인 sku-name(17px/700) 을 쓴다 */}
        <p className="text-sku-name font-bold text-ink">{verified ? '현장 인증 완료' : '잠깐! 현장 인증 하셨나요?'}</p>
        {verified ? (
          <p className="mt-0.5 text-body-sm text-muted">
            남은 시간{' '}
            {/* 시간은 number-md(16px/700) ink, 자릿수 흔들림 방지 */}
            <span className="text-number-md font-bold tabular-nums text-ink">{remainingLabel}</span>
          </p>
        ) : (
          <p className="mt-0.5 text-body-sm text-muted">지금은 재고 조회만 가능해요</p>
        )}
      </div>

      {!verified && (
        // button-verify. button-sm 은 Tailwind 에 없어서 text-[14px] leading-none font-bold 로 쓴다
        <button
          type="button"
          onClick={onVerify}
          className="h-11 shrink-0 rounded-full bg-ink px-[18px] text-[14px] font-bold leading-none text-on-ink active:bg-[#1B1A22] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-deep"
        >
          인증하기
        </button>
      )}
    </section>
  );
});

export default CheckinBanner;
