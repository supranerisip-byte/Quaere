import React, { useState } from 'react';
import { Copy, Check, AlertCircle, StopCircle, Clock, Cpu } from 'lucide-react';
import { ChatMessage } from '../types/chat';
import { TwoColumnCanonResult } from './TwoColumnCanonResult';

interface MessageItemProps {
  message: ChatMessage;
  priorUserQuestion?: string;
  onRetry?: (message: ChatMessage) => void;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  priorUserQuestion,
  onRetry,
}) => {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const formatSourceFilterLabel = (filter?: string) => {
    switch (filter) {
      case 'derecho_canonico':
        return 'Codex Iuris Canonici (CIC)';
      case 'magisterio':
        return 'Magisterium Pontificium';
      case 'todos':
      default:
        return 'Corpus Integratum';
    }
  };

  return (
    <div
      className={`py-5 px-4 sm:px-6 transition-colors font-serif ${
        isUser
          ? 'bg-[#FAF7F0]'
          : 'bg-[#f7f3eb]/70 border-y border-[#e8dcc6]'
      }`}
    >
      <div className="max-w-5xl mx-auto flex gap-3.5 sm:gap-4 items-start">
        {/* Classical Role Icon Avatar */}
        <div
          className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-serif font-bold shrink-0 mt-0.5 select-none border ${
            isUser
              ? 'bg-[#2b2117] text-[#FAF7F0] border-[#2b2117]'
              : 'bg-[#C9A86A]/20 text-[#786142] border-[#C9A86A]/50 shadow-2xs'
          }`}
          aria-hidden="true"
        >
          {isUser ? 'Q' : '§'}
        </div>

        {/* Message Container */}
        <div className="flex-1 min-w-0">
          {/* Metadata Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2 text-xs text-[#786142]">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#1a1a1a] tracking-tight">
                {isUser ? 'Quaestio Fidelis' : 'Responsum Canonicum'}
              </span>
              <span aria-hidden="true" className="text-[#e8dcc6]">·</span>
              <span>{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              {message.sourceFilter && (
                <>
                  <span aria-hidden="true" className="text-[#e8dcc6]">·</span>
                  <span className="text-[#3d3023] font-medium italic">
                    {formatSourceFilterLabel(message.sourceFilter)}
                  </span>
                </>
              )}
              {message.matchCount && (
                <>
                  <span aria-hidden="true" className="text-[#e8dcc6]">·</span>
                  <span className="font-mono text-[#8c7a65]">
                    k={message.matchCount}
                  </span>
                </>
              )}
            </div>

            {/* Copy Button */}
            {message.content && (
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-[#786142] hover:text-[#1a1a1a] transition-colors px-2 py-0.5 rounded text-xs hover:bg-[#e8dcc6]/40"
                title="Describere textum"
                aria-label="Copiar contenido"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#1b7340]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Descriptum' : 'Copiare'}</span>
              </button>
            )}
          </div>

          {/* User message presentation */}
          {isUser ? (
            <div className="text-[#1a1a1a] text-[17px] font-serif leading-relaxed italic py-1">
              {message.content}
            </div>
          ) : (
            /* Assistant message: Two Columns Latin / Spanish side-by-side */
            <div>
              <TwoColumnCanonResult
                content={message.content}
                question={priorUserQuestion}
                isStreaming={message.status === 'streaming'}
              />
            </div>
          )}

          {/* Aborted Notification */}
          {message.status === 'aborted' && (
            <div className="mt-2 text-xs text-[#8c3527] flex items-center gap-1.5 italic">
              <StopCircle className="w-3.5 h-3.5 shrink-0" />
              <span>Transmissio a lectore intermissa est.</span>
            </div>
          )}

          {/* Error Notification */}
          {message.status === 'error' && (
            <div className="mt-3 p-3 bg-[#fdf0ed] border border-[#e8a397] rounded-lg text-xs text-[#8c3527] space-y-2">
              <div className="flex items-start gap-2 font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#c2412b]" />
                <span>Error in functione Supabase vel in communicatione</span>
              </div>
              <p className="font-mono text-[11px] bg-[#f9dbd6] p-2 rounded break-all whitespace-pre-wrap">
                {message.error || 'Error inexpectatus in decursu fluvii SSE.'}
              </p>
              {onRetry && (
                <button
                  onClick={() => onRetry(message)}
                  className="px-3 py-1 bg-[#8c3527] text-white text-xs font-serif font-medium rounded hover:bg-[#722b1f] transition-colors"
                >
                  Iterare Quaerendum
                </button>
              )}
            </div>
          )}

          {/* Metrics Footer */}
          {message.metrics && message.status === 'completed' && (
            <div className="mt-2 pt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-[#9b8364] font-mono tabular-nums">
              {message.metrics.ttftMs !== undefined && (
                <div className="flex items-center gap-1" title="Tempus usque ad primum signum">
                  <Clock className="w-3 h-3 text-[#C9A86A]" />
                  <span>TTFT: {Math.round(message.metrics.ttftMs)}ms</span>
                </div>
              )}
              {message.metrics.totalDurationMs !== undefined && (
                <div className="flex items-center gap-1" title="Totum tempus">
                  <span>Tempus: {(message.metrics.totalDurationMs / 1000).toFixed(2)}s</span>
                </div>
              )}
              {message.metrics.tokensCount !== undefined && (
                <div className="flex items-center gap-1" title="Signa recepta">
                  <Cpu className="w-3 h-3 text-[#C9A86A]" />
                  <span>~{message.metrics.tokensCount} signa</span>
                </div>
              )}
              {message.metrics.charsCount !== undefined && (
                <span>{message.metrics.charsCount} litterae</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
