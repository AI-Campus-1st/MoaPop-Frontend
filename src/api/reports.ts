/**
 * 재고 제보 API (reports 테이블, DEV_RULES 2-3, pages/report-sheet.md, API_spec RPT-1 · RPT-2)
 * 화면은 SKU 와 선택지만 넘긴다. 체류자 검증·중복 제한·상태 변경·인원 수·10P 적립은 서버 submit_report 가
 * 한 트랜잭션으로 한다(CHECKIN_REPORT 5번). user_id 는 보내지 않는다(서버의 auth.uid()).
 * 사용처: src/pages/stock-grid/useReportFlow.ts (submitReport), src/pages/my/useMyRecords.ts (getMyReports),
 *         src/pages/my/ReportHistoryItem.tsx (REPORT_POINTS)
 */
import { supabase } from '../lib/supabase';
import { getSession, refreshSession } from './auth';
import { forgetMyReport, markMyReport, toStockSku } from './stock';
import type {
  MyReport,
  MyReportsQuery,
  MyReportsResult,
  Report,
  ReportChoice,
  ReportErrorCode,
  ReportResult,
} from './types';

/** 제보 1회 적립 포인트 (DEV_RULES 3번). 실제 적립은 서버가 하고, 화면 표기(+10P)에 쓴다 */
export const REPORT_POINTS = 10;

/** 내 제보 목록 커서: "제보 시각|제보 id" (키셋 페이지 나눔, API_spec RPT-2) */
const CURSOR_SEPARATOR = '|';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isReportChoice(value: unknown): value is ReportChoice {
  return value === 'low' || value === 'soldout' || value === 'restock';
}

/** 서버의 제보 기록(객체)을 화면 타입으로 바꾼다. 모양이 다르면 null */
function toReport(value: unknown): Report | null {
  if (!isRecord(value)) return null;
  const { id, user_id, sku_id, status, reported_at } = value;
  if (
    typeof id !== 'string' ||
    typeof user_id !== 'string' ||
    typeof sku_id !== 'string' ||
    !isReportChoice(status) ||
    typeof reported_at !== 'string'
  ) {
    return null;
  }
  return { id, user_id, sku_id, status, reported_at };
}

/** 서버가 돌려주는 제보 실패 코드 중 화면이 아는 것만 그대로 쓰고, 나머지는 unknown */
const REPORT_CODES: readonly ReportErrorCode[] = [
  'not_signed_in',
  'not_found',
  'popup_ended',
  'not_onsite',
  'already_reported',
];
function toReportCode(value: unknown): ReportErrorCode {
  return REPORT_CODES.find((code) => code === value) ?? 'unknown';
}

/**
 * 재고 제보(RPT-1, report-sheet 선택지 탭 → 즉시 제출).
 * 성공하면 바뀐 SKU·누적 포인트를 돌려주고, 로그인 정보의 포인트도 새로 읽는다(MY 칭호·포인트 갱신).
 * 연결이 끊겨 서버에 닿지 못하면 unknown(아무것도 바뀌지 않는다).
 */
export async function submitReport(skuId: string, choice: ReportChoice): Promise<ReportResult> {
  if (!(await getSession())) return { ok: false, code: 'not_signed_in' };
  if (!isReportChoice(choice)) return { ok: false, code: 'unknown' };

  // 실시간 알림이 응답보다 먼저 와도 '내 제보'로 처리되도록 보내기 전에 표시해 둔다
  markMyReport(skuId);
  try {
    const { data, error } = await supabase.rpc('submit_report', { p_sku_id: skuId, p_choice: choice });
    const result: unknown = data;
    if (error || !isRecord(result)) {
      forgetMyReport(skuId);
      return { ok: false, code: 'unknown' };
    }
    if (result.ok !== true) {
      forgetMyReport(skuId);
      return { ok: false, code: toReportCode(result.code) };
    }

    const report = toReport(result.report);
    const sku = toStockSku(result.sku);
    if (!report || !sku || typeof result.total_points !== 'number') return { ok: false, code: 'unknown' };

    // 포인트는 서버가 이미 적립했다. 화면 곳곳(MY·칭호)이 쓰는 로그인 정보만 새로 읽는다
    void refreshSession();
    return { ok: true, report, sku, total_points: result.total_points };
  } catch {
    forgetMyReport(skuId);
    return { ok: false, code: 'unknown' };
  }
}

