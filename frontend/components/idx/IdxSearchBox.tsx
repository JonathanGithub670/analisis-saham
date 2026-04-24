"use client";

import { useState, useEffect, useRef } from "react";
import { idxApi, type IdxSearchResult } from "@/services/idxApi";

interface Props {
  onSelect: (symbol: string, name: string) => void;
}

export default function IdxSearchBox({ onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<IdxSearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.length < 1) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await idxApi.search(query);
        setResults(data);
        setIsOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [query]);

  const handleSelect = (item: IdxSearchResult) => {
    setQuery("");
    setIsOpen(false);
    onSelect(item.symbol, item.name);
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative">
        <svg
          className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari saham Indonesia... (cth: BBCA, TLKM, Bank BCA)"
          className="w-full h-12 pl-12 pr-4 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
        />
        {loading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-theme-lg z-50 max-h-[400px] overflow-y-auto dark:bg-gray-900 dark:border-gray-800">
          {results.map((item, i) => (
            <button
              key={`${item.symbol}-${i}`}
              onClick={() => handleSelect(item)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-100 last:border-0 dark:hover:bg-white/5 dark:border-gray-800"
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                item.isIDX
                  ? "bg-brand-50 dark:bg-brand-500/10"
                  : "bg-gray-100 dark:bg-gray-800"
              }`}>
                <span className={`text-xs font-bold ${
                  item.isIDX ? "text-brand-500" : "text-gray-500"
                }`}>
                  {item.symbol.replace(".JK", "").substring(0, 4)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-800 dark:text-white/90 truncate">
                    {item.symbol}
                  </p>
                  {item.isIDX && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold bg-brand-50 text-brand-500 rounded dark:bg-brand-500/10 dark:text-brand-400">
                      IDX
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {item.name}
                </p>
              </div>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-md shrink-0 dark:bg-gray-800 dark:text-gray-500">
                {item.exchDisp || item.exchange}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
