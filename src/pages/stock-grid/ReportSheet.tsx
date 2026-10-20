/**
 * 제보 바텀시트 (pages/report-sheet.md, components/checkin.md 'report-sheet')
 * 손잡이 → 제목 "지금 '{굿즈명}' 상태는?"(sku-name, 2줄 말줄임) → 보조 → 선택지 2개(세로, 간격 12px).
 * 선택지는 지금 상태로 정한다(lib/skuStatus reportChoicesFor). sku 는 그리드의 최신 값을 받으므로,
 * 열린 사이 다른 사람 제보로 상태가 바뀌면 선택지도 바로 다시 계산된다.
 * 탭하면 확인 없이 바로 제출. 제출 중에는 두 선택지 비활성 + 딤·쓸기·Esc 로 닫히지 않는다.
 * 틀은 공통 BottomSheet. 제출 흐름은 useReportFlow.
 * 사용처: StockGridPage
 */
import type { ReportChoice, StockSku } from '../../api/types';
import BottomSheet from '../../components/BottomSheet';
import { reportChoicesFor } from '../../lib/skuStatus';
import ReportOption from './ReportOption';
import { reportDoneId } from './ReportDone';

const TITLE_ID = 'report-sheet-title';
const DESCRIPTION_ID = 'report-sheet-description';

interface ReportSheetProps {
  sku: StockSku;
  open: boolean;
  /** 제출 중인 선택지. 없으면 null */
  submitting: ReportChoice | null;
  onSelect: (choice: ReportChoice) => void;
  onRequestClose: () => void;
  onClosed: () => void;
  /** 시트 높이(px). 시트 위 토스트 위치에 쓴다 */
  onHeightChange: (height: number) => void;
}

export default function ReportSheet({ sku, open, submitting, onSelect, onRequestClose, onClosed, onHeightChange }: ReportSheetProps) {
  const busy = submitting !== null;

  return (
    <BottomSheet
      open={open}
      onRequestClose={onRequestClose}
      onClosed={onClosed}
      dismissible={!busy}
      labelledBy={TITLE_ID}
      describedBy={DESCRIPTION_ID}
      // 제출 중에는 누를 버튼이 없어 시트 자체로, 실패해 다시 열리면 첫 선택지로 포커스를 옮긴다
      focusKey={busy ? 'submitting' : 'idle'}
      // 제보에 성공하면 [제보]가 "제보 완료!"로 바뀌어 사라지므로 그쪽으로 포커스를 돌려준다
      getReturnFocusFallback={() => document.getElementById(reportDoneId(sku.id))}
      onHeightChange={onHeightChange}
    >
      <h2 id={TITLE_ID} className="line-clamp-2 text-sku-name font-bold text-ink">
        지금 '{sku.name}' 상태는?
      </h2>
      <p id={DESCRIPTION_ID} className="mt-1 text-body-sm text-muted">
        현장에서 본 그대로 골라 주세요
      </p>

      <div className="mt-5 flex flex-col gap-3">
        {reportChoicesFor(sku.status).map((choice) => (
          <ReportOption
            key={choice}
            choice={choice}
            // 재입고는 지금 상태(품절)와 다른 선택이라 '현재 상태'가 될 수 없다
            current={choice === sku.status}
            loading={submitting === choice}
            disabled={busy}
            onSelect={onSelect}
          />
        ))}
      </div>
    </BottomSheet>
  );
}
