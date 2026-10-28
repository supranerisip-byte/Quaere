/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowDown } from 'lucide-react';
import { Header } from './components/Header';
import { MessageItem } from './components/MessageItem';
import { ChatInput } from './components/ChatInput';
import { PresetQuestions } from './components/PresetQuestions';
import { SettingsModal } from './components/SettingsModal';
import { EditionsModal } from './components/EditionsModal';
import { DebugDrawer } from './components/DebugDrawer';
import { ChatMessage, RequestBody, SourceFilter, StreamConfig } from './types/chat';
import {
  DEFAULT_ENDPOINT,
  consumeRAGStream,
  simulateRAGStream,
} from './utils/sse';
import { useSmoothStream } from './utils/useSmoothStream';

export default function App() {
  // Configuration State
  const [config, setConfig] = useState<StreamConfig>({
    endpoint: DEFAULT_ENDPOINT,
    supabaseKey: '',
    useSimulation: false,
    matchCount: 5,
    sourceFilter: 'todos',
  });

  // Conversation & Input State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('todos');
  const [matchCount, setMatchCount] = useState<number>(5);
  const [isStreaming, setIsStreaming] = useState(false);

  // Modals & Drawers
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isEditionsOpen, setIsEditionsOpen] = useState(false);
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const [rawPackets, setRawPackets] = useState<string[]>([]);

  // AbortController & Active Stream References
  const abortControllerRef = useRef<AbortController | null>(null);
  const activeMessageIdRef = useRef<string | null>(null);
  const streamStartTimeRef = useRef<number>(0);
  const firstTokenTimeRef = useRef<number | null>(null);
  const tokenCountRef = useRef<number>(0);

  // Auto-scroll References
  const viewportRef = useRef<HTMLDivElement>(null);
  const isAutoScrollEnabledRef = useRef<boolean>(true);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);

  // Scroll to bottom helper
  const scrollToBottom = useCallback((smooth = false) => {
    if (viewportRef.current) {
      viewportRef.current.scrollTo({
        top: viewportRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'instant',
      });
      isAutoScrollEnabledRef.current = true;
      setShowScrollBottomBtn(false);
    }
  }, []);

  // Handle user manual scroll to pause auto-scroll on wheel up
  const handleScroll = useCallback(() => {
    if (!viewportRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = viewportRef.current;
    const distanceToBottom = scrollHeight - (scrollTop + clientHeight);

    // If user is more than 15px away from bottom, consider it scrolled up
    if (distanceToBottom > 15) {
      isAutoScrollEnabledRef.current = false;
      setShowScrollBottomBtn(true);
    } else {
      isAutoScrollEnabledRef.current = true;
      setShowScrollBottomBtn(false);
    }
  }, []);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY < 0) {
        // User scrolled upward: pause auto-scroll immediately
        isAutoScrollEnabledRef.current = false;
        setShowScrollBottomBtn(true);
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: true });
    el.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      el.removeEventListener('wheel', handleWheel);
      el.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);

  // High performance smooth streaming accumulator to eliminate quadratic re-renders
  const { pushToken, flush, endStream, clear } = useSmoothStream({
    batchIntervalMs: 35,
    onFlush: (accumulatedDelta) => {
      const activeId = activeMessageIdRef.current;
      if (!activeId) return;

      if (firstTokenTimeRef.current === null) {
        firstTokenTimeRef.current = performance.now();
      }

      tokenCountRef.current += 1;

      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id === activeId) {
            return {
              ...msg,
              content: msg.content + accumulatedDelta,
            };
          }
          return msg;
        })
      );

      if (isAutoScrollEnabledRef.current && viewportRef.current) {
        viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
      }
    },
  });

  // Handle aborting active stream
  const handleAbort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    endStream();
    setIsStreaming(false);

    const activeId = activeMessageIdRef.current;
    if (activeId) {
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id === activeId) {
            return {
              ...msg,
              status: msg.content.trim() ? 'completed' : 'aborted',
            };
          }
          return msg;
        })
      );
      activeMessageIdRef.current = null;
    }
  }, [endStream]);

  // Core stream submission handler
  const handleSendMessage = useCallback(
    async (questionText?: string, explicitFilter?: SourceFilter) => {
      const text = (questionText || input).trim();
      if (!text || isStreaming) return;

      const activeFilter = explicitFilter || sourceFilter;

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      clear();

      isAutoScrollEnabledRef.current = true;
      setShowScrollBottomBtn(false);

      const userMsgId = `user_${Date.now()}`;
      const userMessage: ChatMessage = {
        id: userMsgId,
        role: 'user',
        content: text,
        timestamp: Date.now(),
        status: 'completed',
        sourceFilter: activeFilter,
        matchCount,
      };

      const assistantMsgId = `assistant_${Date.now()}`;
      const assistantMessage: ChatMessage = {
        id: assistantMsgId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        status: 'streaming',
        sourceFilter: activeFilter,
        matchCount,
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setInput('');
      setIsStreaming(true);

      activeMessageIdRef.current = assistantMsgId;
      streamStartTimeRef.current = performance.now();
      firstTokenTimeRef.current = null;
      tokenCountRef.current = 0;

      requestAnimationFrame(() => scrollToBottom(false));

      const controller = new AbortController();
      abortControllerRef.current = controller;

      const requestBody: RequestBody = {
        question: text,
        sourceFilter: activeFilter,
        matchCount,
      };

      const streamOptions = {
        endpoint: config.endpoint,
        supabaseKey: config.supabaseKey,
        body: requestBody,
        signal: controller.signal,
        onToken: (token: string) => {
          pushToken(token);
        },
        onRawPacket: (packet: string) => {
          setRawPackets((prev) => [...prev.slice(-150), packet]);
        },
        onDone: () => {
          endStream();
          const totalDurationMs = performance.now() - streamStartTimeRef.current;
          const ttftMs = firstTokenTimeRef.current
            ? firstTokenTimeRef.current - streamStartTimeRef.current
            : undefined;

          setMessages((prev) =>
            prev.map((msg) => {
              if (msg.id === assistantMsgId) {
                return {
                  ...msg,
                  status: 'completed',
                  metrics: {
                    ttftMs,
                    totalDurationMs,
                    tokensCount: tokenCountRef.current,
                    charsCount: msg.content.length,
                  },
                };
              }
              return msg;
            })
          );
          setIsStreaming(false);
          activeMessageIdRef.current = null;
          abortControllerRef.current = null;
        },
        onError: (error: Error) => {
          endStream();
          setMessages((prev) =>
            prev.map((msg) => {
              if (msg.id === assistantMsgId) {
                return {
                  ...msg,
                  status: 'error',
                  error: error.message,
                };
              }
              return msg;
            })
          );
          setIsStreaming(false);
          activeMessageIdRef.current = null;
          abortControllerRef.current = null;
        },
      };

      if (config.useSimulation) {
        await simulateRAGStream(streamOptions);
      } else {
        await consumeRAGStream(streamOptions);
      }
    },
    [input, isStreaming, sourceFilter, matchCount, clear, scrollToBottom, config, pushToken, endStream]
  );

  const handleRetry = (msg: ChatMessage) => {
    const msgIndex = messages.findIndex((m) => m.id === msg.id);
    if (msgIndex > 0) {
      const priorUserMsg = messages[msgIndex - 1];
      if (priorUserMsg?.role === 'user') {
        handleSendMessage(priorUserMsg.content, priorUserMsg.sourceFilter);
      }
    }
  };

  const handleNewChat = () => {
    if (isStreaming) {
      handleAbort();
    }
    setMessages([]);
    setInput('');
    setRawPackets([]);
    isAutoScrollEnabledRef.current = true;
    setShowScrollBottomBtn(false);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#FAF7F0] text-[#2b2117]">
      {/* Minimal Classical Top Bar */}
      <Header
        onNewChat={handleNewChat}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onToggleDebug={() => setIsDebugOpen((prev) => !prev)}
        onOpenEditions={() => setIsEditionsOpen(true)}
        isDebugOpen={isDebugOpen}
        isSimulated={config.useSimulation}
      />

      {/* Main Conversation Viewport with Auto-Scroll Listener */}
      <main
        ref={viewportRef}
        id="conversation-viewport"
        className="flex-1 overflow-y-auto sync-scroll relative"
        role="log"
        aria-label="Registro de conversación canónica"
        aria-live="polite"
      >
        {messages.length === 0 ? (
          <PresetQuestions
            onSelect={(q, filter) => {
              setSourceFilter(filter);
              handleSendMessage(q, filter);
            }}
          />
        ) : (
          <div className="flex flex-col min-h-full">
            {messages.map((message, idx) => {
              const priorUserQuestion =
                message.role === 'assistant' && idx > 0 && messages[idx - 1]?.role === 'user'
                  ? messages[idx - 1].content
                  : undefined;

              return (
                <MessageItem
                  key={message.id}
                  message={message}
                  priorUserQuestion={priorUserQuestion}
                  onRetry={handleRetry}
                />
              );
            })}
            <div className="h-6 shrink-0" />
          </div>
        )}

        {/* Floating "Scroll to Bottom" pill when manual wheel-up paused auto-scroll */}
        {showScrollBottomBtn && (
          <div className="sticky bottom-4 inset-x-0 flex justify-center pointer-events-none z-10">
            <button
              type="button"
              onClick={() => scrollToBottom(true)}
              className="pointer-events-auto px-4 py-2 bg-[#1a1a1a]/95 hover:bg-[#1a1a1a] text-[#FAF7F0] text-xs font-serif font-bold rounded-full shadow-lg border border-[#C9A86A]/50 flex items-center gap-2 transition-all hover:scale-105"
              aria-label="Reanudar auto-desplazamiento al final"
            >
              <ArrowDown className="w-3.5 h-3.5 text-[#C9A86A] animate-bounce" />
              <span>Ad finem pergere</span>
            </button>
          </div>
        )}
      </main>

      {/* Centered Large Chat Input Controls */}
      <ChatInput
        input={input}
        setInput={setInput}
        sourceFilter={sourceFilter}
        setSourceFilter={setSourceFilter}
        matchCount={matchCount}
        setMatchCount={setMatchCount}
        isStreaming={isStreaming}
        onSubmit={() => handleSendMessage()}
        onAbort={handleAbort}
        onOpenEditionsModal={() => setIsEditionsOpen(true)}
      />

      {/* Editions Modal */}
      <EditionsModal
        isOpen={isEditionsOpen}
        onClose={() => setIsEditionsOpen(false)}
        activeFilter={sourceFilter}
        onSelectEdition={(f) => setSourceFilter(f)}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={config}
        onSaveConfig={setConfig}
      />

      {/* Real-Time SSE Debug Drawer */}
      <DebugDrawer
        isOpen={isDebugOpen}
        onClose={() => setIsDebugOpen(false)}
        rawPackets={rawPackets}
        onClear={() => setRawPackets([])}
      />
    </div>
  );
}
