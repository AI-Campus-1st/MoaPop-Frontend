/**
 * "내 최근 제보 내역" 섹션 (pages/my.md 4번)
 * 제목(꾹꾹체 title-md) → 상태별 본문.
 * - 로딩: 스켈레톤 3줄 / 실패: 빈 상태 "기록을 불러오지 못했어요" + [다시 시도]
 * - 0건: 빈 상태 "현장 인증 후 첫 제보를 남겨 보세요" (feedback.md)
 * - 목록: 전체 제보 최신순, 처음 5개 + [더보기] 5개씩 (사용자 결정 2026-10-16: 7일 기준 삭제, 더보기 B안)
 * 더보기에 성공하면 새로 펼쳐진 첫 줄로 포커스를 옮긴다(키보드·스크린리더가 이어서 읽게).
 * 사용처: MyPage
 */
import { useEffect, useRef } from 'react';
import { CaretDown, CircleNotch, Megaphone } from '@phosphor-icons/react';
import type { MyReport } from '../../api/types';
import ButtonPrimary from '../../components/ButtonPrimary';
import ButtonText from '../../components/ButtonText';
import EmptyState from '../../components/EmptyState';
import Skeleton from '../../components/Skeleton';
import ReportHistoryItem from './ReportHistoryItem';

interface ReportHistoryListProps {
  status: 'loading' | 'error' | 'done';
  items: MyReport[];
  hasMore: boolean;
  loadingMore: boolean;
  onRetry: () => void;
  /** 성공하면 true */
  onLoadMore: () => Promise<boolean>;
}

export default function ReportHistoryList({ status, items, hasMore, loadingMore, onRetry, onLoadMore }: ReportHistoryListProps) {
  /** 더보기 전 개수. 이 번호의 줄이 생기면 그 줄로 포커스를 옮긴다 (null 이면 옮길 일 없음) */
  const focusIndexRef = useRef<number | null>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  /** 더보기 실패 시 버튼으로 포커스를 돌려주려고 버튼을 감싼 영역 */
  const moreWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const index = focusIndexRef.current;
    if (index === null || index >= items.length) return;
    focusIndexRef.current = null;
    itemRefs.current[index]?.focus();
  }, [items.length]);

  const handleLoadMore = async () => {
    focusIndexRef.current = items.length;
    const ok = await onLoadMore();
    if (!ok) {
      focusIndexRef.current = null;
      // 요청 중 버튼이 비활성이라 포커스가 빠졌을 수 있다 → 다시 버튼으로
      moreWrapRef.current?.querySelector('button')?.focus();
    }
  };

  const renderBody = () => {
    if (status === 'loading') {
      return (
        <div className="mt-3 flex flex-col gap-3" aria-busy="true" aria-label="불러오는 중">
          {[0, 1, 2].map((key) => (
            <Skeleton key={key} className="h-[70px] rounded-md" />
          ))}
        </div>
      );
    }
    if (status === 'error') {
      return (
        <EmptyState
          icon={Megaphone}
          title="기록을 불러오지 못했어요"
          action={
            <ButtonPrimary fullWidth={false} onClick={onRetry}>
              다시 시도
            </ButtonPrimary>
          }
        />
      );
    }
    if (items.length === 0) {
      return <EmptyState icon={Megaphone} title="현장 인증 후 첫 제보를 남겨 보세요" />;
    }
    return (
      <>
        <ul className="mt-3 flex flex-col gap-3">
          {items.map((item, index) => (
            <li key={item.report.id}>
              <ReportHistoryItem
                item={item}
                ref={(element) => {
                  itemRefs.current[index] = element;
                }}
              />
            </li>
          ))}
        </ul>
        {hasMore && (
          <div ref={moreWrapRef} className="mt-2">
            <ButtonText fullWidth onClick={() => void handleLoadMore()} disabled={loadingMore}>
              {loadingMore ? (
                <>
                  <CircleNotch size={18} weight="bold" className="animate-spin text-ink motion-reduce:animate-none" aria-hidden />
                  <span className="sr-only">불러오는 중</span>
                </>
              ) : (
                <span className="flex items-center gap-1">
                  더보기
                  <CaretDown size={16} weight="regular" aria-hidden />
                </span>
              )}
            </ButtonText>
          </div>
        )}
      </>
    );
  };

  return (
    <section aria-labelledby="report-history-heading">
      <h2 id="report-history-heading" className="font-display text-title-md text-ink">
        내 최근 제보 내역
      </h2>
      {renderBody()}
    </section>
  );
}
