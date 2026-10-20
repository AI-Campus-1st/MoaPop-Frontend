/**
 * 빈 상태 (components/feedback.md 'empty-state')
 * 가운데 정렬: 아이콘 40px(disabled-text) → 제목 → 보조 문구 → (필요 시) 버튼 하나.
 * 사용처: PopupSearchPage (검색 결과 없음). 찜 목록 등 다른 화면에서도 재사용 예정.
 */
import type { Icon } from '@phosphor-icons/react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: Icon;
  title: string;
  description?: string;
  /** button-primary 하나를 넘긴다 */
  action?: ReactNode;
}

export default function EmptyState({ icon: IconComponent, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <IconComponent size={40} weight="regular" className="text-disabled-text" aria-hidden />
      <p className="mt-3 text-body-md font-bold text-ink">{title}</p>
      {description && <p className="mt-1 text-body-sm text-muted">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
