/**
 * 현장 인증 모달 (pages/checkin-modal.md, components/checkin.md 'checkin-modal-gps' · '-done' · '-fail')
 * 틀은 공통 Modal(feedback.md 'modal'). 단계(step)에 따라 아이콘·문구·버튼만 바꾼다.
 * - ① gps: [위치 확인] + [취소], 바깥 탭·Esc 로 닫힘
 * - ② checking: [위치 확인] 스피너·비활성, [취소] 숨김, 닫히지 않음
 * - ③ done / ④ out_of_range / ⑤ denied: [확인] 하나. 바깥 탭·Esc 도 [확인]과 같다
 * 단계 바꾸기·위치 조회는 useCheckinFlow 가 한다. 이 컴포넌트는 그리기만 한다.
 * 사용처: StockGridPage
 */
import { useId } from 'react';
import type { RefObject } from 'react';
import { MapPin, SealCheck, Warning } from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import ButtonPrimary from '../../components/ButtonPrimary';
import ButtonText from '../../components/ButtonText';
import Modal from '../../components/Modal';
import type { CheckinStep } from './useCheckin';

interface StepContent {
  icon: Icon;
  iconClass: string;
  title: string;
  description: string;
}

/** 단계별 아이콘·문구 (checkin-modal.md 표). ②는 ①과 같은 내용 */
function getContent(step: CheckinStep, popupName: string): StepContent {
  switch (step) {
    case 'gps':
    case 'checking':
      return {
        icon: MapPin,
        iconClass: 'text-brand-deep',
        title: '현재 위치를 확인할게요',
        description: '팝업 반경 500m 안에 있어야 해요',
      };
    case 'done':
      return {
        icon: SealCheck,
        iconClass: 'text-brand-deep',
        title: '인증되었습니다',
        description: `${popupName} · 2시간 동안 제보할 수 있어요`,
      };
    case 'out_of_range':
      return {
        icon: Warning,
        iconClass: 'text-soldout-deep',
        title: '팝업 반경 500m 밖이에요',
        description: '팝업 근처에서 다시 시도해 주세요',
      };
    case 'denied':
      return {
        icon: Warning,
        iconClass: 'text-soldout-deep',
        title: '위치 권한이 꺼져 있어요',
        description: '브라우저 설정에서 위치 권한을 허용해 주세요',
      };
  }
}

interface CheckinModalProps {
  step: CheckinStep;
  popupName: string;
  /** ① [위치 확인] */
  onLocate: () => void;
  /** [취소]·[확인]·바깥 탭·Esc */
  onClose: () => void;
  /** 인증 성공으로 [인증하기]가 사라졌을 때 닫힌 뒤 포커스를 줄 곳 (인증 배너) */
  returnFocusFallback: RefObject<HTMLElement>;
}

export default function CheckinModal({ step, popupName, onLocate, onClose, returnFocusFallback }: CheckinModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const { icon: IconComponent, iconClass, title, description } = getContent(step, popupName);
  const asking = step === 'gps' || step === 'checking';
  const checking = step === 'checking';

  return (
    <Modal
      labelledBy={titleId}
      describedBy={descriptionId}
      dismissible={!checking}
      onDismiss={onClose}
      // 단계마다 포커스를 다시 잡는다. ②는 누를 버튼이 없어(잠긴 버튼은 포커스를 잃음) 모달 자체에 둔다
      focusKey={step}
      returnFocusFallback={returnFocusFallback}
    >
      <IconComponent size={48} weight="fill" className={iconClass} aria-hidden />
      {/* text-sku-name = banner-title 과 같은 크기 (17px/1.35) */}
      <h2 id={titleId} className="mt-3 text-sku-name font-bold text-ink">
        {title}
      </h2>
      <p id={descriptionId} className="mt-1 break-words text-body-sm text-muted">
        {description}
      </p>

      <div className="mt-6 flex w-full flex-col gap-2">
        {asking ? (
          <>
            {/* 확인 중에는 스피너만 보이고, 스크린리더는 '확인 중…'을 읽는다 */}
            <ButtonPrimary onClick={onLocate} loading={checking}>
              {checking ? '확인 중…' : '위치 확인'}
            </ButtonPrimary>
            {!checking && (
              <ButtonText fullWidth onClick={onClose}>
                취소
              </ButtonText>
            )}
          </>
        ) : (
          <ButtonPrimary onClick={onClose}>확인</ButtonPrimary>
        )}
      </div>
    </Modal>
  );
}
