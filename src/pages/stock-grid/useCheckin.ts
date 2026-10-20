/**
 * 재고 확인 화면의 현장 인증 상태와 인증 모달 흐름 (pages/checkin-modal.md, components/checkin.md)
 * - useCheckin: 진입 시 이 팝업의 유효한 체크인을 확인하고, 남은 시간(H:MM)을 1분 단위로 갱신, 만료되면 인증 전으로
 * - useCheckinFlow: 모달 단계(위치 확인 → 확인 중 → 완료/범위 밖/권한 거부)와 위치 조회 → 체크인 요청
 * 데이터는 src/api/checkins.ts, 위치는 src/lib/geolocation.ts 를 거친다.
 * 사용처: StockGridPage
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { checkIn, getActiveCheckin } from '../../api/checkins';
import type { Checkin } from '../../api/types';
import { useAuth } from '../../lib/auth/AuthProvider';
import { formatRemaining } from '../../lib/format';
import { getCurrentPosition } from '../../lib/geolocation';

/* ------------------------------------------------------------------ */
/* 인증 상태                                                           */
/* ------------------------------------------------------------------ */

export interface CheckinStatus {
  /** 진입 시 체크인 확인 중이면 loading (화면은 스켈레톤을 유지해 배너가 깜빡이지 않게 한다) */
  status: 'loading' | 'ready';
  /** 지금 이 팝업에서 현장 인증 상태인지 */
  active: boolean;
  /** 남은 시간 'H:MM'. 인증 상태가 아니면 null */
  remainingLabel: string | null;
  /** 방금 인증한 기록을 화면에 반영한다 */
  apply: (checkin: Checkin) => void;
}

const MINUTE_MS = 60_000;

