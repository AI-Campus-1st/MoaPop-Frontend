/**
 * 재고 확인 화면 SKU Grid (pages/stock-grid.md, DEV_RULES 2-1 · 2-2 · 2-7)
 * 위 → 아래: 상단바(팝업 선택자) → 인증 배너 → "실시간 재고 현황 N개 품목" → SKU 카드 2열. 탭바는 App 의 탭 레이아웃이 그린다.
 *
 * 현장 인증 (pages/checkin-modal.md)
 * - [인증하기] → 종료·시작 전 확인(토스트) → GPS 확인 모달 → 완료 / 범위 밖 / 권한 거부
 * - 인증 상태면 배너가 "현장 인증 완료 · 남은 시간 H:MM"으로 바뀌고, SKU 카드 버튼이 [제보]로 열린다
 * - 2시간이 지나면 조용히 인증 전으로 돌아간다. 인증 상태·흐름은 useCheckin.ts
 *
 * 제보 + 포인트 (pages/report-sheet.md, DEV_RULES 2-3)
 * - [제보] → 제보 바텀시트 → 선택지 탭 즉시 제출. 흐름은 useReportFlow.ts
 * - 성공: 카드 상태 띠·인원 수 변경 + 번쩍임 → 토스트 "체류자 제보 완료! +10P (현재 칭호: …)" → 카드 하단 "제보 완료!"
 * - 카드 하단 버튼은 renderFooter 가 고른다: 제보 완료 > 제출 중 > [제보] > 잠김
 *
 * 실시간 갱신: 다른 사람 제보로 바뀐 카드는 제자리에서 번쩍이고, 연결이 끊기면 오프라인 배너 (useStockGrid.ts)
 *
 * 비로그인: 로그인 화면으로 보내지 않고 화면 안에서 안내한다(찜 목록과 같은 방식).
 * 라우트: /stock/:popupId (App.tsx). 데이터는 useStockGrid (→ src/api/stock.ts), useCheckin (→ src/api/checkins.ts),
 *         useReportFlow (→ src/api/reports.ts).
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Lock, Package, Storefront } from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import type { StockSku } from '../../api/types';
import { useRequireAuth } from '../../lib/auth/useRequireAuth';
import { getTitle } from '../../lib/title';
import ButtonPrimary from '../../components/ButtonPrimary';
import EmptyState from '../../components/EmptyState';
import Toast from '../../components/Toast';
import CheckinBanner from './CheckinBanner';
import CheckinModal from './CheckinModal';
import OfflineBanner from './OfflineBanner';
import ReportButton from './ReportButton';
import ReportButtonLocked from './ReportButtonLocked';
import ReportDone from './ReportDone';
import ReportSheet from './ReportSheet';
import SkuCard from './SkuCard';
import StockGridSkeleton from './StockGridSkeleton';
import StockSectionHeader from './StockSectionHeader';
import StockTopBar from './StockTopBar';
import { useCheckin, useCheckinFlow } from './useCheckin';
import type { CheckinNotice } from './useCheckin';
import { useReportFlow } from './useReportFlow';
import type { ReportNotice } from './useReportFlow';
import { useStockGrid } from './useStockGrid';

const ENDED_MESSAGE = '팝업이 종료되었어요';
const UPCOMING_MESSAGE = '아직 시작 전인 팝업이에요';
const LOCKED_REPORT_MESSAGE = '현장 인증 후 제보할 수 있어요';
const LOCATE_ERROR_MESSAGE = '위치를 확인하지 못했어요. 다시 시도해 주세요';
const REPORT_ERROR_MESSAGE = '제보에 실패했어요. 다시 시도해 주세요';
/** 제보 성공 토스트에서 brand 색으로 강조할 조각 (feedback.md 'toast' accent) */
const POINTS_ACCENT = '+10P';

/** 인증 모달을 닫고 띄울 토스트 */
const NOTICE_TOAST: Record<CheckinNotice, { message: string; variant: 'default' | 'error' }> = {
  failed: { message: LOCATE_ERROR_MESSAGE, variant: 'error' },
  popup_ended: { message: ENDED_MESSAGE, variant: 'default' },
  popup_not_started: { message: UPCOMING_MESSAGE, variant: 'default' },
};

/* ------------------------------------------------------------------ */
/* 화면 조각                                                           */
/* ------------------------------------------------------------------ */

interface SkuGridProps {
  skus: StockSku[];
  /** 카드 하단 버튼을 고른다 (잠김 / [제보] / 제출 중 / 제보 완료) */
  renderFooter: (sku: StockSku) => ReactNode;
  /** SKU id → 번쩍임 번호 */
  flashKeys: Record<string, number>;
}

