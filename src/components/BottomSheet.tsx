/**
 * 바텀시트 공통 틀 (components/checkin.md 'report-sheet' 틀, pages/report-sheet.md)
 * 어두운 배경 + 화면 아래에서 올라오는 흰 면(위 곡률 xl, 손잡이 바). 안의 내용은 children 으로 받는다.
 * - 닫기 요청: 딤 탭, 아래로 쓸기(시트 어디서든), 손잡이 끌어내리기, Esc. dismissible 이 false 면 모두 막힌다
 * - 열기·닫기는 부모의 open 으로 정한다. open 이 false 가 되면 내려가는 움직임 뒤에 onClosed 를 부른다(그때 부모가 지운다)
 * - 포커스·스크롤 잠금·Esc 는 Modal 과 같은 공통 훅(src/lib/useDialogBehavior.ts)
 * - 시트 높이가 바뀌면 onHeightChange 로 알린다 (시트 위에 토스트를 띄울 때 씀)
 * 탭바(z-30)·토스트(z-40)보다 위(z-50). 시트 위 토스트는 Toast 의 placement="above-sheet"(z-60).
 * 사용처: src/pages/stock-grid/ReportSheet.tsx (제보 바텀시트)
 */
import { useEffect, useRef, useState } from 'react';
import type { MouseEvent, PointerEvent, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useDialogBehavior } from '../lib/useDialogBehavior';

/** 올라오기·내려가기 시간 (ms) */
const SLIDE_MS = 200;
/** 이만큼 넘게 움직이면 탭이 아니라 끌기로 본다 (px) */
const DRAG_START_PX = 8;
/** 이만큼 넘게 끌어내리면 닫는다 (px) */
const CLOSE_DISTANCE_PX = 80;
/** 이보다 빠르게 튕겨 내리면 거리가 짧아도 닫는다 (px/ms) */
const CLOSE_VELOCITY = 0.5;

interface BottomSheetProps {
  children: ReactNode;
  /** false 가 되면 내려간 뒤 onClosed */
  open: boolean;
  /** 딤 탭·쓸기·Esc 로 닫기를 요청할 때. 부모가 open 을 false 로 바꾼다 */
  onRequestClose: () => void;
  /** 내려가는 움직임이 끝났을 때. 부모는 이때 시트를 그만 그린다 */
  onClosed: () => void;
  /** false 면 딤 탭·쓸기·Esc 가 막힌다 (제출 중) */
  dismissible: boolean;
  /** 제목 요소의 id */
  labelledBy: string;
  /** 보조 문구 요소의 id */
  describedBy?: string;
  /** 이 값이 바뀌면 시트 안 첫 버튼으로 포커스를 다시 옮긴다 */
  focusKey?: string;
  /** 닫힐 때 연 버튼이 사라졌으면 대신 포커스를 줄 요소 */
  getReturnFocusFallback?: () => HTMLElement | null;
  /** 시트 높이(px)가 바뀔 때 */
  onHeightChange?: (height: number) => void;
}

