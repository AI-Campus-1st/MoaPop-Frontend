/**
 * 기본 버튼 (components/controls.md 'button-primary')
 * ink 알약 버튼, 높이 52px. 눌림·비활성·제출 중 상태가 있다.
 * 제출 중(loading)에는 스피너를 보여 주고 비활성으로 만들어 중복 탭을 막는다.
 * 사용처: LoginPage, SignupPage, MY 제보 내역 [다시 시도]
 *         이후 popup-detail [찜하고 재고 확인하기], 모달 확인, 빈 상태 액션에서도 쓴다.
 */
import type { ReactNode } from 'react';
import { CircleNotch } from '@phosphor-icons/react';

interface ButtonPrimaryProps {
  children: ReactNode;
  type?: 'button' | 'submit';
  onClick?: () => void;
  disabled?: boolean;
  /** 제출 중: 라벨 대신 스피너, 비활성 */
  loading?: boolean;
  /** 부모 폭을 꽉 채울지 (기본 true) */
  fullWidth?: boolean;
}

export default function ButtonPrimary({
  children,
  type = 'button',
  onClick,
  disabled = false,
  loading = false,
  fullWidth = true,
}: ButtonPrimaryProps) {
  // 제출 중에는 면을 ink 로 유지한다 (입력이 잘못돼 막힌 '비활성'과 구분)
  const colorClass = loading
    ? 'bg-ink text-on-ink'
    : 'bg-ink text-on-ink active:bg-[#1B1A22] disabled:bg-disabled-bg disabled:text-disabled-text';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`flex h-[52px] items-center justify-center rounded-full px-6 text-button font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-deep ${colorClass} ${
        fullWidth ? 'w-full' : ''
      }`}
    >
      {loading ? (
        <>
          <CircleNotch size={20} weight="bold" className="animate-spin motion-reduce:animate-none" aria-hidden />
          {/* 스피너만 보이므로 스크린리더에는 원래 라벨을 읽어 준다 */}
          <span className="sr-only">{children}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
