import React from 'react';
import { BookMarked, RefreshCw, SlidersHorizontal, Settings } from 'lucide-react';

interface HeaderProps {
  onNewChat: () => void;
  onOpenSettings: () => void;
  onToggleDebug: () => void;
  onOpenEditions: () => void;
  isDebugOpen: boolean;
  isSimulated: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onNewChat,
  onOpenSettings,
  onToggleDebug,
  onOpenEditions,
  isDebugOpen,
  isSimulated,
}) => {
  return (
    <header className="flex items-center justify-between gap-6 px-6 py-3.5 bg-[#FAF7F0] border-b border-[#e8dcc6] sticky top-0 z-20 font-serif">
      {/* Zone 1: Brand Wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-[#2b2117] text-[#C9A86A] flex items-center justify-center border border-[#C9A86A]/40 shadow-xs text-sm font-bold">
          §
        </div>
        <div className="flex flex-col">
          <span className="text-base font-bold tracking-tight text-[#1a1a1a] whitespace-nowrap">
            Ius Canonicum & Magisterium
          </span>
          <span className="text-[11px] text-[#786142] italic">
            Corpus Iuris Canonici & Documenta Ecclesiae
          </span>
        </div>
      </div>

      {/* Zone 2: Minimal single-line Navigation Links */}
      <nav className="hidden md:flex items-center gap-6 text-xs text-[#786142]">
        <button
          onClick={onOpenEditions}
          className="hover:text-[#1a1a1a] transition-colors whitespace-nowrap flex items-center gap-1.5"
        >
          <BookMarked className="w-3.5 h-3.5 text-[#C9A86A]" />
          <span>Editiones Canonicae</span>
        </button>
        <button
          onClick={onToggleDebug}
          className={`hover:text-[#1a1a1a] transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            isDebugOpen ? 'text-[#8c6b2d] font-bold' : ''
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Monitor SSE</span>
        </button>
      </nav>

      {/* Zone 3: Primary Actions */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="hidden sm:flex items-center gap-1 text-[11px] text-[#786142] px-2 py-0.5 rounded border border-[#e8dcc6] bg-[#fbf9f4]">
          <span className="text-[#9b8364]">Status:</span>
          <span className={isSimulated ? 'text-[#8c6b2d] font-semibold' : 'text-[#386b45] font-semibold'}>
            {isSimulated ? 'Simulatio SSE' : 'Supabase Live'}
          </span>
        </div>

        <button
          onClick={onOpenSettings}
          title="Ajustes de Red y Supabase"
          className="p-1.5 text-[#786142] hover:text-[#1a1a1a] hover:bg-[#e8dcc6]/40 rounded-lg transition-colors"
          aria-label="Ajustes de conexión"
        >
          <Settings className="w-4 h-4" />
        </button>

        <button
          onClick={onNewChat}
          className="p-2 sm:px-3.5 sm:py-1.5 text-xs font-semibold text-[#FAF7F0] bg-[#1a1a1a] hover:bg-[#2b2117] rounded-lg transition-colors flex items-center gap-1.5 border border-[#C9A86A]/40 shadow-xs"
          aria-label="Nova Quaestio"
          title="Nova Quaestio"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#C9A86A]" />
          <span className="hidden sm:inline">Nova Quaestio</span>
        </button>
      </div>
    </header>
  );
};
