/**
 * 검색창 (components/controls.md 'search-input')
 * 알약형 입력, 왼쪽 돋보기, 입력 중에만 오른쪽 지우기(X).
 * 엔터(모바일 키보드 '검색')를 누르면 onSubmit 을 호출한다.
 * 사용처: PopupSearchPage
 */
import type { FormEvent } from 'react';
import { MagnifyingGlass, X } from '@phosphor-icons/react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  onClear: () => void;
}

export default function SearchInput({ value, onChange, onSubmit, onClear }: SearchInputProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(value);
  };

  return (
    <form
      role="search"
      onSubmit={handleSubmit}
      className="flex h-[52px] items-center gap-2 rounded-full border-[1.5px] border-hairline bg-card pl-5 pr-1 focus-within:ring-2 focus-within:ring-brand-deep"
    >
      <MagnifyingGlass size={20} weight="regular" className="shrink-0 text-muted" aria-hidden />
      <input
        type="search"
        enterKeyHint="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="팝업 이름으로 검색"
        aria-label="팝업 이름으로 검색"
        className="h-full min-w-0 flex-1 bg-transparent text-body-md text-ink placeholder:text-muted focus:outline-none"
      />
      {value && (
        <button
          type="button"
          onClick={onClear}
          aria-label="검색어 지우기"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted"
        >
          <X size={18} weight="bold" aria-hidden />
        </button>
      )}
    </form>
  );
}
