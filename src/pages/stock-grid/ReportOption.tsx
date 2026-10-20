/**
 * 제보 선택지 버튼 (components/checkin.md 'report-option-warn' · 'report-option-soldout' · 'report-option-restock')
 * 상태 색(strong) 면 + deep 테두리 1.5px + ink 라벨, 알약형 높이 56px. 색·아이콘은 lib/skuStatus 의 REPORT_CHOICE_STYLE.
 * current: 지금 상태와 같은 선택지. 눌러서 '확인 제보'를 할 수 있고, 라벨 옆에 "현재 상태" 캡션을 붙인다 (2026-10-16 사용자 결정).
 * loading: 이 선택지를 제출 중이면 아이콘 자리에 스피너. disabled: 다른 선택지를 제출 중일 때.
 * 사용처: ReportSheet
 */
import { CircleNotch } from '@phosphor-icons/react';
import type { ReportChoice } from '../../api/types';
import { REPORT_CHOICE_STYLE } from '../../lib/skuStatus';

interface ReportOptionProps {
  choice: ReportChoice;
  current: boolean;
  loading: boolean;
  disabled: boolean;
  onSelect: (choice: ReportChoice) => void;
}

export default function ReportOption({ choice, current, loading, disabled, onSelect }: ReportOptionProps) {
  const { label, icon: ChoiceIcon, fillClass, iconClass, borderClass } = REPORT_CHOICE_STYLE[choice];

  return (
    <button
      type="button"
      onClick={() => onSelect(choice)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      // 제출 중인 선택지는 원래 색 그대로(스피너가 보이게), 나머지만 흐리게
      className={`flex h-14 w-full items-center justify-center gap-2 rounded-full border-[1.5px] text-button font-bold text-ink active:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-deep ${fillClass} ${borderClass} ${
        disabled && !loading ? 'opacity-50' : ''
      }`}
    >
      {loading ? (
        <CircleNotch size={20} weight="bold" className="animate-spin text-ink motion-reduce:animate-none" aria-hidden />
      ) : (
        <ChoiceIcon size={20} weight="fill" className={iconClass} aria-hidden />
      )}
      {label}
      {/* 파스텔 위 글자는 ink (BASE). 작은 흰 바탕을 깔아 13px 캡션도 또렷하게 */}
      {current && <span className="rounded-full bg-card/80 px-2 py-0.5 text-caption font-medium">현재 상태</span>}
    </button>
  );
}
