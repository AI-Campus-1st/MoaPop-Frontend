/**
 * 찜 목록 화면 (pages/stock-favorites.md) — 재고 확인 탭의 첫 화면
 * - 제목 줄: "찜한 팝업" + "N곳" + [편집]/[완료]
 * - 목록: 찜한 팝업 (진행 중 먼저, 종료는 맨 아래). 누르면 재고 확인(/stock/:popupId)
 * - 편집 중: 항목 오른쪽 휴지통 → 확인 모달 → 찜 해제
 * - 비로그인: 로그인 화면으로 보내지 않고 화면 안에서 안내 (DEV_RULES 2-6, 2-7)
 * 데이터는 useFavoritePopups (→ src/api/favorites.ts).
 * 라우트: /stock (App.tsx). 탭바는 App 의 탭 레이아웃이 그린다.
 */
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Lock, Trash } from '@phosphor-icons/react';
import type { FavoritePopup } from '../../api/types';
import { useRequireAuth } from '../../lib/auth/useRequireAuth';
import ButtonPrimary from '../../components/ButtonPrimary';
import ButtonText from '../../components/ButtonText';
import ConfirmModal from '../../components/ConfirmModal';
import EmptyState from '../../components/EmptyState';
import PopupListItem from '../../components/PopupListItem';
import Skeleton from '../../components/Skeleton';
import Toast from '../../components/Toast';
import { useFavoritePopups } from './useFavoritePopups';

const REMOVE_ERROR_MESSAGE = '찜 해제에 실패했어요. 다시 시도해 주세요';

/* ------------------------------------------------------------------ */
/* 화면 조각: 이 화면에서만 쓰므로 같은 파일에 둔다                      */
/* ------------------------------------------------------------------ */

interface FavoritesHeaderProps {
  /** 목록이 있을 때만 개수와 [편집]을 보여 준다 */
  count: number | null;
  editing: boolean;
  onToggleEdit: () => void;
}

/** 제목 줄: "찜한 팝업" + "N곳" + 오른쪽 [편집]/[완료] */
function FavoritesHeader({ count, editing, onToggleEdit }: FavoritesHeaderProps) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3">
      <div className="flex items-baseline gap-2">
        <h1 className="font-display text-title-md text-ink">찜한 팝업</h1>
        {count !== null && <span className="text-body-sm text-muted tabular-nums">{count}곳</span>}
      </div>
      {count !== null && (
        // 글자 버튼의 안쪽 여백만큼 당겨서 글자 끝을 목록 오른쪽 끝에 맞춘다
        <div className="-mr-3">
          <ButtonText onClick={onToggleEdit} ariaLabel={editing ? '편집 완료' : '찜 목록 편집'}>
            {editing ? '완료' : '편집'}
          </ButtonText>
        </div>
      )}
    </div>
  );
}

/** 로딩 중 목록 자리 (스켈레톤 3개, 찜 항목 높이 88px) */
function FavoritesSkeleton() {
  return (
    <div className="mt-4 flex flex-col gap-3" aria-busy="true" aria-label="불러오는 중">
      {[0, 1, 2].map((key) => (
        <Skeleton key={key} className="h-[88px]" />
      ))}
    </div>
  );
}

interface FavoritesListProps {
  items: FavoritePopup[];
  editing: boolean;
  onDelete: (item: FavoritePopup) => void;
}

/** 찜한 팝업 목록 */
function FavoritesList({ items, editing, onDelete }: FavoritesListProps) {
  return (
    <ul className="mt-4 flex flex-col gap-3" aria-label="찜한 팝업 목록">
      {items.map((item) => (
        <li key={item.popup.id}>
          <PopupListItem
            variant="favorite"
            popup={item.popup}
            to={`/stock/${item.popup.id}`}
            ended={item.isEnded}
            editing={editing}
            onDelete={() => onDelete(item)}
          />
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* 화면                                                                */
/* ------------------------------------------------------------------ */

export default function StockFavoritesPage() {
  const navigate = useNavigate();
  const requireAuth = useRequireAuth();
  const { state, remove } = useFavoritePopups();

  const [editing, setEditing] = useState(false);
  /** 확인 모달을 띄운 항목. null 이면 모달 닫힘 */
  const [pendingDelete, setPendingDelete] = useState<FavoritePopup | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);

  const items = state.status === 'done' ? state.items : [];
  const hasItems = items.length > 0;
  // 목록이 비면(마지막 하나를 해제) 편집 모드도 끝난 것으로 본다
  const isEditing = editing && hasItems;

  const goSearch = () => navigate('/search');

  // 로그인 후(또는 로그인 화면을 닫으면) 이 화면으로 돌아온다. 이어서 할 일은 없다
  const goLogin = () => {
    requireAuth();
  };

  const closeModal = useCallback(() => setPendingDelete(null), []);
  const closeToast = useCallback(() => setToast(null), []);

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;

    setDeleting(true);
    const ok = await remove(pendingDelete.popup.id);
    setDeleting(false);
    setPendingDelete(null);
    if (!ok) setToast({ id: Date.now(), message: REMOVE_ERROR_MESSAGE });
  };

  /** 상태별 본문 */
  const renderBody = () => {
    switch (state.status) {
      case 'loading':
        return <FavoritesSkeleton />;
      case 'signedOut':
        return (
          <EmptyState
            icon={Lock}
            title="재고를 확인하려면 로그인해 주세요"
            action={
              <ButtonPrimary fullWidth={false} onClick={goLogin}>
                로그인하기
              </ButtonPrimary>
            }
          />
        );
      case 'error':
        return (
          <EmptyState
            icon={Heart}
            title="찜 목록을 불러오지 못했어요"
            action={
              <ButtonPrimary fullWidth={false} onClick={goSearch}>
                팝업 검색하러 가기
              </ButtonPrimary>
            }
          />
        );
      case 'done':
        return hasItems ? (
          <FavoritesList items={items} editing={isEditing} onDelete={setPendingDelete} />
        ) : (
          <EmptyState
            icon={Heart}
            title="찜한 팝업이 없어요"
            action={
              <ButtonPrimary fullWidth={false} onClick={goSearch}>
                팝업 검색하러 가기
              </ButtonPrimary>
            }
          />
        );
    }
  };

  return (
    <main className="mx-auto max-w-[480px] px-4 pb-24 pt-6">
      <FavoritesHeader count={hasItems ? items.length : null} editing={isEditing} onToggleEdit={() => setEditing(!isEditing)} />

      {renderBody()}

      {pendingDelete && (
        <ConfirmModal
          icon={Trash}
          title="찜을 해제할까요?"
          description={pendingDelete.popup.name}
          confirmLabel="해제"
          onConfirm={handleConfirmDelete}
          onCancel={closeModal}
          loading={deleting}
        />
      )}

      {toast && <Toast key={toast.id} message={toast.message} variant="error" onClose={closeToast} />}
    </main>
  );
}
