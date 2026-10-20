/**
 * 기기의 현재 위치를 1회 조회한다 (브라우저 Geolocation API, DEV_RULES 2-2 '1회성 위치 조회')
 * 계속 따라가지 않고(watch 없음) 한 번만 읽어서 배터리를 아낀다. 저장된 옛 위치도 쓰지 않는다.
 * 실패는 예외 대신 code 로 돌려준다. 좌표를 서버로 보내 판정하는 일은 src/api/checkins.ts 가 한다.
 * 사용처: src/pages/stock-grid/useCheckin.ts (인증 모달 [위치 확인])
 *
 * 개발 중 시험: Chrome DevTools → More tools → Sensors 에서 좌표를 바꾸거나 'Location unavailable' 을 고른다.
 * 위치 API 는 HTTPS 또는 localhost 에서만 동작한다.
 */
import type { CheckinPosition } from '../api/types';

/**
 * 위치 조회 실패 원인
 * - denied: 위치 권한 거부
 * - unavailable: 기기가 위치를 찾지 못함
 * - timeout: 제한 시간 안에 못 찾음
 * - unsupported: 위치 기능이 없거나, HTTPS 가 아니라서 쓸 수 없음
 */
export type LocateErrorCode = 'denied' | 'unavailable' | 'timeout' | 'unsupported';

export type LocateResult = { ok: true; position: CheckinPosition } | { ok: false; code: LocateErrorCode };

const LOCATE_TIMEOUT_MS = 10_000;

export function getCurrentPosition(): Promise<LocateResult> {
  // HTTP(같은 와이파이의 휴대폰 등)에서는 브라우저가 '권한 거부'로 돌려준다.
  // 권한 안내 문구가 잘못 뜨지 않게 미리 '쓸 수 없음'으로 처리한다
  if (!window.isSecureContext || !('geolocation' in navigator)) {
    return Promise.resolve({ ok: false, code: 'unsupported' });
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        resolve({
          ok: true,
          position: { latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy ?? null },
        }),
      (error) => {
        if (error.code === error.PERMISSION_DENIED) resolve({ ok: false, code: 'denied' });
        else if (error.code === error.TIMEOUT) resolve({ ok: false, code: 'timeout' });
        else resolve({ ok: false, code: 'unavailable' });
      },
      { enableHighAccuracy: true, timeout: LOCATE_TIMEOUT_MS, maximumAge: 0 },
    );
  });
}
