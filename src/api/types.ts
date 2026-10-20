/**
 * 데이터 타입 정의
 * 필드 이름은 나중에 붙을 Supabase 테이블 컬럼(0_DEV_RULES.md 7번)과 같은 snake_case 로 맞췄다.
 * Mock(src/api/mock)과 API 함수(src/api/*.ts), 화면 컴포넌트가 함께 쓴다.
 */

/** SKU 재고 상태: 여유 / 소진 임박 / 품절 */
export type SkuStatus = 'available' | 'low' | 'soldout';

/** 팝업 (popups 테이블) */
export interface Popup {
  id: string;
  name: string;
  place_name: string;
  /** 체크인 거리 계산용 좌표 */
  latitude: number;
  longitude: number;
  /** 'YYYY-MM-DD', 시작·종료일 포함 */
  start_date: string;
  end_date: string;
  open_hours: string;
  description: string;
  image_url: string;
}

/** 팝업에서 파는 굿즈 (skus 테이블) */
export interface Sku {
  id: string;
  popup_id: string;
  name: string;
  price: number;
  image_url: string;
  status: SkuStatus;
}

/**
 * 제보 선택지: 소진 임박 / 품절 / 재입고
 * 재입고는 품절 카드에서만 고를 수 있고, 제보하면 SKU 가 소진 임박(low)으로 바뀐다 (2026-10-16 사용자 결정).
 * '여유'로 되돌리는 선택지는 1차에 없다(운영자만 바꾼다).
 */
export type ReportChoice = 'low' | 'soldout' | 'restock';

/**
 * 재고 제보 (reports 테이블). 한 계정은 같은 SKU 에 영구 1회만 제보한다: unique(user_id, sku_id).
 * 마지막 제보가 SKU 상태를 정한다(재입고 → 소진 임박).
 */
export interface Report {
  id: string;
  user_id: string;
  sku_id: string;
  status: ReportChoice;
  /** ISO 시각. TOP3 집계(최근 24시간)에 쓴다. */
  reported_at: string;
}

/** 실시간 제보 TOP3 항목 */
export interface TopReportedPopup {
  popup: Popup;
  reportCount: number;
  /** 동률일 때 더 최근 제보가 있는 팝업을 앞에 두기 위한 값 (ISO 시각) */
  lastReportedAt: string;
}

/* ------------------------------------------------------------------ */
/* 로그인 · 회원가입 (DEV_RULES 2-7)                                     */
/* ------------------------------------------------------------------ */

/** 유저 프로필 (profiles 테이블). 칭호는 저장하지 않고 total_points 로 프론트에서 계산한다 */
export interface Profile {
  id: string;
  nickname: string;
  total_points: number;
}

/** 로그인된 상태 정보. Supabase Auth 의 세션(user id, email)에 프로필을 붙인 모양 */
export interface Session {
  user_id: string;
  email: string;
  profile: Profile;
}

/** 로그인 실패 원인: 이메일·비밀번호 불일치 / 네트워크 등 그 밖의 오류 */
export type SignInErrorCode = 'invalid_credentials' | 'unknown';

/** 회원가입 실패 원인: 이미 가입된 이메일 / 이미 쓰는 닉네임 / 그 밖의 오류 */
export type SignUpErrorCode = 'email_taken' | 'nickname_taken' | 'unknown';

/** 인증 API 결과. 실패는 예외 대신 code 로 돌려줘서 화면이 문구를 고르기 쉽게 한다 */
export type AuthResult<E extends string> =
  | { ok: true; session: Session }
  | { ok: false; code: E };

/** 회원가입 입력값 */
export interface SignUpInput {
  email: string;
  password: string;
  nickname: string;
}

/* ------------------------------------------------------------------ */
/* 찜 (DEV_RULES 2-5)                                                   */
/* ------------------------------------------------------------------ */

/** 찜 (favorites 테이블). unique(user_id, popup_id), RLS 로 본인 것만 읽는다 */
export interface Favorite {
  user_id: string;
  popup_id: string;
  /** ISO 시각 */
  created_at: string;
}

/** 팝업 상세 화면에 필요한 데이터: 팝업 정보 + 판매 굿즈 목록 */
export interface PopupDetail {
  popup: Popup;
  skus: Sku[];
}

