import { useCallback, useEffect, useRef, useState } from 'react';
import { MapService } from '@/api/services/map/map.service';
import type { SuggestEntry } from '@/api/services/map/map.type';

interface MapSearchBarProps {
  onSearch: (query: string) => void;
  onSuggestSelect: (entry: SuggestEntry) => void;
}

export const MapSearchBar = ({ onSearch, onSuggestSelect }: MapSearchBarProps) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SuggestEntry[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 1) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    setIsLoading(true);
    try {
      const data = await MapService.suggestPlaces(q);
      setSuggestions(data);
      setShowSuggestions(data.length > 0);
    } catch {
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(value);
    }, 300);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setShowSuggestions(false);
    onSearch(query.trim());
  };

  const handleSuggestClick = (entry: SuggestEntry) => {
    setQuery(entry.place_name);
    setShowSuggestions(false);
    onSuggestSelect(entry);
  };

  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
  };

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div ref={containerRef} className='absolute top-[calc(0.75rem+env(safe-area-inset-top))] left-3 right-3 z-40'>
      <form onSubmit={handleSubmit} className='relative'>
        <div className='flex items-center rounded-xl border border-gray-200 bg-white shadow-md'>
          <svg
            className='ml-3 h-4 w-4 shrink-0 text-gray-400'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
            />
          </svg>
          <input
            type='text'
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            placeholder='장소 또는 주소 검색'
            className='w-full px-3 py-2.5 text-sm outline-none placeholder:text-gray-400'
          />
          {query && (
            <button
              type='button'
              onClick={handleClear}
              className='mr-2 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-200'
            >
              <svg className='h-3 w-3 text-gray-500' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
              </svg>
            </button>
          )}
          {isLoading && (
            <div className='mr-3 h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-gray-300 border-t-brand-primary' />
          )}
        </div>
      </form>

      {/* 자동완성 드롭다운 */}
      {showSuggestions && (
        <div className='mt-1 max-h-60 overflow-y-auto rounded-xl border border-gray-100 bg-white shadow-lg'>
          {suggestions.map((entry, idx) => (
            <button
              key={`${entry.place_name}-${idx}`}
              type='button'
              onClick={() => handleSuggestClick(entry)}
              className='flex w-full flex-col px-4 py-3 text-left hover:bg-gray-50 active:bg-gray-100'
            >
              <span className='text-sm font-medium text-gray-800'>
                {entry.place_name}
              </span>
              {entry.address && (
                <span className='mt-0.5 text-xs text-gray-500'>
                  {entry.address}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
