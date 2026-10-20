/**
 * 글자만 있는 보조 버튼 (components/controls.md 'button-text')
 * 면·테두리 없이 ink 글자(button-sm 14px/700), 높이 44px. 누르는 동안 surface 면.
 * 사용처: StockFavoritesPage [편집]/[완료], ConfirmModal [취소]. 이후 인증 모달 [취소]에서도 쓴다.
 */
import type { ReactNode } from 'react';

interface ButtonTextProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  /** 부모 폭을 꽉 채울지 (모달 안에서는 true) */
  fullWidth?: boolean;
  /** 보이는 글자와 다르게 읽혀야 할 때 (예: '완료' → '편집 완료') */
  ariaLabel?: string;
}

export default function ButtonText({ children, onClick, disabled = false, fullWidth = false, ariaLabel }: ButtonTextProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      // text-[14px] leading-none font-bold = BASE typography 'button-sm'
      className={`flex h-11 items-center justify-center rounded-full px-3 text-[14px] font-bold leading-none text-ink active:bg-surface disabled:text-disabled-text disabled:active:bg-transparent focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-deep ${
        fullWidth ? 'w-full' : ''
      }`}
    >
      {children}
    </button>
  );
}
