/**
 * 하단 고정 바 (pages/popup-detail.md '이 화면 전용 요소')
 * canvas 면 + 위쪽 hairline + shadow-float, 높이 76px + safe-area. 안에 버튼 하나를 꽉 찬 폭으로 둔다.
 * 탭바가 없는 화면에서 탭바 자리를 대신한다. 이 바 위에 뜨는 토스트는 Toast placement="above-bottom-bar".
 * 사용처: PopupDetailPage
 */
import type { ReactNode } from 'react';

export default function BottomActionBar({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-canvas pb-[env(safe-area-inset-bottom)] shadow-float">
      <div className="mx-auto flex h-[76px] max-w-[480px] items-center px-4">{children}</div>
    </div>
  );
}
