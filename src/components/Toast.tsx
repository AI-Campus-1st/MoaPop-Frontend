/**
 * 토스트 (components/feedback.md 'toast', 'toast-error')
 * 3초 뒤 onClose 를 호출한다. 보이기/숨기기는 부모가 state 로 관리한다.
 * 위치(placement)
 * - above-tabbar (기본): 탭바 위 중앙
 * - bottom: 탭바도 하단 고정 바도 없는 화면용. 화면 하단 16px 위 중앙 (login 작업 시 결정, 2026-10-15)
 * - above-bottom-bar: 하단 고정 바(BottomActionBar) 위 중앙 (popup-detail)
 * - above-sheet: 바텀시트 윗변 12px 위 중앙, 시트보다 위(z-60). sheetHeight 로 시트 높이를 받는다 (stock-grid 제보 실패)
 * highlight: 문구 안에서 brand 색으로 강조할 조각 (제보 성공 "+10P", feedback.md 'toast' accent)
 * 사용처: PopupSearchPage (검색 실패 안내), LoginPage · SignupPage (bottom), PopupDetailPage (above-bottom-bar),
 *         StockFavoritesPage (찜 해제 실패), StockGridPage (잠긴 제보·종료된 팝업 안내·제보 성공/실패)
 */
import { useEffect } from 'react';
import { WarningCircle } from '@phosphor-icons/react';

interface ToastProps {
  message: string;
  variant?: 'default' | 'error';
  onClose: () => void;
  durationMs?: number;
  placement?: 'above-tabbar' | 'bottom' | 'above-bottom-bar' | 'above-sheet';
  /** message 안에서 brand 색으로 강조할 조각 (처음 나오는 한 곳) */
  highlight?: string;
  /** placement="above-sheet" 일 때 시트 높이(px) */
  sheetHeight?: number;
}

const PLACEMENT_CLASS = {
  // 탭바(하단 12px + 높이 64px) 위로 12px 띄운다
  'above-tabbar': 'bottom-[calc(88px+env(safe-area-inset-bottom))]',
  bottom: 'bottom-[calc(16px+env(safe-area-inset-bottom))]',
  // 하단 고정 바(높이 76px, 화면 맨 아래) 위로 12px 띄운다. 지금은 탭바 위와 값이 같지만 바 높이가 따로 바뀔 수 있어 나눠 둔다
  'above-bottom-bar': 'bottom-[calc(88px+env(safe-area-inset-bottom))]',
  // 시트 높이는 그때그때 달라서 위치는 style 로 준다
  'above-sheet': '',
} as const;

/** 시트 윗변과 토스트 사이 간격 (px) */
const SHEET_GAP_PX = 12;

/** message 를 강조 조각 앞 · 강조 · 뒤로 나눈다. 강조 조각이 없으면 통째로 */
function splitHighlight(message: string, highlight?: string): [string, string, string] {
  const index = highlight ? message.indexOf(highlight) : -1;
  if (!highlight || index === -1) return [message, '', ''];
  return [message.slice(0, index), highlight, message.slice(index + highlight.length)];
}

export default function Toast({
  message,
  variant = 'default',
  onClose,
  durationMs = 3000,
  placement = 'above-tabbar',
  highlight,
  sheetHeight = 0,
}: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, durationMs);
    return () => clearTimeout(timer);
  }, [message, onClose, durationMs]);

  const aboveSheet = placement === 'above-sheet';
  const [before, accent, after] = splitHighlight(message, highlight);

  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      // 시트 위에서는 시트(z-50)보다 위에 둔다
      className={`fixed inset-x-0 flex justify-center px-4 ${aboveSheet ? 'z-[60]' : 'z-40'} ${PLACEMENT_CLASS[placement]}`}
      style={aboveSheet ? { bottom: sheetHeight + SHEET_GAP_PX } : undefined}
    >
      <div className="flex max-w-[456px] items-center gap-2 rounded-md bg-ink px-4 py-3.5 text-body-sm text-on-ink shadow-float">
        {variant === 'error' && <WarningCircle size={18} weight="fill" className="shrink-0 text-on-ink" aria-hidden />}
        <span>
          {before}
          {accent && <span className="font-bold text-brand">{accent}</span>}
          {after}
        </span>
      </div>
    </div>
  );
}
