/**
 * 재고 확인 상단바 (components/navigation.md 'top-bar', 'popup-selector')
 * 팝업 선택자 하나만 둔다: MapPin + 팝업명(700, 1줄 말줄임) + CaretDown. 면·테두리 없음, 뒤로가기 없음.
 * 누르면 찜 목록(stock-favorites)으로 가서 다른 팝업을 고른다(navigation.md 2026-10-15 (2)).
 * 사용처: StockGridPage
 */
import { CaretDown, MapPin } from '@phosphor-icons/react';

interface StockTopBarProps {
  popupName: string;
  /** 선택자 탭: 찜 목록으로 이동 */
  onSelect: () => void;
}

export default function StockTopBar({ popupName, onSelect }: StockTopBarProps) {
  return (
    <header className="flex h-14 items-center">
      <button
        type="button"
        onClick={onSelect}
        aria-label={`${popupName}, 다른 팝업 고르기`}
        className="flex h-11 min-w-0 max-w-full items-center gap-1.5 rounded-md text-body-md text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-deep"
      >
        <MapPin size={20} weight="regular" className="shrink-0" aria-hidden />
        <span className="truncate font-bold">{popupName}</span>
        <CaretDown size={16} weight="regular" className="shrink-0" aria-hidden />
      </button>
    </header>
  );
}