/** SKU 2열 그리드. SKU 가 없으면 빈 상태 */
function SkuGrid({ skus, renderFooter, flashKeys }: SkuGridProps) {
  if (skus.length === 0) return <EmptyState icon={Package} title="아직 등록된 굿즈가 없어요" />;

  return (
    <ul className="mt-3 grid grid-cols-2 gap-3" aria-label="굿즈별 재고">
      {skus.map((sku) => (
        <li key={sku.id} className="flex">
          <SkuCard sku={sku} footer={renderFooter(sku)} flashKey={flashKeys[sku.id] ?? 0} />
        </li>
      ))}
    </ul>
  );
}

interface NoticeProps {
  icon: Icon;
  title: string;
  actionLabel: string;
  onAction: () => void;
}

/** 상단바 없는 안내 화면 (비로그인·없는 팝업·불러오기 실패) */
function Notice({ icon, title, actionLabel, onAction }: NoticeProps) {
  return (
    <div className="pt-6">
      <EmptyState
        icon={icon}
        title={title}
        action={
          <ButtonPrimary fullWidth={false} onClick={onAction}>
            {actionLabel}
          </ButtonPrimary>
        }
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 화면                                                                */
/* ------------------------------------------------------------------ */

export default function StockGridPage() {
  const { popupId = '' } = useParams();
  const navigate = useNavigate();
  const requireAuth = useRequireAuth();
  const grid = useStockGrid(popupId);
  const { state } = grid;
  const checkin = useCheckin(popupId);
  // 인증 성공 뒤 [인증하기]가 사라지므로, 모달이 닫히면 배너가 포커스를 받는다
  const bannerRef = useRef<HTMLElement>(null);

  // 같은 문구를 연달아 띄워도 토스트가 새로 3초를 세도록 id 를 붙인다
  const [toast, setToast] = useState<{ id: number; message: string; variant: 'default' | 'error'; highlight?: string } | null>(null);
  const showToast = useCallback(
    (message: string, variant: 'default' | 'error' = 'default', highlight?: string) =>
      setToast({ id: Date.now(), message, variant, highlight }),
    [],
  );
  const closeToast = useCallback(() => setToast(null), []);

  const flow = useCheckinFlow({
    popupId,
    onVerified: checkin.apply,
    onNotice: (notice) => showToast(NOTICE_TOAST[notice].message, NOTICE_TOAST[notice].variant),
  });

  const goSearch = () => navigate('/search');
  const goFavorites = () => navigate('/stock');
  // 로그인 후(또는 로그인 화면을 닫으면) 이 화면으로 돌아온다. 이어서 할 일은 없다
  const goLogin = () => {
    requireAuth();
  };

  /**
   * [인증하기]: 종료 → 시작 전 → 로그인 순서로 확인한 뒤 GPS 확인 모달을 연다.
   * 종료 안내가 로그인 요구보다 먼저 (popup-detail 과 같은 순서).
   * 화면 자체가 로그인을 요구하므로 requireAuth 는 세션이 끊긴 경우를 대비한 안전장치다.
   * 로그인 후 돌아오면 [인증하기]를 다시 누른다(이어하기 없음, checkin-modal.md '로그인').
   */
  const handleVerify = () => {
    if (state.status !== 'done') return;
    if (state.isEnded) {
      showToast(ENDED_MESSAGE);
      return;
    }
    if (state.isUpcoming) {
      showToast(UPCOMING_MESSAGE);
      return;
    }
    if (!requireAuth()) return;
    flow.open();
  };

  const handleLockedReport = useCallback(() => showToast(LOCKED_REPORT_MESSAGE), [showToast]);

  /** 시트를 닫거나 유지하며 띄울 안내 */
  const handleReportNotice = (notice: ReportNotice) => {
    if (notice === 'failed') showToast(REPORT_ERROR_MESSAGE, 'error');
    else if (notice === 'popup_ended') showToast(ENDED_MESSAGE);
    else if (notice === 'not_onsite') showToast(LOCKED_REPORT_MESSAGE);
    // 세션이 끊긴 경우: 로그인 화면으로 보냈다가 이 화면으로 돌아온다
    else requireAuth();
  };

  const report = useReportFlow({
    popupId,
    active: checkin.active,
    onSuccess: (result) => {
      grid.applySku(result.sku);
      grid.markReported(result.sku.id);
      // 칭호는 10P 적립 후 값으로 계산한다 (lib/title.ts, DEV_RULES 3번)
      showToast(`체류자 제보 완료! ${POINTS_ACCENT} (현재 칭호: ${getTitle(result.total_points)})`, 'default', POINTS_ACCENT);
    },
    onAlreadyReported: grid.markReported,
    onNotice: handleReportNotice,
  });

  /** 시트 높이 (시트 위 토스트 위치) */
  const [sheetHeight, setSheetHeight] = useState(0);

  /** [제보] (인증 후): 제보 바텀시트를 연다 */
  const { openSheet } = report;
  const handleReport = useCallback((sku: StockSku) => openSheet(sku.id), [openSheet]);

  const reportedIds = useMemo(
    () => new Set(state.status === 'done' ? state.myReportedSkuIds : []),
    [state],
  );
  /** 제출 중인 SKU (카드 버튼 스피너) */
  const submittingSkuId = report.submitting !== null ? report.targetId : null;

  /**
   * 카드 하단 버튼 (stock.md '카드 상태')
   * 이미 제보함 → "제보 완료!" (영구 1회라 인증이 끝나도 유지) / 제출 중 → 스피너 / 인증 후 → [제보] / 인증 전 → 잠김
   */
  const renderFooter = (sku: StockSku) => {
    if (reportedIds.has(sku.id)) return <ReportDone skuId={sku.id} skuName={sku.name} />;
    if (submittingSkuId === sku.id) return <ReportButton skuName={sku.name} onClick={() => undefined} loading />;
    if (checkin.active) return <ReportButton skuName={sku.name} onClick={() => handleReport(sku)} />;
    return <ReportButtonLocked skuName={sku.name} onClick={handleLockedReport} />;
  };

  // 시트는 그리드의 최신 값을 읽는다 (열린 사이 다른 사람 제보로 바뀐 상태 반영)
  const sheetSku =
    state.status === 'done' && report.targetId ? state.skus.find((sku) => sku.id === report.targetId) : undefined;

  /** 상태별 본문 */
  const renderBody = () => {
    switch (state.status) {
      case 'loading':
        return <StockGridSkeleton />;
      case 'signedOut':
        return <Notice icon={Lock} title="재고를 확인하려면 로그인해 주세요" actionLabel="로그인하기" onAction={goLogin} />;
      case 'notFound':
        return <Notice icon={Storefront} title="팝업을 찾을 수 없어요" actionLabel="팝업 검색하러 가기" onAction={goSearch} />;
      case 'error':
        return <Notice icon={Package} title="재고를 불러오지 못했어요" actionLabel="팝업 검색하러 가기" onAction={goSearch} />;
      case 'done':
        // 체크인 확인이 끝날 때까지 스켈레톤을 유지한다 (배너가 인증 전 → 완료로 깜빡이지 않게)
        if (checkin.status === 'loading') return <StockGridSkeleton />;
        return (
          <>
            <StockTopBar popupName={state.popup.name} onSelect={goFavorites} />
            {!grid.connected && <OfflineBanner />}
            <CheckinBanner ref={bannerRef} remainingLabel={checkin.remainingLabel} onVerify={handleVerify} />
            <div className="mt-6">
              <StockSectionHeader count={state.skus.length > 0 ? state.skus.length : null} live={grid.connected} />
            </div>
            <SkuGrid skus={state.skus} renderFooter={renderFooter} flashKeys={grid.flashKeys} />
            {/* 다른 사람 제보로 상태가 바뀌면 스크린리더가 읽는다 (화면에는 보이지 않음) */}
            <p className="sr-only" aria-live="polite">
              {grid.announcement}
            </p>
          </>
        );
    }
  };

  return (
    // 아래 패딩: 탭바 높이 + 여유 96px (BASE '엄지 영역') + safe-area
    <main className="mx-auto max-w-[480px] px-4 pb-[calc(96px+env(safe-area-inset-bottom))] pt-[env(safe-area-inset-top)]">
      {renderBody()}

      {state.status === 'done' && flow.step && (
        <CheckinModal
          step={flow.step}
          popupName={state.popup.name}
          onLocate={flow.locate}
          onClose={flow.close}
          returnFocusFallback={bannerRef}
        />
      )}

      {sheetSku && (
        <ReportSheet
          sku={sheetSku}
          open={report.open}
          submitting={report.submitting}
          onSelect={report.submit}
          onRequestClose={report.requestClose}
          onClosed={report.handleClosed}
          onHeightChange={setSheetHeight}
        />
      )}

      {toast && (
        <Toast
          key={toast.id}
          message={toast.message}
          variant={toast.variant}
          highlight={toast.highlight}
          onClose={closeToast}
          // 시트가 올라와 있으면 시트 위에, 아니면 탭바 위에
          placement={report.open ? 'above-sheet' : 'above-tabbar'}
          sheetHeight={sheetHeight}
        />
      )}
    </main>
  );
}
