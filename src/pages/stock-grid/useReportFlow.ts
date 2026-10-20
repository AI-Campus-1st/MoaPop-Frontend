/**
 * 제보 흐름 (pages/report-sheet.md '흐름', DEV_RULES 2-3)
 * [제보] → 시트 열기 → 선택지 탭 → 즉시 제출(src/api/reports.ts) → 결과에 따라 화면에 알린다.
 * - 성공: 시트 닫기 + onSuccess (화면이 카드 반영·번쩍임·토스트·"제보 완료!")
 * - 이미 제보함: 시트 닫기 + onAlreadyReported (토스트 없이 "제보 완료!")
 * - 그 밖의 오류: 시트 유지 + onNotice('failed') (토스트 "제보에 실패했어요…")
 * - 종료·체류자 아님·비로그인: 시트 닫기 + onNotice
 * - 시트가 열린 채 현장 인증이 만료되면 안내 없이 닫는다(제출 중이면 서버 판정을 기다린다)
 * 사용처: StockGridPage
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { submitReport } from '../../api/reports';
import type { ReportChoice, ReportResult } from '../../api/types';

/** 시트를 닫거나 유지하며 토스트로 알릴 일 */
export type ReportNotice = 'failed' | 'popup_ended' | 'not_onsite' | 'not_signed_in';

type ReportSuccess = Extract<ReportResult, { ok: true }>;

interface ReportFlowOptions {
  popupId: string;
  /** 지금 현장 인증 상태인지 (useCheckin().active) */
  active: boolean;
  onSuccess: (result: ReportSuccess) => void;
  onAlreadyReported: (skuId: string) => void;
  onNotice: (notice: ReportNotice) => void;
}

export interface ReportFlow {
  /** 시트를 연 SKU. 내려가는 움직임이 끝날 때까지 남아 있다. 없으면 null */
  targetId: string | null;
  /** 시트가 올라와 있어야 하는지 */
  open: boolean;
  /** 제출 중인 선택지 */
  submitting: ReportChoice | null;
  openSheet: (skuId: string) => void;
  /** 딤·쓸기·Esc. 제출 중에는 무시 */
  requestClose: () => void;
  /** 시트가 다 내려간 뒤 (BottomSheet onClosed) */
  handleClosed: () => void;
  submit: (choice: ReportChoice) => void;
}

export function useReportFlow({ popupId, active, onSuccess, onAlreadyReported, onNotice }: ReportFlowOptions): ReportFlow {
  const [targetId, setTargetId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState<ReportChoice | null>(null);
  /** 진행 중인 요청 번호. 화면을 떠나거나 팝업이 바뀌면 올려서 늦게 온 응답을 버린다 */
  const runId = useRef(0);

  // 콜백이 바뀌어도 진행 중인 요청이 최신 콜백을 부르도록 ref 에 둔다
  const callbacks = useRef({ onSuccess, onAlreadyReported, onNotice });
  callbacks.current = { onSuccess, onAlreadyReported, onNotice };

  // 팝업이 바뀌거나 화면을 떠나면 시트를 치우고 진행 중인 요청의 응답을 버린다
  useEffect(() => {
    setTargetId(null);
    setOpen(false);
    setSubmitting(null);
    return () => {
      runId.current += 1;
    };
  }, [popupId]);

  // 열린 채 인증이 만료되면 조용히 닫는다 (checkin.md '만료되면 안내 없이'). 제출 중이면 응답을 기다린다
  useEffect(() => {
    if (open && !active && submitting === null) setOpen(false);
  }, [open, active, submitting]);

  const openSheet = useCallback((skuId: string) => {
    setTargetId(skuId);
    setOpen(true);
  }, []);

  const requestClose = useCallback(() => {
    if (submitting === null) setOpen(false);
  }, [submitting]);

  const handleClosed = useCallback(() => setTargetId(null), []);

  const submit = useCallback(
    async (choice: ReportChoice) => {
      // 같은 순간 두 번 눌러도 한 번만 보낸다
      if (!targetId || !open || submitting !== null) return;
      runId.current += 1;
      const id = runId.current;
      const skuId = targetId;
      setSubmitting(choice);

      const result = await submitReport(skuId, choice).catch(() => null);
      if (id !== runId.current) return;
      setSubmitting(null);

      if (result?.ok) {
        setOpen(false);
        callbacks.current.onSuccess(result);
        return;
      }

      const code = result?.code ?? 'unknown';
      if (code === 'unknown' || code === 'not_found') {
        // 다시 고를 수 있게 시트는 그대로 둔다
        callbacks.current.onNotice('failed');
        return;
      }

      setOpen(false);
      if (code === 'already_reported') callbacks.current.onAlreadyReported(skuId);
      else callbacks.current.onNotice(code);
    },
    [targetId, open, submitting],
  );

  return { targetId, open, submitting, openSheet, requestClose, handleClosed, submit };
}
