export type SourceFilter = 'todos' | 'derecho_canonico' | 'magisterio';

export interface RequestBody {
  question: string;
  sourceFilter?: SourceFilter;
  matchCount?: number;
}

export type MessageStatus = 'idle' | 'streaming' | 'completed' | 'error' | 'aborted';

export interface MessageMetrics {
  ttftMs?: number; // Time to first token
  totalDurationMs?: number;
  tokensCount?: number;
  chunksCount?: number;
  charsCount?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  status: MessageStatus;
  sourceFilter?: SourceFilter;
  matchCount?: number;
  metrics?: MessageMetrics;
  error?: string;
  rawChunks?: string[];
}

export interface StreamConfig {
  endpoint: string;
  supabaseKey: string;
  useSimulation: boolean;
  matchCount: number;
  sourceFilter: SourceFilter;
}
