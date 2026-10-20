/**
 * 팝업 상세 데이터 불러오기 (팝업 정보 + 판매 굿즈)
 * 상태: loading → done | notFound(삭제됐거나 주소가 잘못된 팝업) | error
 * 사용처: PopupDetailPage
 */
import { useEffect, useState } from 'react';
import { getPopupDetail } from '../../api/popups';
import type { PopupDetail } from '../../api/types';

export type PopupDetailState =
  | { status: 'loading' }
  | { status: 'done'; detail: PopupDetail }
  | { status: 'notFound' }
  | { status: 'error' };

export function usePopupDetail(popupId: string): PopupDetailState {
  const [state, setState] = useState<PopupDetailState>({ status: 'loading' });

  useEffect(() => {
    // 다른 팝업으로 바뀐 뒤에 도착한 예전 응답은 버린다
    let cancelled = false;
    setState({ status: 'loading' });

    getPopupDetail(popupId)
      .then((detail) => {
        if (cancelled) return;
        setState(detail ? { status: 'done', detail } : { status: 'notFound' });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error' });
      });

    return () => {
      cancelled = true;
    };
  }, [popupId]);

  return state;
}
