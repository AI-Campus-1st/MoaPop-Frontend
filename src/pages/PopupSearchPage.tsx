/**
 * 팝업 검색 화면 (pages/popup-search.md)
 * - 검색어 없음: 워드마크 → 제목 → 검색창 → 최근 검색어 → 실시간 제보 TOP3
 * - 검색어 있음: 워드마크 → 제목 → 검색창 → 검색 결과
 * 데이터는 src/api/popups.ts, 최근 검색어는 src/lib/recentSearches.ts 에서 가져온다.
 * 최근 검색어는 계정별로 따로 보인다. 로그인 상태는 useAuth()(src/lib/auth/AuthProvider.tsx)로 확인한다.
 * 라우트: /search (App.tsx). 탭바는 App 의 탭 레이아웃이 그린다.
 */
import { useCallback, useEffect, useState } from 'react';
import { MagnifyingGlass } from '@phosphor-icons/react';
import { getTopReportedPopups, searchPopups } from '../api/popups';
import type { Popup, TopReportedPopup } from '../api/types';
import { useAuth } from '../lib/auth/AuthProvider';
import { addRecentSearch, getRecentSearches, removeRecentSearch } from '../lib/recentSearches';
import EmptyState from '../components/EmptyState';
import PopupListItem from '../components/PopupListItem';
import RecentSearchChip from '../components/RecentSearchChip';
import SearchInput from '../components/SearchInput';
import Skeleton from '../components/Skeleton';
import Toast from '../components/Toast';
import Top3Header from '../components/Top3Header';

/** 입력이 멈추고 이만큼 지나면 검색한다 (글자마다 요청하지 않도록) */
const SEARCH_DEBOUNCE_MS = 250;
const SEARCH_ERROR_MESSAGE = '검색에 실패했어요. 다시 시도해 주세요';

type LoadStatus = 'loading' | 'done' | 'error';

/* ------------------------------------------------------------------ */
/* 화면 조각: 이 화면에서만 쓰므로 같은 파일에 둔다                      */
/* ------------------------------------------------------------------ */

/** 로딩 중 목록 자리 (스켈레톤 3개) */
function ListSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="불러오는 중">
      {[0, 1, 2].map((key) => (
        <Skeleton key={key} className="h-[72px]" />
      ))}
    </div>
  );
}

interface RecentSearchRowProps {
  keywords: string[];
  onSelect: (keyword: string) => void;
  onRemove: (keyword: string) => void;
}

/** 최근 검색어 줄. 기록이 없으면 줄 자체를 그리지 않는다 */
function RecentSearchRow({ keywords, onSelect, onRemove }: RecentSearchRowProps) {
  if (keywords.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2" aria-label="최근 검색어">
      {keywords.map((keyword) => (
        <RecentSearchChip key={keyword} keyword={keyword} onSelect={onSelect} onRemove={onRemove} />
      ))}
    </div>
  );
}

interface Top3SectionProps {
  status: LoadStatus;
  items: TopReportedPopup[];
}

/** 실시간 제보 TOP3. 제보가 하나도 없거나 불러오지 못하면 안내 문구만 둔다 */
function Top3Section({ status, items }: Top3SectionProps) {
  if (status === 'loading') {
    return (
      <section className="mt-8">
        <ListSkeleton />
      </section>
    );
  }

  if (items.length === 0) {
    return <p className="mt-8 text-center text-body-sm text-muted">팝업 이름으로 검색해 보세요</p>;
  }

  return (
    <section className="mt-8" aria-label="실시간 제보 TOP3">
      <Top3Header />
      <ol className="mt-3 flex flex-col gap-3">
        {items.map((item, index) => (
          <li key={item.popup.id}>
            <PopupListItem popup={item.popup} rank={index + 1} reportCount={item.reportCount} />
          </li>
        ))}
      </ol>
    </section>
  );
}

interface SearchResultSectionProps {
  isLoading: boolean;
  status: LoadStatus;
  results: Popup[];
  onSelectResult: () => void;
}

