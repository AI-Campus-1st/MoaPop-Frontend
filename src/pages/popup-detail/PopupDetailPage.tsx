/**
 * 팝업 상세 화면 (pages/popup-detail.md, DEV_RULES 2-5)
 * 위 → 아래: 대표 이미지(뒤로가기 · 찜 하트) → 팝업명 → 장소·기간·운영 시간 → 소개 글 → 판매 굿즈 → 하단 고정 바
 *
 * 찜 규칙
 * - 하트: 찜 추가/해제만, 화면 그대로, 토스트 없음 (2026-10-15 결정). 실패하면 원래 상태 그대로.
 * - 하단 버튼: 미찜이면 [찜하고 재고 확인하기] → 찜 저장 → /stock/:popupId, 찜함이면 [재고 확인하기] → 바로 이동.
 *   찜 실패 시에만 오류 토스트.
 * - 종료된 팝업: 찜 불가. 미찜 상태에서 하트·하단 버튼을 누르면 "팝업이 종료되었어요" (로그인 요구보다 먼저).
 *   이미 찜해 둔 경우 해제와 재고 확인 이동은 된다.
 * - 비로그인: useRequireAuth 로 로그인 화면에 보내고, 돌아오면 할 일(authIntent)을 이어서 실행한다.
 *
 * 라우트: /popups/:popupId (App.tsx, 탭바 없음). 데이터는 usePopupDetail · useFavorite 가 src/api 를 거쳐 가져온다.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { CaretLeft, Heart, Storefront } from '@phosphor-icons/react';
import { isPopupEnded } from '../../api/popups';
import type { FavoriteResult } from '../../api/types';
import { useAuth } from '../../lib/auth/AuthProvider';
import { DEFAULT_RETURN_PATH, readAuthIntent } from '../../lib/auth/redirect';
import { useRequireAuth } from '../../lib/auth/useRequireAuth';
import BottomActionBar from '../../components/BottomActionBar';
import ButtonPrimary from '../../components/ButtonPrimary';
import EmptyState from '../../components/EmptyState';
import HeaderIconButton from '../../components/HeaderIconButton';
import ImageFallback from '../../components/ImageFallback';
import { useOfficialImage } from '../../lib/useOfficialImage';
import OverlayIconButton from '../../components/OverlayIconButton';
import Toast from '../../components/Toast';
import PopupDetailSkeleton from './PopupDetailSkeleton';
import PopupInfoRows from './PopupInfoRows';
import SkuPreviewList from './SkuPreviewList';
import { usePopupDetail } from './usePopupDetail';
import { useFavorite } from './useFavorite';

const ENDED_MESSAGE = '팝업이 종료되었어요';
const FAVORITE_FAILED_MESSAGE = '찜에 실패했어요. 다시 시도해 주세요';

/** 같은 문구가 연달아 떠도 토스트가 새로 3초를 세도록 id 를 붙인다 */
interface ToastState {
  id: number;
  message: string;
  variant: 'default' | 'error';
}

/**
 * 앱 안에 뒤로 갈 기록이 있는지.
 * BrowserRouter 는 history.state.idx 에 앱 안 기록 순번을 남기고, replace 해도 순번이 유지된다.
 * (주소를 직접 열었다가 로그인을 거쳐 돌아온 경우 location.key 로는 구분이 안 돼서 이 값을 본다)
 */
function canGoBackInApp(): boolean {
  const state: unknown = window.history.state;
  return typeof state === 'object' && state !== null && 'idx' in state && typeof state.idx === 'number' && state.idx > 0;
}

