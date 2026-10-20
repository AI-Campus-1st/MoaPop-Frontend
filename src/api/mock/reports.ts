/**
 * Mock 제보 데이터
 * src/api/mock/realtime.ts 가 저장된 제보와 합쳐서 쓴다(TOP3 집계, SKU 상태·인원 수 계산). 실제 서버로 바꿀 때 이 파일은 삭제한다.
 * 제보 시각은 '지금'을 기준으로 몇 분 전인지로 만들어서, 언제 실행해도 최근 24시간 집계가 동작한다.
 */
import type { Report } from '../types';

const MINUTE = 60 * 1000;

/** 지금으로부터 minutesAgo 분 전의 ISO 시각 */
function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * MINUTE).toISOString();
}

export const mockReports: Report[] = [
  // 성수 팝업: 24시간 안 4건 → 1위
  { id: 'r1', user_id: 'u1', sku_id: 'sku-maru-acrylic', status: 'low', reported_at: minutesAgo(5) },
  { id: 'r2', user_id: 'u2', sku_id: 'sku-maru-acrylic', status: 'low', reported_at: minutesAgo(12) },
  { id: 'r3', user_id: 'u3', sku_id: 'sku-maru-doll', status: 'soldout', reported_at: minutesAgo(40) },
  { id: 'r4', user_id: 'u4', sku_id: 'sku-maru-doll', status: 'soldout', reported_at: minutesAgo(90) },
  // 홍대 팝업: 24시간 안 2건, 가장 최근 20분 전
  { id: 'r5', user_id: 'u1', sku_id: 'sku-mang-plush', status: 'soldout', reported_at: minutesAgo(20) },
  { id: 'r6', user_id: 'u5', sku_id: 'sku-mang-plush', status: 'soldout', reported_at: minutesAgo(300) },
  // 더현대 마켓: 24시간 안 2건, 가장 최근 60분 전 → 홍대와 동률이지만 덜 최근이라 3위
  { id: 'r7', user_id: 'u2', sku_id: 'sku-market-sticker', status: 'low', reported_at: minutesAgo(60) },
  { id: 'r8', user_id: 'u6', sku_id: 'sku-market-sticker', status: 'low', reported_at: minutesAgo(200) },
  // 종료된 팝업: 24시간 밖 제보 → 집계 제외 확인용
  { id: 'r9', user_id: 'u3', sku_id: 'sku-walk-badge', status: 'soldout', reported_at: minutesAgo(60 * 24 * 30) },
];
