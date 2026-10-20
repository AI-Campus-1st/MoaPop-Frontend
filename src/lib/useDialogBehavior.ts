/**
 * 대화상자 공통 동작 (components/feedback.md '모달' 포커스 규칙)
 * - 열리면 뒤 화면 스크롤 잠금 + Esc 로 닫기(dismissible 일 때)
 * - 처음 열릴 때와 focusKey 가 바뀔 때 첫 버튼에 포커스, 누를 버튼이 없으면 대화상자 자체에
 * - Tab 은 대화상자 안에서만 돈다 (handleKeyDown 을 대화상자 요소의 onKeyDown 에 연결)
 * - 닫히면(언마운트) 연 버튼으로 포커스를 돌려주고, 그 버튼이 사라졌으면 getReturnFocusFallback 이 준 요소로
 * 사용처: src/components/Modal.tsx (가운데 모달), src/components/BottomSheet.tsx (바텀시트)
 */
import { useCallback, useEffect, useRef } from 'react';
import type { KeyboardEvent, RefObject } from 'react';

/** 대화상자 안에서 Tab 으로 갈 수 있는 요소 */
const FOCUSABLE_SELECTOR = 'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface DialogBehaviorOptions {
  /** role="dialog" 요소. 누를 버튼이 없을 때 포커스를 받으므로 tabIndex={-1} 이어야 한다 */
  dialogRef: RefObject<HTMLElement>;
  /** false 면 Esc 로 닫히지 않는다 (요청 중 등) */
  dismissible: boolean;
  /** Esc 로 닫을 때 */
  onDismiss: () => void;
  /** 이 값이 바뀌면 첫 버튼으로 포커스를 다시 옮긴다 (단계가 바뀌는 대화상자용) */
  focusKey?: string;
  /** 닫힐 때 연 버튼이 화면에서 사라졌으면 대신 포커스를 줄 요소 */
  getReturnFocusFallback?: () => HTMLElement | null;
}

export function useDialogBehavior({
  dialogRef,
  dismissible,
  onDismiss,
  focusKey,
  getReturnFocusFallback,
}: DialogBehaviorOptions): { handleKeyDown: (event: KeyboardEvent<HTMLElement>) => void } {
  // Esc 처리·닫힐 때 처리에서 최신 값을 쓰기 위한 ref (값이 바뀔 때마다 이벤트를 다시 걸지 않으려고)
  const latest = useRef({ dismissible, onDismiss, getReturnFocusFallback });
  latest.current = { dismissible, onDismiss, getReturnFocusFallback };

  // 열릴 때: 뒤 화면 스크롤 잠금 + Esc. 닫힐 때: 원래대로 되돌리고 포커스를 돌려준다
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape' && latest.current.dismissible) latest.current.onDismiss();
    };
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = previousOverflow;
      // 연 버튼이 화면에서 사라졌으면(예: 해제된 항목의 휴지통, 인증 후 사라진 [인증하기], 제보 후 바뀐 [제보]) 대신 받을 곳으로
      if (opener?.isConnected) opener.focus();
      else latest.current.getReturnFocusFallback?.()?.focus();
    };
  }, []);

  // 처음 열릴 때와 focusKey 가 바뀔 때: 첫 버튼에 포커스. 누를 버튼이 없으면 대화상자 자체에 둬서 포커스가 밖으로 새지 않게 한다
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const firstButton = dialog.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    (firstButton ?? dialog).focus();
  }, [dialogRef, focusKey]);

  // 포커스 가두기: 마지막 요소에서 Tab → 첫 요소, 첫 요소에서 Shift+Tab → 마지막 요소
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      if (event.key !== 'Tab' || !dialogRef.current) return;

      const items = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (items.length === 0) {
        // 요청 중이라 누를 수 있는 버튼이 없으면 포커스를 밖으로 내보내지 않는다
        event.preventDefault();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [dialogRef],
  );

  return { handleKeyDown };
}