/** 제보 목록 응답 한 줄을 화면 타입으로 바꾼다. 굿즈·팝업 이름을 못 읽으면 null(목록에서만 뺀다) */
function toMyReport(row: unknown): MyReport | null {
  const report = toReport(row);
  if (!report || !isRecord(row) || !isRecord(row.sku)) return null;
  const { name, popup_id, popup } = row.sku;
  if (typeof name !== 'string' || typeof popup_id !== 'string' || !isRecord(popup) || typeof popup.name !== 'string') {
    return null;
  }
  return { report, skuName: name, popupId: popup_id, popupName: popup.name };
}

/**
 * 내 제보 목록(RPT-2, MY '내 제보 횟수'·'내 최근 제보 내역')
 * 최신순(제보 시각 → id)으로 limit 개씩. 다음 페이지는 결과의 nextCursor 를 넘겨 받는다.
 * 같은 시각 제보가 페이지 경계에 걸려도 중복·누락이 없다(8단계 M4 확인).
 * totalCount 는 내 제보 전체 건수(재입고·확인 제보도 1건).
 */
export async function getMyReports({ limit, cursor }: MyReportsQuery): Promise<MyReportsResult> {
  if (!(await getSession())) return { ok: false, code: 'not_signed_in' };
  if (!Number.isInteger(limit) || limit < 1) return { ok: false, code: 'unknown' };

  try {
    let query = supabase
      .from('reports')
      .select('id,user_id,sku_id,status,reported_at,sku:skus(name,popup_id,popup:popups(name))', { count: 'exact' })
      .order('reported_at', { ascending: false })
      .order('id', { ascending: false })
      // 한 건 더 받아서, 남는 게 있으면 다음 페이지가 있다고 본다
      .limit(limit + 1);

    if (cursor !== undefined) {
      const [cursorAt, cursorId] = cursor.split(CURSOR_SEPARATOR);
      if (!cursorAt || !cursorId) return { ok: false, code: 'unknown' };
      // (reported_at, id)가 커서보다 오래된 행만. 시각의 '+'는 라이브러리가 주소용으로 인코딩한다
      query = query.or(`reported_at.lt.${cursorAt},and(reported_at.eq.${cursorAt},id.lt.${cursorId})`);
    }

    const { data, error, count } = await query;
    if (error) return { ok: false, code: 'unknown' };

    // 커서가 있으면 위 count 는 "남은 건수"라서, 전체 건수는 따로 센다(행은 받지 않고 건수만)
    let totalCount = count ?? 0;
    if (cursor !== undefined) {
      const { count: total, error: countError } = await supabase
        .from('reports')
        .select('id', { count: 'exact', head: true });
      if (countError) return { ok: false, code: 'unknown' };
      totalCount = total ?? 0;
    }

    const rows: unknown = data;
    const list = Array.isArray(rows) ? rows : [];
    const hasMore = list.length > limit;
    const pageRows = list.slice(0, limit);
    const items = pageRows.map(toMyReport).filter((item): item is MyReport => item !== null);

    // 다음 커서는 이번 페이지의 마지막 행 기준(이름을 못 읽어 뺀 행이 있어도 위치는 행 기준)
    const lastReport = toReport(pageRows[pageRows.length - 1]);
    const nextCursor =
      hasMore && lastReport ? `${lastReport.reported_at}${CURSOR_SEPARATOR}${lastReport.id}` : null;

    return { ok: true, items, totalCount, nextCursor };
  } catch {
    return { ok: false, code: 'unknown' };
  }
}
