'use client';

import { useState, useCallback, useRef, useImperativeHandle, forwardRef } from 'react';

interface SearchBarProps {
  onSearch: (query: string) => void;
}

export interface SearchBarHandle {
  focus: () => void;
  clear: () => void;
}

export const SearchBar = forwardRef<SearchBarHandle, SearchBarProps>(function SearchBar({ onSearch }, ref) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    clear: () => {
      setQuery('');
      onSearch('');
    },
  }));

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    onSearch(value);
  }, [onSearch]);

  const handleClear = useCallback(() => {
    setQuery('');
    onSearch('');
  }, [onSearch]);

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 rounded-lg bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      <svg className="h-4 w-4 text-slate-400 ml-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={handleChange}
        placeholder="Search resources... (⌘K)"
        className="w-64 px-2 py-1.5 text-xs text-slate-700 dark:text-slate-200 bg-transparent outline-none placeholder:text-slate-300 dark:placeholder:text-slate-500"
      />
      {query && (
        <button
          onClick={handleClear}
          className="px-2 py-1.5 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
});
