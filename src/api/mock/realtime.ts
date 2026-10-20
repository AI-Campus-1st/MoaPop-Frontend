/**
 * Mock 제보 저장소 + 실시간 알림 통로 (서버 연결 시 이 파일은 삭제한다)
 * - 제보: 시드(mock/reports.ts) + 이 브라우저에서 쌓인 제보(localStorage)를 합쳐 '서버 테이블'처럼 쓴다
 * - SKU 상태·제보 인원 수는 따로 저장하지 않고, 시드 상태에 제보를 시간순으로 적용해 계산한다(마지막 제보가 이김)
 * - 알림: 같은 탭의 제보, 다른 탭의 제보(storage 이벤트), 브라우저 online/offline 을 구독자에게 알린다
 * - 개발 모드 콘솔 도우미: moapopDev.simulateReport(skuId, choice) / moapopDev.setOffline(true|false)
 * 사용처: src/api/reports.ts (제보 저장·중복 확인), src/api/stock.ts (상태 계산·구독), src/api/popups.ts (TOP3 집계)
 *
 * [인계 메모] 서버 연결 시
 * - reports 테이블 + unique(user_id, sku_id), skus.status 는 제보 RPC 가 함께 바꾼다
 * - 인원 수는 view/RPC 로 계산, 실시간은 Supabase Realtime 구독으로 바꾼다
 */
import type { Report, ReportChoice, Sku, SkuStatus } from '../types';
import { mockSkus } from './popups';
import { mockReports } from './reports';

const REPORTS_KEY = 'moapop:mock-reports';

/* ------------------------------------------------------------------ */
/* 저장소                                                              */
/* ------------------------------------------------------------------ */

const CHOICES: ReportChoice[] = ['low', 'soldout', 'restock'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isReportChoice(value: unknown): value is ReportChoice {
  return typeof value === 'string' && (CHOICES as string[]).includes(value);
}

function isReportRow(value: unknown): value is Report {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.user_id === 'string' &&
    typeof value.sku_id === 'string' &&
    isReportChoice(value.status) &&
    typeof value.reported_at === 'string'
  );
}