export function useCheckin(popupId: string): CheckinStatus {
  const { status: authStatus, session } = useAuth();
  const userId = session?.user_id ?? null;

  const [loaded, setLoaded] = useState(false);
  /** 만료 시각(ms). 인증 기록이 없으면 null */
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  /** 남은 시간 계산 기준 시각. 타이머가 필요한 순간에만 바꿔서 다시 그린다 */
  const [now, setNow] = useState(() => Date.now());

  // 진입·팝업 변경·로그인 변경 시 이 팝업의 유효한 체크인을 확인한다
  useEffect(() => {
    setLoaded(false);
    setExpiresAt(null);
    // 비로그인·세션 확인 중에는 화면이 인증 배너를 그리지 않는다
    if (authStatus !== 'signedIn') return;

    // 팝업·유저가 바뀐 뒤에 도착한 예전 응답은 버린다
    let cancelled = false;
    getActiveCheckin(popupId)
      .then((result) => {
        if (cancelled) return;
        // 확인에 실패해도 화면 전체를 오류로 만들지 않고 '인증 전'으로 둔다 (다시 인증하면 된다)
        setExpiresAt(result.ok && result.checkin ? Date.parse(result.checkin.expires_at) : null);
        setNow(Date.now());
        setLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        setExpiresAt(null);
        setLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [authStatus, userId, popupId]);

  // 남은 시간 타이머: 1분 단위 표시가 바뀌는 순간(또는 만료 순간)에 맞춰 한 번씩 다시 그린다
  useEffect(() => {
    if (expiresAt === null) return;

    const remaining = expiresAt - Date.now();
    if (remaining <= 0) {
      // 이미 지났는데 화면 기준 시각이 그 전이면 한 번 맞춰서 '인증 전'으로 바꾼다
      if (now < expiresAt) setNow(Date.now());
      return;
    }

    // 표시는 분 단위 올림이라, 남은 시간이 다음 '분 경계'를 지나는 순간에 바뀐다 (예: 1:42:00 → 1:41)
    const delay = remaining % MINUTE_MS || MINUTE_MS;
    const timer = window.setTimeout(() => setNow(Date.now()), delay);
    return () => window.clearTimeout(timer);
  }, [expiresAt, now]);

  // 백그라운드에 있던 동안 늦어진 타이머 대신, 화면이 다시 보일 때 바로 다시 계산한다
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') setNow(Date.now());
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  const apply = useCallback((checkin: Checkin) => {
    setExpiresAt(Date.parse(checkin.expires_at));
    // 기준 시각도 지금으로 맞춰야 인증 직후 '2:00'으로 보인다
    setNow(Date.now());
    setLoaded(true);
  }, []);

  const active = expiresAt !== null && now < expiresAt;

  return {
    status: loaded ? 'ready' : 'loading',
    active,
    remainingLabel: active ? formatRemaining(expiresAt - now) : null,
    apply,
  };
}

/* ------------------------------------------------------------------ */
/* 인증 모달 흐름                                                       */
/* ------------------------------------------------------------------ */

/**
 * 모달 단계 (pages/checkin-modal.md '단계별 화면')
 * gps ① 위치 확인 요청 / checking ② 확인 중 / done ③ 인증 완료 / out_of_range ④ 범위 밖 / denied ⑤ 권한 거부
 */
export type CheckinStep = 'gps' | 'checking' | 'done' | 'out_of_range' | 'denied';

/**
 * 모달을 닫고 토스트로 알릴 일
 * - failed: 위치를 못 찾음·시간 초과·위치 기능 없음·네트워크 등 그 밖의 오류
 * - popup_ended / popup_not_started: 화면을 연 사이 날짜가 바뀐 경우
 */
export type CheckinNotice = 'failed' | 'popup_ended' | 'popup_not_started';

interface CheckinFlowOptions {
  popupId: string;
  /** 인증 성공: 화면 상태에 반영 (모달은 '인증 완료' 단계로 바뀜) */
  onVerified: (checkin: Checkin) => void;
  /** 모달을 닫은 뒤 토스트로 알릴 때 */
  onNotice: (notice: CheckinNotice) => void;
}

export interface CheckinFlow {
  /** 열린 단계. 닫혀 있으면 null */
  step: CheckinStep | null;
  open: () => void;
  close: () => void;
  /** [위치 확인]: 위치 1회 조회 → 서버 판정 */
  locate: () => void;
}

export function useCheckinFlow({ popupId, onVerified, onNotice }: CheckinFlowOptions): CheckinFlow {
  const [step, setStep] = useState<CheckinStep | null>(null);
  /** 진행 중인 요청 번호. 닫거나 화면을 떠나면 올려서 늦게 온 응답을 버린다 */
  const runId = useRef(0);

  // 콜백이 바뀌어도 진행 중인 요청이 최신 콜백을 부르도록 ref 에 둔다
  const callbacks = useRef({ onVerified, onNotice });
  callbacks.current = { onVerified, onNotice };

  // 팝업이 바뀌거나 화면을 떠나면 모달을 닫고 진행 중인 요청의 응답을 버린다
  useEffect(() => {
    setStep(null);
    return () => {
      runId.current += 1;
    };
  }, [popupId]);

  const open = useCallback(() => setStep('gps'), []);

  const close = useCallback(() => {
    runId.current += 1;
    setStep(null);
  }, []);

  const locate = useCallback(async () => {
    // 같은 순간 두 번 눌러도 한 번만 진행한다
    if (step !== 'gps') return;
    runId.current += 1;
    const id = runId.current;
    setStep('checking');

    const located = await getCurrentPosition();
    if (id !== runId.current) return;
    if (!located.ok) {
      if (located.code === 'denied') {
        setStep('denied');
      } else {
        setStep(null);
        callbacks.current.onNotice('failed');
      }
      return;
    }

    const result = await checkIn(popupId, located.position).catch(() => null);
    if (id !== runId.current) return;

    if (result?.ok) {
      // 성공 응답을 받는 즉시 반영한다. 배너는 딤 뒤에서 바뀌고, 바깥 탭으로 닫아도 상태가 빠지지 않는다
      callbacks.current.onVerified(result.checkin);
      setStep('done');
      return;
    }
    if (result?.code === 'out_of_range') {
      setStep('out_of_range');
      return;
    }

    setStep(null);
    if (result?.code === 'popup_ended') callbacks.current.onNotice('popup_ended');
    else if (result?.code === 'popup_not_started') callbacks.current.onNotice('popup_not_started');
    else callbacks.current.onNotice('failed');
  }, [step, popupId]);

  return { step, open, close, locate };
}
