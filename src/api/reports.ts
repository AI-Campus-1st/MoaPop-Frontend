/**
 * 재고 제보 API (reports 테이블, DEV_RULES 2-3, pages/report-sheet.md)
 * 화면은 SKU 와 선택지만 넘긴다. 체류자 검증 · 중복 제한 · 상태 변경 · 10P 적립은 이 파일 안에서 한 번에 한다.
 * 이 파일이 '서버' 역할이라, Supabase 연결 시 함수 내부만 RPC 호출로 바꾸면 된다.
 * user_id 는 화면에서 넘기지 않고 현재 세션으로 정한다(서버에서는 auth.uid()).
 * 사용처: src/pages/stock-grid/useReportFlow.ts (submitReport), src/pages/my/useMyRecords.ts (getMyReports)
 *
 * 규칙 (2026-10-16 사용자 결정)
 * - 한 계정은 같은 SKU 에 영구 1회만 제보한다. 재입고·같은 상태 확인 제보도 이 1회에 포함된다
 * - 현재 상태와 같은 선택도 받는다(확인 제보, 인원 +1, +10P)
 * - 마지막 제보가 SKU 상태를 정한다. 재입고는 소진 임박으로 바꾼다
 *
 * [인계 메모] 서버 연결 시
 * - 아래 검사·저장·skus.status 변경·profiles.total_points + 10 을 RPC 하나의 트랜잭션으로 처리한다
 * - reports 에 unique(user_id, sku_id) 제약. 위반은 already_reported 로 돌려준다
 * - 체류자 검증: checkins 에서 order by checked_in_at desc limit 1 이 이 팝업이고 expires_at > now()
 */
import { applyPointsMock, getSession } from './auth';
import { findActiveCheckin } from './checkins';
import { mockPopups, mockSkus } from './mock/popups';
import { appendReport, getAllReports, hasReported, isConnected, isReportChoice } from './mock/realtime';
import { isPopupEnded } from './popups';
import { toStockSkus } from './stock';
import type { MyReport, MyReportsQuery, MyReportsResult, Report, ReportChoice, ReportResult } from './types';

/** 네트워크 지연 흉내 (선택지 스피너 확인용). QA 기준 '1초 내 토스트'를 넘지 않게 400ms. 서버 연결 시 삭제 */
const MOCK_DELAY_MS = 400;
/** 제보 1회 적립 포인트 (DEV_RULES 3번) */
export const REPORT_POINTS = 10;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 재고 제보 (report-sheet 선택지 탭 → 즉시 제출, 확인 단계 없음)
 * 검사 순서: 세션 → SKU → 팝업 종료 → 연결 → 체류자 → 중복. 통과하면 저장 + 상태 변경 + 10P.
 */
export async function submitReport(skuId: string, choice: ReportChoice): Promise<ReportResult> {
  await wait(MOCK_DELAY_MS);

  try {
    const session = await getSession();
    if (!session) return { ok: false, code: 'not_signed_in' };
    if (!isReportChoice(choice)) return { ok: false, code: 'unknown' };

    const sku = mockSkus.find((item) => item.id === skuId);
    const popup = sku ? mockPopups.find((item) => item.id === sku.popup_id) : undefined;
    if (!sku || !popup) return { ok: false, code: 'not_found' };
    if (isPopupEnded(popup)) return { ok: false, code: 'popup_ended' };
    // 연결이 끊긴 동안은 요청이 서버에 닿지 않은 것으로 본다
    if (!isConnected()) return { ok: false, code: 'unknown' };
    if (!findActiveCheckin(session.user_id, popup.id)) return { ok: false, code: 'not_onsite' };
    if (hasReported(session.user_id, sku.id)) return { ok: false, code: 'already_reported' };

    // 포인트를 먼저 적립하고, 제보 저장에 실패하면 되돌린다 (Mock 에서 트랜잭션 흉내)
    const totalPoints = applyPointsMock(session.user_id, REPORT_POINTS);
    if (totalPoints === null) return { ok: false, code: 'unknown' };

    const report: Report = {
      id: `report-${Date.now()}`,
      user_id: session.user_id,
      sku_id: sku.id,
      status: choice,
      reported_at: new Date().toISOString(),
    };
    try {
      appendReport(report);
    } catch {
      applyPointsMock(session.user_id, -REPORT_POINTS);
      return { ok: false, code: 'unknown' };
    }

    const [updated] = toStockSkus([sku]);
    return { ok: true, report, sku: updated, total_points: totalPoints };
  } catch {
    return { ok: false, code: 'unknown' };
  }
}

