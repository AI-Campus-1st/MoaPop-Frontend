/**
 * 모달 공통 틀 (components/feedback.md 'modal')
 * 어두운 배경 + 가운데 흰 면(화면 폭 − 48px, 최대 360px, 곡률 xl, 여백 24px). 안의 내용은 children 으로 받는다.
 * - 열리면 모달 안 첫 버튼에 포커스, Tab 은 모달 안에서만 돈다. 닫히면 연 버튼으로 포커스를 돌려준다
 * - dismissible 이면 바깥 탭·Esc 로 onDismiss 를 부른다
 * - 열려 있는 동안 뒤 화면은 스크롤되지 않는다
 * 보이기/숨기기는 부모가 정한다(열 때만 그린다).
 * 동작(스크롤 잠금·Esc·포커스)은 src/lib/useDialogBehavior.ts 에 있다. 이 파일은 겉모습(가운데 흰 면, 바깥 탭)만 맡는다.
 * 사용처: ConfirmModal (찜 해제 확인), pages/stock-grid/CheckinModal (현장 인증)
 */
import { useRef } from 'react';
import type { MouseEvent, ReactNode, RefObject } from 'react';
import { createPortal } from 'react-dom';
import { useDialogBehavior } from '../lib/useDialogBehavior';

interface ModalProps {
  children: ReactNode;
  /** 제목 요소의 id (스크린리더가 모달 이름으로 읽음) */
  labelledBy: string;
  /** 보조 문구 요소의 id */
  describedBy?: string;
  /** false 면 바깥 탭·Esc 로 닫히지 않는다 (요청 중 등) */
  dismissible: boolean;
  /** 바깥 탭·Esc 로 닫을 때 */
  onDismiss: () => void;
  /** 이 값이 바뀌면 모달 안 첫 버튼으로 포커스를 다시 옮긴다 (단계가 바뀌는 모달용) */
  focusKey?: string;
  /** 닫힐 때 연 버튼이 화면에서 사라졌으면 대신 포커스를 줄 요소 */
  returnFocusFallback?: RefObject<HTMLElement>;
}

export default function Modal({
  children,
  labelledBy,
  describedBy,
  dismissible,
  onDismiss,
  focusKey,
  returnFocusFallback,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // 스크롤 잠금·Esc·포커스(처음 버튼, 가두기, 닫힐 때 복귀)는 BottomSheet 와 같은 공통 훅이 맡는다
  const { handleKeyDown } = useDialogBehavior({
    dialogRef,
    dismissible,
    onDismiss,
    focusKey,
    getReturnFocusFallback: () => returnFocusFallback?.current ?? null,
  });

  // 어두운 배경(바깥)을 직접 눌렀을 때만 닫는다. 모달 안을 누른 것은 무시
  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget && dismissible) onDismiss();
  };

  // 탭바(z-30)·토스트(z-40)보다 위에 오도록 body 바로 아래에 그린다
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(43,42,51,0.4)] px-6"
      onClick={handleBackdropClick}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        // 누를 버튼이 없을 때 포커스를 받기 위한 값. Tab 순서에는 들어가지 않는다
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="flex w-full max-w-[360px] flex-col items-center rounded-xl bg-card p-6 text-center shadow-float outline-none"
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
