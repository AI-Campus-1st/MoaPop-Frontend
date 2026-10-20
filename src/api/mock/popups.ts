/**
 * Mock 팝업·SKU 데이터
 * src/api/popups.ts 에서만 읽는다. 실제 서버로 바꿀 때 이 파일은 삭제한다.
 * 기준일 2026-10-15: 진행 중 3곳 + 종료 1곳 (정렬 규칙 '진행 중 우선' 확인용)
 */
import type { Popup, Sku } from '../types';

export const mockPopups: Popup[] = [
  {
    id: 'popup-maru-seongsu',
    name: '마루는 강쥐 성수 팝업',
    place_name: '성수 에스팩토리',
    latitude: 37.5447,
    longitude: 127.0557,
    start_date: '2026-10-10',
    end_date: '2026-10-26',
    open_hours: '11:00 - 20:00',
    description: '마루와 친구들의 가을 산책을 테마로 한 팝업이에요.',
    image_url: '',
  },
  {
    id: 'popup-maru-hyundai',
    name: '마루는 강쥐 굿즈 마켓',
    place_name: '더현대 서울 B1',
    latitude: 37.5259,
    longitude: 126.9284,
    start_date: '2026-10-01',
    end_date: '2026-10-20',
    open_hours: '10:30 - 20:00',
    description: '한정 굿즈를 모아 파는 마켓형 팝업이에요.',
    image_url: '',
  },
  {
    id: 'popup-mang-hongdae',
    name: '망그러진 곰 팝업스토어',
    place_name: '홍대 AK&',
    latitude: 37.5573,
    longitude: 126.9245,
    start_date: '2026-10-08',
    end_date: '2026-11-02',
    open_hours: '11:00 - 21:00',
    description: '망곰이의 하루를 따라 걷는 체험형 팝업이에요.',
    image_url: '',
  },
  {
    id: 'popup-maru-walk-ended',
    name: '오늘도 마루 산책 팝업',
    place_name: '잠실 롯데월드몰',
    latitude: 37.5131,
    longitude: 127.1043,
    start_date: '2026-09-01',
    end_date: '2026-09-21',
    open_hours: '10:30 - 22:00',
    description: '지난 시즌 산책 테마 팝업이에요.',
    image_url: '',
  },
];

export const mockSkus: Sku[] = [
  { id: 'sku-maru-acrylic', popup_id: 'popup-maru-seongsu', name: '한정 아크릴 스탠드', price: 15000, image_url: '', status: 'low' },
  { id: 'sku-maru-photocard', popup_id: 'popup-maru-seongsu', name: '포토카드 세트', price: 9000, image_url: '', status: 'available' },
  { id: 'sku-maru-doll', popup_id: 'popup-maru-seongsu', name: '마루 인형 키링', price: 18000, image_url: '', status: 'soldout' },
  { id: 'sku-market-cup', popup_id: 'popup-maru-hyundai', name: '머그컵', price: 16000, image_url: '', status: 'available' },
  { id: 'sku-market-sticker', popup_id: 'popup-maru-hyundai', name: '스티커 팩', price: 5000, image_url: '', status: 'low' },
  { id: 'sku-mang-plush', popup_id: 'popup-mang-hongdae', name: '망곰 대형 인형', price: 39000, image_url: '', status: 'soldout' },
  { id: 'sku-mang-tote', popup_id: 'popup-mang-hongdae', name: '에코백', price: 22000, image_url: '', status: 'available' },
  { id: 'sku-walk-badge', popup_id: 'popup-maru-walk-ended', name: '산책 뱃지', price: 7000, image_url: '', status: 'soldout' },
];