/** 찜 실패 원인: 비로그인 / 종료된 팝업(찜 불가) / 그 밖의 오류 */
export type FavoriteErrorCode = 'not_signed_in' | 'popup_ended' | 'unknown';

/** 찜 추가·해제 결과. 인증 API 처럼 실패를 예외 대신 code 로 돌려준다 */
export type FavoriteResult = { ok: true } | { ok: false; code: FavoriteErrorCode };

/** 찜 목록(stock-favorites) 항목: 팝업 정보 + 찜한 시각 + 종료 여부 */
export interface FavoritePopup {
  popup: Popup;
  /** 찜한 시각 (favorites.created_at, ISO). 목록 정렬에 쓴다 */
  favoritedAt: string;
  /** 오늘이 종료일 다음 날 이후인지. 종료된 팝업은 흐리게 + 맨 아래 */
  isEnded: boolean;
}

/** 찜 목록 불러오기 실패 원인: 비로그인 / 그 밖의 오류 */
export type FavoriteListErrorCode = 'not_signed_in' | 'unknown';

/** 찜 목록 결과. 다른 찜 API 처럼 실패를 예외 대신 code 로 돌려준다 */
export type FavoriteListResult = { ok: true; items: FavoritePopup[] } | { ok: false; code: FavoriteListErrorCode };

/* ------------------------------------------------------------------ */
/* 재고 확인 SKU Grid (DEV_RULES 2-1, pages/stock-grid.md)               */
/* ------------------------------------------------------------------ */

/**
 * 재고 확인 화면의 SKU: skus 행 + 제보 인원 수
 * reportCount 는 '지금 상태로 바뀐 뒤 그 상태를 제보한 사람 수'(재입고는 소진 임박으로 센다). 상태가 바뀌면 1명부터 다시 센다.
 * 계산한 값이라 camelCase 다. [인계 메모] 서버에서는 view 또는 RPC 로 계산한다.
 */
export interface StockSku extends Sku {
  reportCount: number;
}

/** 재고 확인 화면 데이터: 팝업 정보(상단 선택자·인증 모달용) + SKU 목록(등록 순) + 종료·시작 전 여부 */
export interface StockGrid {
  popup: Popup;
  /** 등록 순서 고정. 상태가 바뀌어도 순서는 그대로 */
  skus: StockSku[];
  /** 내가 이미 제보한 SKU id (카드 버튼이 "제보 완료!") */
  myReportedSkuIds: string[];
  /** 오늘이 종료일 다음 날 이후인지. 종료된 팝업은 [인증하기] 대신 안내 토스트 */
  isEnded: boolean;
  /** 오늘이 시작일 전인지. 시작 전 팝업도 [인증하기] 대신 안내 토스트 */
  isUpcoming: boolean;
}

/** 재고 확인 불러오기 실패 원인: 비로그인 / 없는 팝업 / 그 밖의 오류 */
export type StockGridErrorCode = 'not_signed_in' | 'not_found' | 'unknown';

/** 재고 확인 결과. 다른 API 처럼 실패를 예외 대신 code 로 돌려준다 */
export type StockGridResult = ({ ok: true } & StockGrid) | { ok: false; code: StockGridErrorCode };

/* ------------------------------------------------------------------ */
/* 현장 인증 (DEV_RULES 2-2, pages/checkin-modal.md)                     */
/* ------------------------------------------------------------------ */

/**
 * 체크인 기록 (checkins 테이블). 인증할 때마다 한 줄씩 쌓인다. RLS 로 본인 것만 읽는다.
 * 유효 여부는 내 기록 전체 중 가장 최근 한 줄로 판단한다(그 줄의 팝업에서만, expires_at 전까지 유효).
 */
export interface Checkin {
  user_id: string;
  popup_id: string;
  /** ISO 시각 */
  checked_in_at: string;
  /** ISO 시각. checked_in_at + 2시간 (서버가 정한다) */
  expires_at: string;
}