export default function PopupDetailPage() {
  const { popupId = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { status: authStatus } = useAuth();
  const requireAuth = useRequireAuth();
  const detailState = usePopupDetail(popupId);
  const favorite = useFavorite(popupId);

  const [ctaLoading, setCtaLoading] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  // 찜 요청 중에 화면을 떠났으면, 응답이 와도 재고 화면으로 끌고 가지 않는다
  const mountedRef = useRef(false);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const showToast = useCallback((message: string, variant: ToastState['variant'] = 'default') => {
    setToast({ id: Date.now(), message, variant });
  }, []);
  const closeToast = useCallback(() => setToast(null), []);

  const popup = detailState.status === 'done' ? detailState.detail.popup : null;
  const ended = popup ? isPopupEnded(popup) : false;
  // 대표 이미지: image_url → 공식 게시물 이미지 → 대체 아이콘 순. Hook 이라 아래 조기 반환보다 먼저 부른다
  const heroSrc = useOfficialImage('popup', popup?.id ?? null, popup?.image_url ?? '');
  const stockPath = `/stock/${popupId}`;

  /** 하단 버튼의 찜 저장 → 성공하면 재고 확인으로 이동(push), 실패하면 토스트 */
  const addAndGoStock = useCallback(async () => {
    setCtaLoading(true);
    const result: FavoriteResult = await favorite.add();
    if (!mountedRef.current) return;
    setCtaLoading(false);

    if (result.ok) navigate(stockPath);
    else if (result.code === 'popup_ended') showToast(ENDED_MESSAGE);
    else showToast(FAVORITE_FAILED_MESSAGE, 'error');
  }, [favorite.add, navigate, stockPath, showToast]);

  /** 하트로 찜 추가. 실패하면 하트를 그대로 두고, 종료된 팝업일 때만 안내한다 */
  const addFromHeart = useCallback(async () => {
    const result = await favorite.add();
    if (mountedRef.current && !result.ok && result.code === 'popup_ended') showToast(ENDED_MESSAGE);
  }, [favorite.add, showToast]);

  /* ---------------------------------------------------------------- */
  /* 로그인 후 돌아왔을 때 할 일 이어서 실행                             */
  /* ---------------------------------------------------------------- */
  const intent = readAuthIntent(location.state);
  const resumedRef = useRef(false);

  useEffect(() => {
    if (!intent || resumedRef.current) return;
    if (detailState.status === 'loading' || authStatus !== 'signedIn') return;
    // 개발 모드(StrictMode)에서 effect 가 두 번 돌아도 한 번만 실행한다
    resumedRef.current = true;

    // 기록에서 할 일을 지운다. 뒤로 가기·새로고침으로 이 화면에 다시 와도 또 실행되지 않게 (브라우저는 새로고침해도 state 를 유지)
    navigate(
      { pathname: location.pathname, search: location.search, hash: location.hash },
      { replace: true, state: null },
    );

    // 없는 팝업·불러오기 실패면 할 일이 없다
    if (detailState.status !== 'done') return;

    // 이미 찜해 둔 팝업이어도 add 는 성공으로 돌아온다(중복 저장 없음)
    if (intent === 'favorite') void addFromHeart();
    else if (intent === 'favorite-and-stock') void addAndGoStock();
  }, [intent, detailState.status, authStatus, navigate, location, addFromHeart, addAndGoStock]);

  /* ---------------------------------------------------------------- */
  /* 버튼 처리                                                          */
  /* ---------------------------------------------------------------- */

  /** 뒤로가기: 앱 안 기록이 있으면 한 칸 뒤로, 주소를 직접 열었으면 팝업 검색으로 */
  const handleBack = () => {
    if (canGoBackInApp()) navigate(-1);
    else navigate(DEFAULT_RETURN_PATH, { replace: true });
  };

  const handleHeart = () => {
    // 찜 여부 확인 중이거나 요청 중이면 무시 (잘못된 방향으로 토글되는 것과 중복 탭 방지)
    if (!popup || favorite.checking || favorite.busy || ctaLoading) return;

    if (favorite.isFavorite) {
      // 해제는 종료된 팝업도 가능. 실패하면 하트가 그대로 남는다
      void favorite.remove();
      return;
    }
    // 종료 안내가 로그인 요구보다 먼저: 로그인해도 찜할 수 없으므로
    if (ended) {
      showToast(ENDED_MESSAGE);
      return;
    }
    if (!requireAuth('favorite')) return;
    void addFromHeart();
  };

  const handleCta = () => {
    if (!popup || favorite.busy || ctaLoading) return;

    if (favorite.isFavorite) {
      navigate(stockPath);
      return;
    }
    if (ended) {
      showToast(ENDED_MESSAGE);
      return;
    }
    if (!requireAuth('favorite-and-stock')) return;
    void addAndGoStock();
  };

  /* ---------------------------------------------------------------- */
  /* 화면                                                              */
  /* ---------------------------------------------------------------- */

  if (detailState.status === 'notFound' || detailState.status === 'error') {
    return (
      <main className="mx-auto max-w-[480px] px-4 pt-[calc(8px+env(safe-area-inset-top))]">
        <HeaderIconButton icon={CaretLeft} label="뒤로 가기" onClick={handleBack} />
        <EmptyState
          icon={Storefront}
          title={detailState.status === 'notFound' ? '팝업을 찾을 수 없어요' : '팝업 정보를 불러오지 못했어요'}
          action={
            <ButtonPrimary fullWidth={false} onClick={() => navigate(DEFAULT_RETURN_PATH, { replace: true })}>
              팝업 검색하러 가기
            </ButtonPrimary>
          }
        />
      </main>
    );
  }

  return (
    <>
      {/* 아래 패딩: 하단 고정 바(76px + safe-area) + 여유 24px */}
      <main className="mx-auto max-w-[480px] pb-[calc(100px+env(safe-area-inset-bottom))]">
        <div className="relative">
          {popup ? (
            <ImageFallback
              src={heroSrc}
              alt={`${popup.name} 대표 이미지`}
              fallbackIcon={Storefront}
              fallbackIconSize={48}
              className="aspect-[4/3] w-full"
            />
          ) : (
            <PopupDetailSkeleton />
          )}

          {/* 사진 위 버튼: 상태바(safe-area) 아래로 8px. 로딩 중에도 뒤로가기는 누를 수 있다 */}
          <div className="absolute inset-x-0 top-[calc(8px+env(safe-area-inset-top))] flex justify-between px-2">
            <OverlayIconButton icon={CaretLeft} label="뒤로 가기" onClick={handleBack} />
            {popup && (
              <OverlayIconButton
                icon={Heart}
                label="찜"
                pressed={favorite.isFavorite}
                weight={favorite.isFavorite ? 'fill' : 'regular'}
                iconClassName={favorite.isFavorite ? 'text-brand-deep' : 'text-ink'}
                onClick={handleHeart}
              />
            )}
          </div>
        </div>

        {popup && detailState.status === 'done' && (
          <div className="px-4 pt-5">
            {/* 팝업 이름은 바뀌는 글자라 꾹꾹체가 아닌 Pretendard (크기만 display-md) */}
            <h1 className="text-display-md font-bold text-ink">{popup.name}</h1>
            <div className="mt-3">
              <PopupInfoRows popup={popup} />
            </div>

            <hr className="my-5 border-hairline" />

            <p className="whitespace-pre-line text-body-md text-ink">{popup.description}</p>

            <div className="mt-8">
              <SkuPreviewList skus={detailState.detail.skus} />
            </div>
          </div>
        )}
      </main>

      {popup && (
        <BottomActionBar>
          <ButtonPrimary onClick={handleCta} loading={ctaLoading}>
            {favorite.isFavorite ? '재고 확인하기' : '찜하고 재고 확인하기'}
          </ButtonPrimary>
        </BottomActionBar>
      )}

      {toast && (
        <Toast
          key={toast.id}
          message={toast.message}
          variant={toast.variant}
          placement="above-bottom-bar"
          onClose={closeToast}
        />
      )}
    </>
  );
}