/* ------------------------------------------------------------------ */
/* 내 제보 목록 (MY)                                                     */
/* ------------------------------------------------------------------ */

/** cursor 안에서 시각과 id 를 나누는 글자 (ISO 시각과 id 에는 들어가지 않는다) */
const CURSOR_SEPARATOR = '|';

/** 최신순 정렬: 시각 내림차순, 같은 시각이면 id 내림차순 (페이지를 나눌 때 순서가 흔들리지 않게) */
function compareNewestFirst(a: Report, b: Report): number {
  if (a.reported_at !== b.reported_at) return b.reported_at.localeCompare(a.reported_at);
  return b.id.localeCompare(a.id);
}

/** 이 제보가 cursor 가 가리키는 제보보다 뒤(더 오래된 쪽)에 오는지 */
function isAfterCursor(report: Report, cursorAt: string, cursorId: string): boolean {
  return compareNewestFirst({ ...report, reported_at: cursorAt, id: cursorId }, report) < 0;
}

/**
 * 내 제보 목록 (MY '내 제보 횟수'·'내 최근 제보 내역')
 * 최신순으로 limit 개씩 나눠 준다. 다음 페이지는 결과의 nextCursor 를 넘겨 받는다.
 * 굿즈·팝업을 찾지 못한 제보는 목록에서 빼지만 totalCount 에는 센다(QA: 제보 횟수 = reports 건수).
 *
 * [인계 메모] 서버 연결 시
 * - 건수: select count(*) from reports where user_id = auth.uid()
 * - 목록: reports + skus + popups 조인, order by reported_at desc, id desc limit N,
 *   다음 페이지는 (reported_at, id) < (cursor 값) 조건으로 이어 받는다(키셋 페이지 나눔)
 */
export async function getMyReports({ limit, cursor }: MyReportsQuery): Promise<MyReportsResult> {
  await wait(MOCK_DELAY_MS);

  try {
    const session = await getSession();
    if (!session) return { ok: false, code: 'not_signed_in' };
    if (!Number.isInteger(limit) || limit < 1) return { ok: false, code: 'unknown' };

    const mine = getAllReports()
      .filter((report) => report.user_id === session.user_id)
      .sort(compareNewestFirst);

    // 조인: 굿즈 → 팝업. 둘 중 하나라도 없으면 목록에서 뺀다
    const joined: MyReport[] = [];
    for (const report of mine) {
      const sku = mockSkus.find((item) => item.id === report.sku_id);
      const popup = sku ? mockPopups.find((item) => item.id === sku.popup_id) : undefined;
      if (sku && popup) joined.push({ report, skuName: sku.name, popupId: popup.id, popupName: popup.name });
    }

    let start = 0;
    if (cursor !== undefined) {
      const [cursorAt, cursorId] = cursor.split(CURSOR_SEPARATOR);
      if (!cursorAt || !cursorId) return { ok: false, code: 'unknown' };
      start = joined.findIndex((item) => isAfterCursor(item.report, cursorAt, cursorId));
      if (start === -1) start = joined.length;
    }

    const items = joined.slice(start, start + limit);
    const last = items[items.length - 1];
    const hasMore = start + limit < joined.length;
    const nextCursor = hasMore && last ? `${last.report.reported_at}${CURSOR_SEPARATOR}${last.report.id}` : null;

    return { ok: true, items, totalCount: mine.length, nextCursor };
  } catch {
    return { ok: false, code: 'unknown' };
  }
}