/** 기기에서 1회 조회한 현재 위치. 서버가 이 값으로 팝업까지 거리를 계산한다 */
export interface CheckinPosition {
  latitude: number;
  longitude: number;
  /** 위치 오차 반경(미터). 참고용이며 판정에는 쓰지 않는다 */
  accuracy: number | null;
}

/** 현재 체크인 확인 실패 원인: 비로그인 / 그 밖의 오류 */
export type ActiveCheckinErrorCode = 'not_signed_in' | 'unknown';

/** 현재 체크인 확인 결과. 이 팝업에서 유효한 체크인이 없으면 checkin 이 null */
export type ActiveCheckinResult = { ok: true; checkin: Checkin | null } | { ok: false; code: ActiveCheckinErrorCode };

/**
 * 체크인 실패 원인
 * 비로그인 / 없는 팝업 / 종료된 팝업 / 시작 전 팝업 / 반경 500m 밖 / 그 밖의 오류
 */
export type CheckInErrorCode =
  | 'not_signed_in'
  | 'not_found'
  | 'popup_ended'
  | 'popup_not_started'
  | 'out_of_range'
  | 'unknown';

/** 체크인 결과. 다른 API 처럼 실패를 예외 대신 code 로 돌려준다 */
export type CheckInResult = { ok: true; checkin: Checkin } | { ok: false; code: CheckInErrorCode };

/* ------------------------------------------------------------------ */
/* 제보 + 포인트 (DEV_RULES 2-3, pages/report-sheet.md)                  */
/* ------------------------------------------------------------------ */

/**
 * 제보 실패 원인
 * 비로그인 / 없는 SKU / 종료된 팝업 / 현장 인증(체류자) 아님 / 이미 제보한 SKU / 그 밖의 오류(연결 끊김 포함)
 */
export type ReportErrorCode = 'not_signed_in' | 'not_found' | 'popup_ended' | 'not_onsite' | 'already_reported' | 'unknown';

/**
 * 제보 결과. 성공하면 제보 기록, 바뀐 SKU(상태·인원 수), 10P 적립 후 누적 포인트를 함께 돌려준다.
 * 다른 API 처럼 실패를 예외 대신 code 로 돌려준다.
 */
export type ReportResult =
  | { ok: true; report: Report; sku: StockSku; total_points: number }
  | { ok: false; code: ReportErrorCode };

/* ------------------------------------------------------------------ */
/* MY (pages/my.md, components/my-widgets.md)                          */
/* ------------------------------------------------------------------ */

/** 내 제보 내역 한 줄: 제보 기록 + 굿즈명·팝업명 (reports + skus + popups 조인) */
export interface MyReport {
  report: Report;
  skuName: string;
  popupId: string;
  popupName: string;
}

/** 내 제보 목록 조회 범위. cursor 는 이전 결과의 nextCursor (첫 페이지는 생략) */
export interface MyReportsQuery {
  limit: number;
  cursor?: string;
}

/** 내 제보 목록 조회 실패 원인: 비로그인 / 그 밖의 오류(잘못된 cursor 포함) */
export type MyReportsErrorCode = 'not_signed_in' | 'unknown';

/**
 * 내 제보 목록 결과 (최신순, 더보기용으로 나눠 받는다)
 * - totalCount: 내 제보 전체 건수 (MY '내 제보 횟수'). 재입고·확인 제보도 1건
 * - nextCursor: 다음 페이지를 받을 때 넘길 값. 더 없으면 null
 */
export type MyReportsResult =
  | { ok: true; items: MyReport[]; totalCount: number; nextCursor: string | null }
  | { ok: false; code: MyReportsErrorCode };

/** 내 체크인 이력 한 줄: 체크인 기록 + 팝업명 (checkins + popups 조인) */
export interface MyCheckin {
  checkin: Checkin;
  popupName: string;
}

/** 내 체크인 이력 조회 실패 원인: 비로그인 / 그 밖의 오류 */
export type MyCheckinsErrorCode = 'not_signed_in' | 'unknown';

/**
 * 내 체크인 이력 결과 (최신순)
 * - totalCount: 체크인 기록 전체 건수 (MY '체류 인증 이력')
 */
export type MyCheckinsResult =
  | { ok: true; items: MyCheckin[]; totalCount: number }
  | { ok: false; code: MyCheckinsErrorCode };
