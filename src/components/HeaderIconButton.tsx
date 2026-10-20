/**
 * 화면 좌상단 아이콘 버튼 (닫기 X, 뒤로가기 CaretLeft)
 * 상단바(top-bar)가 없는 화면에서 아이콘 하나만 둘 때 쓴다. 터치 영역 44px, 아이콘 24px ink.
 * 출처: pages/login.md (좌상단 닫기 · 뒤로가기). top-bar 는 stock-grid 전용이라 쓰지 않는다(navigation.md).
 * 사용처: LoginPage(X), SignupPage(CaretLeft)
 */
import type { Icon } from '@phosphor-icons/react';

interface HeaderIconButtonProps {
  icon: Icon;
  /** 스크린리더용 이름 (예: '닫기') */
  label: string;
  onClick: () => void;
}

export default function HeaderIconButton({ icon: IconComponent, label, onClick }: HeaderIconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      // -ml-2: 아이콘 모양이 본문 왼쪽 여백(16px) 선에 맞도록 터치 영역만 바깥으로 뺀다
      className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-deep"
    >
      <IconComponent size={24} weight="regular" aria-hidden />
    </button>
  );
}
