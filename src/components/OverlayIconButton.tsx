/**
 * 사진 위에 올리는 원형 아이콘 버튼 (pages/popup-detail.md 구조 1)
 * 반투명 흰 원(36px) 안에 아이콘을 둔다. 원은 36px 이지만 누를 수 있는 영역은 44px(BASE 터치 기준).
 * 사용처: PopupDetailPage (좌상단 뒤로가기, 우상단 찜 하트)
 */
import type { Icon, IconWeight } from '@phosphor-icons/react';

interface OverlayIconButtonProps {
  icon: Icon;
  /** 스크린리더용 이름 (예: '뒤로 가기', '찜하기') */
  label: string;
  onClick: () => void;
  /** 아이콘 굵기 (찜한 하트는 fill) */
  weight?: IconWeight;
  /** 아이콘 색 클래스 (기본 ink) */
  iconClassName?: string;
  /** 켜고 끄는 버튼(하트)이면 현재 켜짐 여부를 스크린리더에 알린다 */
  pressed?: boolean;
}

export default function OverlayIconButton({
  icon: IconComponent,
  label,
  onClick,
  weight = 'regular',
  iconClassName = 'text-ink',
  pressed,
}: OverlayIconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={pressed}
      className="group flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline-none"
    >
      {/* 포커스 링은 보이는 원에 그린다 */}
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-card/80 shadow-chip group-focus-visible:outline group-focus-visible:outline-2 group-focus-visible:outline-brand-deep">
        <IconComponent size={22} weight={weight} className={iconClassName} aria-hidden />
      </span>
    </button>
  );
}
