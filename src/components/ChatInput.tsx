import React, { useRef, useEffect } from 'react';
import { Square, BookOpen, Layers } from 'lucide-react';
import { SourceFilter } from '../types/chat';

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  sourceFilter: SourceFilter;
  setSourceFilter: (value: SourceFilter) => void;
  matchCount: number;
  setMatchCount: (count: number) => void;
  isStreaming: boolean;
  onSubmit: () => void;
  onAbort: () => void;
  onOpenEditionsModal?: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  input,
  setInput,
  sourceFilter,
  setSourceFilter,
  matchCount,
  setMatchCount,
  isStreaming,
  onSubmit,
  onAbort,
  onOpenEditionsModal,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!isStreaming && input.trim()) {
        onSubmit();
      }
    } else if (e.key === 'Escape' && isStreaming) {
      e.preventDefault();
      onAbort();
    }
  };

  return (
    <div className="bg-[#FAF7F0] border-t border-[#e8dcc6] px-4 py-4 sm:px-6 sticky bottom-0 z-20">
      <div className="max-w-3xl mx-auto space-y-3">
        {/* Centered Large Input Field with Georgia, 18px */}
        <div className="relative flex items-center bg-[#fdfcf9] border-2 border-[#e8dcc6] focus-within:border-[#C9A86A] focus-within:shadow-[0_0_0_3px_rgba(201,168,106,0.18)] rounded-2xl transition-all shadow-xs p-1.5 sm:p-2">
          <input
            ref={inputRef}
            id="chat-prompt-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Quaere canones... "
            disabled={isStreaming}
            className="w-full bg-transparent px-3 py-2 text-[#2b2117] placeholder:text-[#9b8364] focus:outline-hidden text-base sm:text-[18px] leading-normal"
            style={{
              fontFamily: 'Georgia, serif',
            }}
            aria-label="Quaere canones"
          />

          <div className="flex items-center gap-2 pr-1 shrink-0">
            {isStreaming ? (
              <button
                type="button"
                onClick={onAbort}
                className="px-4 py-2 bg-[#8c3527] hover:bg-[#722b1f] text-white rounded-xl text-xs font-serif font-bold tracking-wider uppercase flex items-center gap-1.5 transition-colors shadow-xs active:scale-95"
                title="Detener respuesta en curso"
                aria-label="Detener respuesta de streaming en curso"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Desinere</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onSubmit}
                disabled={!input.trim()}
                className="px-5 py-2.5 bg-[#1a1a1a] hover:bg-[#2e261e] disabled:bg-[#e8dcc6] text-[#FAF7F0] hover:text-[#C9A86A] disabled:text-[#9c8973] rounded-xl text-sm font-serif font-semibold tracking-wide transition-all shadow-xs disabled:cursor-not-allowed flex items-center gap-2 border border-[#C9A86A]/40"
                title="Quaerere canones"
                aria-label="Quaerere"
              >
                <span>Quaerere</span>
                <span className="text-[#C9A86A] text-xs">✦</span>
              </button>
            )}
          </div>
        </div>

        {/* Edition & Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[#786142] font-serif px-1">
          <div className="flex flex-wrap items-center gap-3">
            {/* Edition trigger */}
            <button
              type="button"
              onClick={onOpenEditionsModal}
              className="flex items-center gap-1.5 hover:text-[#1a1a1a] transition-colors underline decoration-[#C9A86A]/60 decoration-1 underline-offset-2"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#C9A86A]" />
              <span className="font-semibold">Editiones Possibiles</span>
            </button>

            <span aria-hidden="true" className="text-[#e8dcc6]">·</span>

            {/* Controlled Source Filter */}
            <div className="flex items-center gap-1.5">
              <label htmlFor="source-filter-select" className="font-serif">
                Corpus:
              </label>
              <select
                id="source-filter-select"
                value={sourceFilter}
                disabled={isStreaming}
                onChange={(e) => setSourceFilter(e.target.value as SourceFilter)}
                className="bg-[#fbf9f4] border border-[#e8dcc6] text-[#2b2117] text-xs rounded-md px-2 py-0.5 font-serif cursor-pointer focus:ring-1 focus:ring-[#C9A86A] focus:border-[#C9A86A]"
              >
                <option value="todos">Omnia (Canon & Magisterium)</option>
                <option value="derecho_canonico">Codex Iuris Canonici (CIC)</option>
                <option value="magisterio">Magisterium Pontificium</option>
              </select>
            </div>

            <span aria-hidden="true" className="text-[#e8dcc6]">·</span>

            {/* Match count */}
            <div className="flex items-center gap-1">
              <label htmlFor="match-count-select" className="font-serif">
                Concordantiae:
              </label>
              <select
                id="match-count-select"
                value={matchCount}
                disabled={isStreaming}
                onChange={(e) => setMatchCount(Number(e.target.value))}
                className="bg-[#fbf9f4] border border-[#e8dcc6] text-[#2b2117] text-xs rounded-md px-1.5 py-0.5 font-mono cursor-pointer tabular-nums focus:ring-1 focus:ring-[#C9A86A]"
              >
                <option value={3}>3</option>
                <option value={5}>5</option>
                <option value={8}>8</option>
              </select>
            </div>
          </div>

          <div className="text-[11px] text-[#9b8364] hidden sm:block">
            Preme <kbd className="px-1 py-0.5 bg-[#f3ede1] border border-[#e8dcc6] rounded font-mono text-[10px]">Enter</kbd> ad quaerendum
          </div>
        </div>
      </div>
    </div>
  );
};
