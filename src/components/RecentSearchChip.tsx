/**
 * 최근 검색어 칩 (components/controls.md 'recent-search-chip')
 * 글자를 누르면 그 검색어로 검색, X 를 누르면 그 기록만 삭제.
 * 칩 높이는 30px 이지만, 두 버튼 모두 위아래 터치 영역을 넓혀 44px 을 확보한다(BASE 'Do').
 * 사용처: PopupSearchPage (검색어가 비었을 때 검색창 아래)
 */
import { X } from '@phosphor-icons/react';

interface RecentSearchChipProps {
  keyword: string;
  onSelect: (keyword: string) => void;
  onRemove: (keyword: string) => void;
}

/** 눈에 보이는 크기는 그대로 두고 터치 영역만 위아래 7px 씩 늘리는 클래스 (30 + 14 = 44px) */
const HIT_AREA = "relative after:absolute after:inset-x-0 after:-inset-y-[7px] after:content-['']";

export default function RecentSearchChip({ keyword, onSelect, onRemove }: RecentSearchChipProps) {
  return (
    <div className="flex h-[30px] items-center rounded-full border border-hairline bg-card text-caption font-medium text-muted">
      <button type="button" onClick={() => onSelect(keyword)} className={`${HIT_AREA} max-w-[9rem] truncate pl-3 pr-1`}>
        {keyword}
      </button>
      <button
        type="button"
        onClick={() => onRemove(keyword)}
        aria-label={`최근 검색어 ${keyword} 삭제`}
        className={`${HIT_AREA} flex h-full items-center pl-1 pr-3`}
      >
        <X size={12} weight="bold" aria-hidden />
      </button>
    </div>
  );
}