/** 이 브라우저에 쌓인 제보. 없거나 깨졌으면 빈 목록 */
function loadStoredReports(): Report[] {
  try {
    const raw = localStorage.getItem(REPORTS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(isReportRow) : [];
  } catch {
    return [];
  }
}

/** 시드 + 저장된 제보 전체 (TOP3 집계·상태 계산용) */
export function getAllReports(): Report[] {
  return [...mockReports, ...loadStoredReports()];
}

/** 이 유저가 이 SKU 를 이미 제보했는지 (unique(user_id, sku_id) 대응) */
export function hasReported(userId: string, skuId: string): boolean {
  return getAllReports().some((report) => report.user_id === userId && report.sku_id === skuId);
}

/** 제보 한 건을 저장하고 구독자에게 알린다. 저장에 실패하면 예외를 그대로 던진다 */
export function appendReport(report: Report): void {
  localStorage.setItem(REPORTS_KEY, JSON.stringify([...loadStoredReports(), report]));
  notifyReports();
}

/* ------------------------------------------------------------------ */
/* SKU 상태 · 인원 수 계산                                               */
/* ------------------------------------------------------------------ */

/** 제보 선택지가 SKU 를 어떤 상태로 바꾸는지. 재입고는 소진 임박 */
export function choiceToStatus(choice: ReportChoice): SkuStatus {
  return choice === 'restock' ? 'low' : choice;
}

export interface DerivedSkuState {
  status: SkuStatus;
  /** 지금 상태로 바뀐 뒤 그 상태를 제보한 사람 수 */
  reportCount: number;
  /** 가장 최근 제보자 (없으면 null). 실시간 알림에서 '내 제보'를 가리는 데 쓴다 */
  lastUserId: string | null;
}

/**
 * SKU 들의 현재 상태를 계산한다.
 * 시드 상태에서 시작해 제보를 시간순으로 적용한다: 결과 상태가 지금과 같으면 인원 +1, 다르면 상태를 바꾸고 1명부터.
 */
export function deriveSkuStates(skus: Sku[]): Map<string, DerivedSkuState> {
  const states = new Map<string, DerivedSkuState>(
    skus.map((sku) => [sku.id, { status: sku.status, reportCount: 0, lastUserId: null }]),
  );

  // ISO 시각 문자열은 사전순 비교가 시간순 비교와 같다
  const ordered = getAllReports()
    .filter((report) => states.has(report.sku_id))
    .sort((a, b) => a.reported_at.localeCompare(b.reported_at));

  for (const report of ordered) {
    const current = states.get(report.sku_id);
    if (!current) continue;
    const next = choiceToStatus(report.status);
    states.set(report.sku_id, {
      status: next,
      reportCount: next === current.status ? current.reportCount + 1 : 1,
      lastUserId: report.user_id,
    });
  }
  return states;
}

/* ------------------------------------------------------------------ */
/* 알림 (같은 탭 · 다른 탭 · 연결 상태)                                   */
/* ------------------------------------------------------------------ */

const reportListeners = new Set<() => void>();
const connectionListeners = new Set<(connected: boolean) => void>();
/** 개발 콘솔에서 끊긴 상태를 흉내 낼 때 true */
let forcedOffline = false;

function notifyReports(): void {
  reportListeners.forEach((listener) => listener());
}

function notifyConnection(): void {
  const connected = isConnected();
  connectionListeners.forEach((listener) => listener(connected));
}

/** 제보 저장소가 바뀔 때마다 부른다. 돌려준 함수를 부르면 해제 */
export function onReportsChange(listener: () => void): () => void {
  reportListeners.add(listener);
  return () => {
    reportListeners.delete(listener);
  };
}

/** 실시간 연결 상태가 바뀔 때마다 부른다. 돌려준 함수를 부르면 해제 */
export function onConnectionChange(listener: (connected: boolean) => void): () => void {
  connectionListeners.add(listener);
  return () => {
    connectionListeners.delete(listener);
  };
}

/** 지금 실시간 연결이 살아 있는지 (브라우저 오프라인이거나 콘솔로 끊었으면 false) */
export function isConnected(): boolean {
  return navigator.onLine && !forcedOffline;
}

if (typeof window !== 'undefined') {
  // 다른 탭이 제보하면 이 탭에는 storage 이벤트로 온다 → '다른 사람 제보'처럼 받는다
  window.addEventListener('storage', (event) => {
    if (event.key === REPORTS_KEY) notifyReports();
  });
  // DevTools → Network → Offline 으로 시험한다
  window.addEventListener('online', notifyConnection);
  window.addEventListener('offline', notifyConnection);
}

/* ------------------------------------------------------------------ */
/* 개발 모드 콘솔 도우미                                                 */
/* ------------------------------------------------------------------ */

interface MoapopDevTools {
  /** 가짜 유저의 제보 한 건을 쌓는다. 예: moapopDev.simulateReport('sku-maru-photocard', 'low') */
  simulateReport: (skuId: string, choice: ReportChoice) => void;
  /** 실시간 연결 끊김을 흉내 낸다. 예: moapopDev.setOffline(true) */
  setOffline: (offline: boolean) => void;
}

declare global {
  interface Window {
    moapopDev?: MoapopDevTools;
  }
}

if (import.meta.env.DEV && typeof window !== 'undefined') {
  window.moapopDev = {
    simulateReport(skuId, choice) {
      if (!mockSkus.some((sku) => sku.id === skuId)) {
        console.warn(`[moapopDev] 없는 SKU 예요: ${skuId}`);
        return;
      }
      if (!isReportChoice(choice)) {
        console.warn(`[moapopDev] 선택지는 'low' | 'soldout' | 'restock' 중 하나예요`);
        return;
      }
      appendReport({
        id: `sim-${Date.now()}`,
        // 매번 다른 가짜 유저라 중복 제한에 걸리지 않는다
        user_id: `sim-user-${Date.now()}`,
        sku_id: skuId,
        status: choice,
        reported_at: new Date().toISOString(),
      });
    },
    setOffline(offline) {
      forcedOffline = offline;
      notifyConnection();
    },
  };
}
