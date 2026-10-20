/**
 * 팝업 목록 항목 (components/popup-list.md 'popup-list-item', 'popup-list-item-favorite')
 * 흰 카드 한 장이 항목 하나다. 변형은 variant 로 고른다.
 * - default (생략 가능): 검색 결과·TOP3. 항목 전체가 링크, 누르면 팝업 상세(/popups/:id)로 이동
 *   · TOP3: rank, reportCount 를 넘기면 왼쪽 순위 뱃지 + 아래 '제보 N건'
 * - favorite: 찜 목록. 왼쪽 썸네일, 누르면 to(재고 확인)로 이동. 종료된 팝업은 흐리게 + '종료' 라벨
 *   · editing: 링크 대신 일반 카드가 되고, CaretRight 자리에 휴지통(찜 해제) 버튼이 온다
 * 사용처: PopupSearchPage (default), StockFavoritesPage (favorite)
 */
import { Link } from 'react-router-dom';
import { CaretRight, Storefront, Trash } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import type { Popup } from '../api/types';
import { formatPeriod } from '../lib/format';
import ImageFallback from './ImageFallback';
import RankBadge from './RankBadge';

interface DefaultItemProps {
  variant?: 'default';
  popup: Popup;
  rank?: number;
  reportCount?: number;
  /** 이동 직전에 할 일 (예: 최근 검색어 저장) */
  onSelect?: () => void;
}

interface FavoriteItemProps {
  variant: 'favorite';
  popup: Popup;
  /** 누르면 갈 주소 (찜 목록에서는 /stock/:popupId) */
  to: string;
  /** 종료된 팝업이면 흐리게 + '종료' 라벨 */
  ended: boolean;
  /** 편집 중이면 이동하지 않고 휴지통 버튼을 보여 준다 */
  editing?: boolean;
  /** 휴지통을 눌렀을 때 (편집 중에만 쓰임) */
  onDelete?: () => void;
}

/** variant 값으로 쓸 수 있는 props 가 갈린다 (순위 뱃지와 썸네일이 함께 오지 않도록) */
type PopupListItemProps = DefaultItemProps | FavoriteItemProps;

/** 카드 겉모양: 흰 면 + hairline 테두리 + 곡률 lg, 최소 높이 72px */
const CARD_CLASS = 'flex min-h-[72px] items-center gap-3 rounded-lg border border-hairline bg-card p-4';
const LINK_FOCUS_CLASS = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-deep';

/** 오른쪽 끝 이동 표시 */
function TrailingCaret() {
  return <CaretRight size={20} weight="regular" className="shrink-0 text-muted" aria-hidden />;
}

/** 팝업명 + 장소 · 기간 두 줄. 종료된 팝업은 글자를 흐리게 하고 이름 옆에 '종료' 라벨 */
function PopupText({ popup, ended = false, children }: { popup: Popup; ended?: boolean; children?: ReactNode }) {
  const period = formatPeriod(popup.start_date, popup.end_date);

  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-1.5">
        <p className={`min-w-0 truncate text-sku-name font-bold ${ended ? 'text-disabled-text' : 'text-ink'}`}>{popup.name}</p>
        {ended && (
          // ended-label: 흐린 항목 안에서도 읽히도록 muted
          <span className="flex h-[22px] shrink-0 items-center rounded-full bg-surface px-2 text-caption font-medium text-muted">
            종료
          </span>
        )}
      </div>
      <p className={`truncate text-body-sm ${ended ? 'text-disabled-text' : 'text-muted'}`}>
        {popup.place_name} · {period}
      </p>
      {children}
    </div>
  );
}

/** 검색 결과·TOP3 항목: 카드 전체가 팝업 상세 링크 */
function DefaultItem({ popup, rank, reportCount, onSelect }: DefaultItemProps) {
  return (
    <Link to={`/popups/${popup.id}`} onClick={onSelect} className={`${CARD_CLASS} ${LINK_FOCUS_CLASS}`}>
      {rank !== undefined && <RankBadge rank={rank} />}

      <PopupText popup={popup}>
        {reportCount !== undefined && (
          // popup-report-count: 숫자만 number-md, 나머지는 caption
          <p className="mt-1 text-caption font-medium text-ink">
            제보 <span className="text-number-md font-bold tabular-nums">{reportCount}</span>건
          </p>
        )}
      </PopupText>

      <TrailingCaret />
    </Link>
  );
}

/** 찜 목록 항목: 평소에는 카드 전체가 링크, 편집 중에는 일반 카드 + 휴지통 버튼 */
function FavoriteItem({ popup, to, ended, editing = false, onDelete }: FavoriteItemProps) {
  const body = (
    <>
      {/* 썸네일은 꾸밈이다. 팝업명이 바로 옆에 있어 스크린리더가 이름을 두 번 읽지 않게 숨긴다 */}
      <div aria-hidden className="shrink-0">
        <ImageFallback
          src={popup.image_url}
          alt=""
          fallbackIcon={Storefront}
          fallbackIconSize={24}
          className={`h-14 w-14 rounded-md ${ended ? 'opacity-50' : ''}`}
        />
      </div>
      <PopupText popup={popup} ended={ended} />
    </>
  );

  // 편집 중: 링크 안에 버튼을 넣을 수 없으므로(눌리는 요소 중첩 금지) 카드를 일반 요소로 바꾼다
  if (editing) {
    return (
      <div className={CARD_CLASS}>
        {body}
        <button
          type="button"
          onClick={onDelete}
          aria-label={`${popup.name} 찜 해제`}
          className="-my-2 -mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink active:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-deep"
        >
          <Trash size={22} weight="regular" aria-hidden />
        </button>
      </div>
    );
  }

  return (
    <Link to={to} className={`${CARD_CLASS} ${LINK_FOCUS_CLASS}`}>
      {body}
      <TrailingCaret />
    </Link>
  );
}

export default function PopupListItem(props: PopupListItemProps) {
  return props.variant === 'favorite' ? <FavoriteItem {...props} /> : <DefaultItem {...props} />;
}
