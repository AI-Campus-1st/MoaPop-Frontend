/**
 * 실시간 제보 TOP3 섹션 제목 (components/popup-list.md 'top3-header')
 * 불꽃 아이콘(brand) + 꾹꾹체 제목 + 오른쪽 '최근 24시간'.
 * 사용처: PopupSearchPage (검색어가 비었을 때)
 */
import { Fire } from '@phosphor-icons/react';

export default function Top3Header() {
  return (
    <div className="flex items-center gap-1.5">
      <Fire size={20} weight="fill" className="text-brand" aria-hidden />
      <h2 className="font-display text-title-md text-ink">실시간 제보 TOP3</h2>
      <span className="ml-auto text-caption font-medium text-muted">최근 24시간</span>
    </div>
  );
}
