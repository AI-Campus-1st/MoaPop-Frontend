/**
 * 로그인 요구 → 로그인 화면 → 원래 화면 복귀에 쓰는 값과 도우미
 * 로그인 화면으로 갈 때 location.state 에 AuthRedirectState 를 담고,
 * 로그인·가입이 끝나면 from 으로 돌아가면서 intent 를 { authIntent } 로 넘겨준다.
 * 사용처: RequireAuth, useRequireAuth (보내는 쪽) · LoginPage, SignupPage (받는 쪽)
 *         · popup-detail (돌아온 화면에서 readAuthIntent 로 할 일을 이어서 실행)
 */
import type { Location } from 'react-router-dom';

/**
 * 로그인 후 원래 화면에서 이어서 할 일
 * - favorite: 찜 저장만 (popup-detail 하트). 화면은 그대로, 토스트 없음
 * - favorite-and-stock: 찜 저장 후 재고 확인으로 이동 (popup-detail 하단 버튼. QA: 로그인 후 찜 저장 + SKU Grid 이동)
 * 현장 인증·제보는 이어하기가 없다. SKU Grid 가 화면 단위로 로그인을 요구해서, 로그인 후 버튼을 다시 누르면 된다 (2026-10-16 삭제)
 */
export type AuthIntent = 'favorite' | 'favorite-and-stock';

/** 돌아갈 화면 주소 (화면 고유의 state 는 담지 않는다) */
export interface ReturnLocation {
  pathname: string;
  search: string;
  hash: string;
}

/** 로그인·회원가입 화면이 받는 state */
export interface AuthRedirectState {
  from: ReturnLocation;
  intent?: AuthIntent;
  /**
   * 닫기(X)를 눌렀을 때 from 으로 돌아갈지 여부
   * - true: 버튼 동작에서 보낸 경우. from 이 곧 '직전 화면'이다
   * - false: 화면 진입(MY 탭)에서 보낸 경우. 막힌 화면 대신 그 전 기록으로 돌아간다
   */
  closeToFrom: boolean;
}

/** 원래 화면으로 돌아갈 때 넘기는 state */
export interface AuthReturnState {
  authIntent?: AuthIntent;
}

const INTENTS: readonly AuthIntent[] = ['favorite', 'favorite-and-stock'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isAuthIntent(value: unknown): value is AuthIntent {
  return typeof value === 'string' && (INTENTS as readonly string[]).includes(value);
}

/** 현재 화면을 로그인 화면에 넘길 state 로 만든다 */
export function buildRedirectState(location: Location, closeToFrom: boolean, intent?: AuthIntent): AuthRedirectState {
  return {
    from: { pathname: location.pathname, search: location.search, hash: location.hash },
    intent,
    closeToFrom,
  };
}

/** 로그인 화면이 받은 state 를 검사해 꺼낸다. 주소를 직접 열었으면 null */
export function readRedirectState(state: unknown): AuthRedirectState | null {
  if (!isRecord(state) || !isRecord(state.from)) return null;
  const { pathname, search, hash } = state.from;
  if (typeof pathname !== 'string' || typeof search !== 'string' || typeof hash !== 'string') return null;

  return {
    from: { pathname, search, hash },
    intent: isAuthIntent(state.intent) ? state.intent : undefined,
    closeToFrom: state.closeToFrom === true,
  };
}

/** 돌아온 화면에서 이어서 할 일을 꺼낸다. 없으면 null */
export function readAuthIntent(state: unknown): AuthIntent | null {
  if (!isRecord(state)) return null;
  return isAuthIntent(state.authIntent) ? state.authIntent : null;
}

/** 로그인·가입 성공 후 갈 곳. 요구한 화면이 없으면(주소 직접 진입) 팝업 검색 */
export const DEFAULT_RETURN_PATH = '/search';

/** 로그인·가입 성공 후 이동할 주소와 함께 넘길 state */
export function getReturnTarget(redirect: AuthRedirectState | null): { to: ReturnLocation | string; state: AuthReturnState } {
  if (!redirect) return { to: DEFAULT_RETURN_PATH, state: {} };
  return { to: redirect.from, state: redirect.intent ? { authIntent: redirect.intent } : {} };
}
