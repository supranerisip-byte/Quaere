import React from 'react';
import { X, Trash2, Terminal, CheckCircle2 } from 'lucide-react';

interface DebugDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  rawPackets: string[];
  onClear: () => void;
}

export const DebugDrawer: React.FC<DebugDrawerProps> = ({
  isOpen,
  onClose,
  rawPackets,
  onClear,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed bottom-0 right-0 z-40 w-full sm:w-[480px] h-[360px] bg-slate-900 text-slate-100 shadow-2xl border-t sm:border-l border-slate-700 flex flex-col font-mono text-xs">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-800 border-b border-slate-700 shrink-0">
        <div className="flex items-center gap-2 text-amber-400 font-semibold">
          <Terminal className="w-4 h-4" />
          <span>Monitor SSE en Tiempo Real</span>
          <span className="text-[10px] text-slate-400 bg-slate-700 px-1.5 py-0.5 rounded tabular-nums">
            {rawPackets.length} paquetes
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onClear}
            className="p-1 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-700 transition-colors"
            title="Limpiar paquetes capturados"
            aria-label="Limpiar paquetes"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-700 transition-colors"
            title="Cerrar monitor"
            aria-label="Cerrar monitor"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Packet stream listing */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5 custom-scrollbar bg-slate-950/80">
        {rawPackets.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500 text-xs italic">
            Sin paquetes recibidos aún. Envíe una consulta para ver el flujo SSE.
          </div>
        ) : (
          rawPackets.map((pkt, idx) => {
            const isDone = pkt.includes('[DONE]');
            const isComment = pkt.startsWith(':');
            return (
              <div
                key={idx}
                className={`p-1.5 rounded border text-[11px] break-all leading-tight ${
                  isDone
                    ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                    : isComment
                    ? 'bg-blue-950/40 border-blue-800 text-blue-300'
                    : 'bg-slate-900 border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] text-slate-500 mb-0.5">
                  <span># {idx + 1}</span>
                  {isDone && (
                    <span className="flex items-center gap-1 text-emerald-400 font-bold">
                      <CheckCircle2 className="w-3 h-3" /> STREAM TERMINATED
                    </span>
                  )}
                </div>
                <code>{pkt}</code>
              </div>
            );
          })
        )}
      </div>

      {/* Footer bar */}
      <div className="px-3 py-1.5 bg-slate-800/80 border-t border-slate-700 text-[10px] text-slate-400 flex items-center justify-between">
        <span>Separador: \n · Buffer: SseChunkBuffer</span>
        <span>TextDecoder(fatal:false, stream:true)</span>
      </div>
    </div>
  );
};