/** 움직임 줄이기 설정이면 올라오기·내려가기를 생략한다 */
function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export default function BottomSheet({
  children,
  open,
  onRequestClose,
  onClosed,
  dismissible,
  labelledBy,
  describedBy,
  focusKey,
  getReturnFocusFallback,
  onHeightChange,
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  /** 화면에 올라와 있는지 (처음엔 아래에 있다가 다음 프레임에 올라온다) */
  const [shown, setShown] = useState(false);
  /** 끌어내린 거리 (px) */
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  /** 끌기 중 상태: 시작 위치, 마지막 위치·시각(튕김 속도 계산), 탭으로 볼지 */
  const drag = useRef<{ pointerId: number; startY: number; lastY: number; lastTime: number; velocity: number; moved: boolean } | null>(null);
  /** 방금 끌기를 했으면 그 손을 뗀 탭(click)을 무시한다 */
  const suppressClick = useRef(false);

  const latest = useRef({ onClosed, onHeightChange });
  latest.current = { onClosed, onHeightChange };

  const { handleKeyDown } = useDialogBehavior({
    dialogRef: sheetRef,
    dismissible,
    onDismiss: onRequestClose,
    focusKey,
    getReturnFocusFallback,
  });

  // open 에 맞춰 올리고 내린다. 내려간 뒤 onClosed
  useEffect(() => {
    if (open) {
      // 다음 프레임에 올려야 아래 → 위로 움직이는 게 보인다
      const frame = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(frame);
    }
    setShown(false);
    setDragY(0);
    const timer = window.setTimeout(() => latest.current.onClosed(), prefersReducedMotion() ? 0 : SLIDE_MS);
    return () => window.clearTimeout(timer);
  }, [open]);

  // 시트 높이를 알린다 (내용 줄 수가 바뀌어도 따라감)
  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    const observer = new ResizeObserver(() => latest.current.onHeightChange?.(sheet.offsetHeight));
    observer.observe(sheet);
    return () => observer.disconnect();
  }, []);

  /* ---------------- 끌어내리기 ---------------- */

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!dismissible || !open || !event.isPrimary) return;
    drag.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      lastY: event.clientY,
      lastTime: event.timeStamp,
      velocity: 0,
      moved: false,
    };
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state || event.pointerId !== state.pointerId) return;
    const distance = event.clientY - state.startY;

    if (!state.moved) {
      if (Math.abs(distance) < DRAG_START_PX) return;
      // 여기서부터는 탭이 아니라 끌기: 손가락이 시트 밖으로 나가도 계속 받는다
      state.moved = true;
      setDragging(true);
      sheetRef.current?.setPointerCapture(event.pointerId);
    }

    const elapsed = event.timeStamp - state.lastTime;
    if (elapsed > 0) state.velocity = (event.clientY - state.lastY) / elapsed;
    state.lastY = event.clientY;
    state.lastTime = event.timeStamp;
    // 위로는 올라가지 않는다
    setDragY(Math.max(0, distance));
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state || event.pointerId !== state.pointerId) return;
    drag.current = null;
    if (!state.moved) return;

    suppressClick.current = true;
    // 손을 뗀 자리에 버튼이 없으면 click 이 오지 않으므로, 다음 탭까지 막지 않게 곧바로 푼다
    window.setTimeout(() => {
      suppressClick.current = false;
    }, 0);
    setDragging(false);
    const distance = Math.max(0, event.clientY - state.startY);
    // 충분히 끌었거나 빠르게 튕겨 내렸으면 닫고, 아니면 제자리로
    if (dismissible && (distance > CLOSE_DISTANCE_PX || state.velocity > CLOSE_VELOCITY)) onRequestClose();
    else setDragY(0);
  };

  // 끌기를 마친 손가락이 선택지 위에서 떨어져도 그 버튼이 눌리지 않게 한다
  const handleClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (!suppressClick.current) return;
    suppressClick.current = false;
    event.preventDefault();
    event.stopPropagation();
  };

  // 어두운 배경(바깥)을 직접 눌렀을 때만 닫는다
  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget && dismissible) onRequestClose();
  };

  const transform = shown ? `translateY(${dragY}px)` : 'translateY(100%)';

  return createPortal(
    <div className="fixed inset-0 z-50" onClick={handleBackdropClick}>
      {/* 딤: 시트와 함께 나타나고 사라진다. 클릭은 바깥 div 가 받는다 */}
      <div
        className={`pointer-events-none absolute inset-0 bg-[rgba(43,42,51,0.4)] transition-opacity duration-200 motion-reduce:transition-none ${
          shown ? 'opacity-100' : 'opacity-0'
        }`}
        aria-hidden
      />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        // 누를 버튼이 없을 때(제출 중) 포커스를 받기 위한 값. Tab 순서에는 들어가지 않는다
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={handleClickCapture}
        style={{ transform }}
        // touch-none: 브라우저 스크롤 대신 끌어내리기로 받는다 (시트 내용은 스크롤할 만큼 길지 않다)
        className={`absolute inset-x-0 bottom-0 mx-auto max-w-[480px] touch-none rounded-t-xl bg-card px-4 pb-[calc(24px+env(safe-area-inset-bottom))] pt-3 shadow-float outline-none ${
          dragging ? '' : 'transition-transform duration-200 ease-out motion-reduce:transition-none'
        }`}
      >
        {/* 손잡이 바 (40×4px, hairline) */}
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-hairline" aria-hidden />
        {children}
      </div>
    </div>,
    document.body,
  );
}