/** 검색 결과 목록. 실패 시에는 토스트만 띄우고 목록 자리는 비운다 */
function SearchResultSection({ isLoading, status, results, onSelectResult }: SearchResultSectionProps) {
  if (isLoading) {
    return (
      <section className="mt-6">
        <ListSkeleton />
      </section>
    );
  }

  if (status === 'error') return null;

  if (results.length === 0) {
    return <EmptyState icon={MagnifyingGlass} title="검색 결과가 없어요" description="다른 이름으로 검색해 보세요" />;
  }

  return (
    <section className="mt-6" aria-label="검색 결과">
      <ul className="flex flex-col gap-3">
        {results.map((popup) => (
          <li key={popup.id}>
            <PopupListItem popup={popup} onSelect={onSelectResult} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 화면                                                                */
/* ------------------------------------------------------------------ */

export default function PopupSearchPage() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const { status: authStatus, session } = useAuth();
  /** 최근 검색어 주인. 비로그인이면 null(비로그인 기록) */
  const ownerId = session?.user_id ?? null;
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const [top3, setTop3] = useState<TopReportedPopup[]>([]);
  const [top3Status, setTop3Status] = useState<LoadStatus>('loading');

  const [results, setResults] = useState<Popup[]>([]);
  const [searchStatus, setSearchStatus] = useState<LoadStatus>('done');

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const trimmedQuery = query.trim();
  const isSearching = trimmedQuery !== '';

  // TOP3: 화면에 들어올 때 한 번 불러온다
  useEffect(() => {
    let cancelled = false;
    getTopReportedPopups()
      .then((items) => {
        if (cancelled) return;
        setTop3(items);
        setTop3Status('done');
      })
      .catch(() => {
        if (!cancelled) setTop3Status('error');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 최근 검색어: 세션 확인이 끝나면 그 사람의 기록을 읽는다.
  // 로그인·로그아웃(다른 탭 포함)으로 사람이 바뀌면 다시 읽는다. 확인 중에는 누구 것인지 몰라 비워 둔다
  useEffect(() => {
    setRecentSearches(authStatus === 'loading' ? [] : getRecentSearches(ownerId));
  }, [authStatus, ownerId]);

  // 입력이 멈춘 뒤에만 검색어를 확정한다
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(trimmedQuery), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [trimmedQuery]);

  // 확정된 검색어로 검색. 응답이 늦게 와도 이전 검색어의 결과가 덮어쓰지 않도록 cancelled 로 막는다
  useEffect(() => {
    if (!debouncedQuery) return;

    let cancelled = false;
    setSearchStatus('loading');
    searchPopups(debouncedQuery)
      .then((items) => {
        if (cancelled) return;
        setResults(items);
        setSearchStatus('done');
      })
      .catch(() => {
        if (cancelled) return;
        setResults([]);
        setSearchStatus('error');
        setToastMessage(SEARCH_ERROR_MESSAGE);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  const saveRecent = useCallback(
    (keyword: string) => {
      // 세션 확인 중에는 누구의 기록에 넣을지 몰라 저장하지 않는다
      if (authStatus === 'loading') return;
      setRecentSearches(addRecentSearch(ownerId, keyword));
    },
    [authStatus, ownerId],
  );

  const handleSelectRecent = useCallback(
    (keyword: string) => {
      setQuery(keyword);
      saveRecent(keyword);
    },
    [saveRecent],
  );

  const handleRemoveRecent = useCallback(
    (keyword: string) => {
      setRecentSearches(removeRecentSearch(ownerId, keyword));
    },
    [ownerId],
  );

  const closeToast = useCallback(() => setToastMessage(null), []);

  // 입력값이 아직 확정 전(디바운스 대기)이어도 로딩으로 보여 결과 없음이 깜빡이지 않게 한다
  const isResultLoading = searchStatus === 'loading' || debouncedQuery !== trimmedQuery;

  return (
    <main className="mx-auto max-w-[480px] px-4 pb-24 pt-6">
      <p className="font-display text-title-md text-ink">모아팝</p>
      <h1 className="mt-2 font-display text-display-md text-ink">어느 팝업에 가세요?</h1>

      <div className="mt-5">
        <SearchInput value={query} onChange={setQuery} onSubmit={saveRecent} onClear={() => setQuery('')} />
      </div>

      {isSearching ? (
        <SearchResultSection
          isLoading={isResultLoading}
          status={searchStatus}
          results={results}
          onSelectResult={() => saveRecent(trimmedQuery)}
        />
      ) : (
        <>
          <RecentSearchRow keywords={recentSearches} onSelect={handleSelectRecent} onRemove={handleRemoveRecent} />
          <Top3Section status={top3Status} items={top3} />
        </>
      )}

      {toastMessage && <Toast message={toastMessage} variant="error" onClose={closeToast} />}
    </main>
  );
}
