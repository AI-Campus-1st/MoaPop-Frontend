/**
 * 확인 모달 (components/feedback.md 'confirm-modal')
 * 되돌릴 수 없는 동작 전에 한 번 묻는다. 아이콘 48px → 제목 → 보조 → [확인 버튼] + 아래 텍스트 [취소].
 * 틀(어두운 배경, 포커스 가두기·복귀, 스크롤 잠금, Esc·바깥 탭)은 공통 Modal 이 맡는다.
 * - [취소]·바깥 탭·Esc 로 닫는다. 요청 중(loading)에는 닫히지 않는다
 * 보이기/숨기기는 부모가 정한다(열 때만 그린다).
 * 사용처: StockFavoritesPage (찜 해제 확인)
 */
import { useId } from 'react';
import type { Icon } from '@phosphor-icons/react';
import ButtonPrimary from './ButtonPrimary';
import ButtonText from './ButtonText';
import Modal from './Modal';

interface ConfirmModalProps {
  icon: Icon;
  title: string;
  description?: string;
  /** 확인 버튼 글자. '예' 대신 동작 이름을 쓴다 (예: '해제') */
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** 요청 중: 확인 버튼 스피너, 취소·바깥 탭·Esc 막힘 */
  loading?: boolean;
}

export default function ConfirmModal({
  icon: IconComponent,
  title,
  description,
  confirmLabel,
  cancelLabel = '취소',
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmModalProps) {
  const titleId = useId();
  const descriptionId = useId();

  return (
    <Modal
      labelledBy={titleId}
      describedBy={description ? descriptionId : undefined}
      dismissible={!loading}
      onDismiss={onCancel}
    >
      <IconComponent size={48} weight="regular" className="text-ink" aria-hidden />
      {/* text-sku-name = banner-title 과 같은 크기 (17px/1.35) */}
      <h2 id={titleId} className="mt-3 text-sku-name font-bold text-ink">
        {title}
      </h2>
      {description && (
        <p id={descriptionId} className="mt-1 break-words text-body-sm text-muted">
          {description}
        </p>
      )}

      <div className="mt-6 flex w-full flex-col gap-2">
        <ButtonPrimary onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </ButtonPrimary>
        <ButtonText fullWidth onClick={onCancel} disabled={loading}>
          {cancelLabel}
        </ButtonText>
      </div>
    </Modal>
  );
}
