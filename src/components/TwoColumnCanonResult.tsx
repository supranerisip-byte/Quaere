import React, { useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { extractLatinAndSpanish } from '../utils/latinCanon';

interface TwoColumnCanonResultProps {
  content: string;
  question?: string;
  isStreaming?: boolean;
}

export const TwoColumnCanonResult: React.FC<TwoColumnCanonResultProps> = ({
  content,
  question,
  isStreaming,
}) => {
  const leftColRef = useRef<HTMLDivElement>(null);
  const rightColRef = useRef<HTMLDivElement>(null);
  const isSyncingLeftRef = useRef(false);
  const isSyncingRightRef = useRef(false);

  const { latin, spanish } = extractLatinAndSpanish(content, question);

  // Synchronized scroll mechanism between Left (Latin) and Right (Spanish) columns
  useEffect(() => {
    const leftEl = leftColRef.current;
    const rightEl = rightColRef.current;
    if (!leftEl || !rightEl) return;

    const handleLeftScroll = () => {
      if (isSyncingLeftRef.current) return;
      isSyncingRightRef.current = true;

      const maxScrollLeft = leftEl.scrollHeight - leftEl.clientHeight;
      if (maxScrollLeft > 0) {
        const ratio = leftEl.scrollTop / maxScrollLeft;
        const maxScrollRight = rightEl.scrollHeight - rightEl.clientHeight;
        rightEl.scrollTop = ratio * maxScrollRight;
      }

      requestAnimationFrame(() => {
        isSyncingRightRef.current = false;
      });
    };

    const handleRightScroll = () => {
      if (isSyncingRightRef.current) return;
      isSyncingLeftRef.current = true;

      const maxScrollRight = rightEl.scrollHeight - rightEl.clientHeight;
      if (maxScrollRight > 0) {
        const ratio = rightEl.scrollTop / maxScrollRight;
        const maxScrollLeft = leftEl.scrollHeight - leftEl.clientHeight;
        leftEl.scrollTop = ratio * maxScrollLeft;
      }

      requestAnimationFrame(() => {
        isSyncingLeftRef.current = false;
      });
    };

    leftEl.addEventListener('scroll', handleLeftScroll, { passive: true });
    rightEl.addEventListener('scroll', handleRightScroll, { passive: true });

    return () => {
      leftEl.removeEventListener('scroll', handleLeftScroll);
      rightEl.removeEventListener('scroll', handleRightScroll);
    };
  }, []);

  return (
    <div className="rounded-xl border border-[#e8dcc6] bg-[#fbf9f4] shadow-xs overflow-hidden my-3">
      {/* Two columns side-by-side on desktop, stacked on mobile */}
      <div className="grid grid-cols-1 md:grid-cols-12 min-h-[220px]">
        {/* Left Column (40% on desktop): CANON - LATIN */}
        <div className="md:col-span-5 flex flex-col md:border-r border-[#e8dcc6] bg-[#f8f5ed]/60">
          <div className="px-4 py-2.5 bg-[#f3ede1]/70 border-b border-[#e8dcc6] flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#786142] font-serif">
              CANON — LATIN
            </span>
            <span className="text-[10px] text-[#9b8364] italic font-serif">
              Textus Authenticus
            </span>
          </div>

          <div
            ref={leftColRef}
            className="sync-scroll p-4 md:p-5 overflow-y-auto max-h-[360px] text-[15px] leading-[1.55] text-[#2b2117] italic font-serif opacity-90 select-text"
            style={{
              textShadow: '0px 1px 0px rgba(0,0,0,0.07)',
            }}
          >
            {latin ? (
              <div className="whitespace-pre-line space-y-3 font-serif">
                {latin.split('\n\n').map((para, idx) => (
                  <p key={idx} className="engraved-token">
                    {para}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-[#8c7a65] italic text-sm">
                Recuperando canon authenticum in lingua latina...
              </p>
            )}
          </div>
        </div>

        {/* Right Column (60% on desktop): INTERPRETATIO - ESPAÑOL */}
        <div className="md:col-span-7 flex flex-col bg-[#fcfbf7]">
          <div className="px-4 py-2.5 bg-[#f6f2e8]/80 border-b border-[#e8dcc6] flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#786142] font-serif">
              INTERPRETATIO — ESPAÑOL
            </span>
            <span className="text-[10px] text-[#9b8364] font-serif">
              Doctrina & Jurisprudencia
            </span>
          </div>

          <div
            ref={rightColRef}
            className="sync-scroll p-4 md:p-5 overflow-y-auto max-h-[360px] monumental-answers select-text"
          >
            {spanish ? (
              <div className="prose prose-stone max-w-none prose-p:my-2 prose-p:leading-[1.5] prose-headings:font-serif prose-headings:font-bold prose-headings:text-[#1a1a1a] prose-h4:text-[15px] prose-blockquote:border-l-2 prose-blockquote:border-[#C9A86A] prose-blockquote:pl-3 prose-blockquote:italic prose-blockquote:text-[#3d3023] prose-ul:my-2 prose-li:my-1 prose-strong:text-[#1a1a1a]">
                <ReactMarkdown>{spanish}</ReactMarkdown>
              </div>
            ) : isStreaming ? (
              <div className="flex items-center gap-2 text-[#8c7a65] text-xs py-3 italic font-serif">
                <span className="inline-block w-2 h-2 rounded-full bg-[#C9A86A] animate-pulse"></span>
                <span>Tradens et interpretans sententiam canonicam...</span>
              </div>
            ) : null}

            {/* In-flight typing cursor with golden spark */}
            {isStreaming && (
              <span className="inline-block w-1.5 h-4 ml-1 bg-[#C9A86A] animate-pulse align-middle shadow-[0_0_8px_#C9A86A]" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
