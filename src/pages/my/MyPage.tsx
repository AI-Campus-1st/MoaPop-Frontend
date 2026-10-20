/**
 * MY 화면 (pages/my.md) — 하단 탭 'MY'
 * 위 → 아래: 제목 "마이페이지"(h1) → 프로필 카드(인사·포인트·칭호·진행바) → 통계 카드 2개 → 칭호 안내 → 내 최근 제보 내역 → [로그아웃]
 * - 제목은 찜 목록 "찜한 팝업"과 같은 꾹꾹체 title-md, 줄 높이 44px (사용자 결정 2026-10-16)
 * - 포인트·닉네임은 세션(useAuth)에서 바로 읽는다. 제보하면 같은 탭은 바로, 다른 탭은 storage 이벤트로 갱신된다.
 * - 제보·체크인 기록은 useMyRecords (→ src/api/reports.ts, checkins.ts)
 * - 로그아웃: 확인 모달 없이 /search 로 replace (사용자 결정 2026-10-16)
 * 라우트: /my (App.tsx, RequireAuth 로 감쌈 → 여기서는 세션이 항상 있다). 탭바는 App 의 탭 레이아웃이 그린다.
 */
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ButtonText from '../../components/ButtonText';
import Skeleton from '../../components/Skeleton';
import Toast from '../../components/Toast';
import { useAuth } from '../../lib/auth/AuthProvider';
import { formatClock, formatDayLabel } from '../../lib/format';
import { getTitle } from '../../lib/title';
import ProfileCard from './ProfileCard';
import ReportHistoryList from './ReportHistoryList';
import StatCard from './StatCard';
import TitleGuide from './TitleGuide';
import { useMyRecords, type MyRecordsState } from './useMyRecords';

const LOAD_MORE_ERROR_MESSAGE = '제보 내역을 불러오지 못했어요. 다시 시도해 주세요';
const STAT_ERROR_SUB = '불러오지 못했어요';

/** 통계 카드 2개. 로딩 중엔 스켈레톤, 실패면 '–' */
function StatCards({ state }: { state: MyRecordsState }) {
  if (state.status === 'loading') {
    return (
      <div className="grid grid-cols-2 gap-3" aria-busy="true" aria-label="불러오는 중">
        <Skeleton className="h-[104px]" />
        <Skeleton className="h-[104px]" />
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="내 제보 횟수" count={null} sub={STAT_ERROR_SUB} />
        <StatCard label="체류 인증 이력" count={null} sub={STAT_ERROR_SUB} />
      </div>
    );
  }

  const { records } = state;
  const latestReport = records.reports[0];
  const reportSub = latestReport
    ? `최근 제보 - ${formatDayLabel(latestReport.report.reported_at)} ${formatClock(latestReport.report.reported_at)}`
    : '아직 제보가 없어요';
  const checkinSub = records.latestCheckinPopupName ? `최근 팝업 - ${records.latestCheckinPopupName}` : '아직 인증한 팝업이 없어요';

  return (
    <div className="grid grid-cols-2 gap-3">
      <StatCard label="내 제보 횟수" count={records.reportTotal} sub={reportSub} />
      <StatCard label="체류 인증 이력" count={records.checkinTotal} sub={checkinSub} />
    </div>
  );
}

export default function MyPage() {
  const navigate = useNavigate();
  const { session, signOut } = useAuth();
  const { state, loadingMore, retry, loadMore } = useMyRecords();
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);

  const closeToast = useCallback(() => setToast(null), []);

  const handleLoadMore = useCallback(async () => {
    const ok = await loadMore();
    if (!ok) setToast({ id: Date.now(), message: LOAD_MORE_ERROR_MESSAGE });
    return ok;
  }, [loadMore]);

  const handleSignOut = () => {
    // 이동을 먼저 걸어 둔다. 순서가 반대면 RequireAuth 가 먼저 로그인 화면으로 보낸다
    navigate('/search', { replace: true });
    void signOut();
  };

  // RequireAuth 안이라 세션은 있지만, 로그아웃 직후 한 번 그려질 수 있어 막아 둔다
  if (!session) return null;

  const points = session.profile.total_points;
  const records = state.status === 'done' ? state.records : null;

  return (
    <main className="mx-auto flex max-w-[480px] flex-col gap-4 px-4 pb-[calc(96px+env(safe-area-inset-bottom))] pt-[calc(24px+env(safe-area-inset-top))]">
      <div className="flex min-h-11 items-center">
        <h1 className="font-display text-title-md text-ink">마이페이지</h1>
      </div>

      <ProfileCard nickname={session.profile.nickname} points={points} />

      <StatCards state={state} />

      <TitleGuide currentTitle={getTitle(points)} />

      <div className="mt-4">
        <ReportHistoryList
          status={state.status}
          items={records?.reports ?? []}
          hasMore={Boolean(records?.nextCursor)}
          loadingMore={loadingMore}
          onRetry={retry}
          onLoadMore={handleLoadMore}
        />
      </div>

      <div className="mt-4 flex justify-center">
        <ButtonText onClick={handleSignOut}>로그아웃</ButtonText>
      </div>

      {toast && <Toast key={toast.id} message={toast.message} variant="error" onClose={closeToast} />}
    </main>
  );
}
