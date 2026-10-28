import { RequestBody, SourceFilter } from '../types/chat';

export const DEFAULT_ENDPOINT = 'https://smtqdutzudadtskhjhmx.supabase.co/functions/v1/smart-api';

export interface StreamEvent {
  type: 'token' | 'done' | 'comment' | 'error';
  text?: string;
  rawJson?: any;
  error?: string;
}

/**
 * Extracts delta text token defensively from standard Gemini / Supabase RAG JSON chunk format:
 * jsonChunk.candidates?.[0]?.content?.parts?.[0]?.text
 */
export function extractTextDeltaFromChunk(jsonChunk: any): string | null {
  if (!jsonChunk || typeof jsonChunk !== 'object') {
    return null;
  }

  // 1. Primary path required by specification
  const candidateText = jsonChunk.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof candidateText === 'string') {
    return candidateText;
  }

  // 2. Defensive fallbacks for standard edge variants
  if (typeof jsonChunk.text === 'string') return jsonChunk.text;
  if (typeof jsonChunk.delta === 'string') return jsonChunk.delta;
  if (typeof jsonChunk.content === 'string') return jsonChunk.content;

  // 3. Check for parts array directly
  if (Array.isArray(jsonChunk.parts) && typeof jsonChunk.parts[0]?.text === 'string') {
    return jsonChunk.parts[0].text;
  }

  return null;
}

/**
 * Parses a single complete SSE line.
 * Strips leading 'data: ' prefix, handles '[DONE]', comments, and JSON payloads.
 */
export function parseSseLine(line: string): StreamEvent | null {
  const cleanLine = line.endsWith('\r') ? line.slice(0, -1) : line;

  // Empty lines in SSE are event dispatch separators
  if (!cleanLine.trim()) {
    return null;
  }

  // Keep-alive or comment line
  if (cleanLine.startsWith(':')) {
    return { type: 'comment', text: cleanLine.slice(1).trim() };
  }

  // Handle data lines
  if (cleanLine.startsWith('data:')) {
    // Strip leading 'data: ' or 'data:'
    const payload = cleanLine.replace(/^data:\s?/, '').trim();

    if (payload === '[DONE]') {
      return { type: 'done' };
    }

    if (!payload) {
      return null;
    }

    try {
      const parsedJson = JSON.parse(payload);
      const textDelta = extractTextDeltaFromChunk(parsedJson);

      return {
        type: 'token',
        text: textDelta ?? '',
        rawJson: parsedJson,
      };
    } catch {
      // Raw string payload fallback
      return {
        type: 'token',
        text: payload,
      };
    }
  }

  return null;
}

/**
 * Buffer manager for SSE streams.
 * Solves TCP packet fragmentation where chunks end mid-line or mid-character.
 */
export class SseChunkBuffer {
  private buffer = '';

  public push(chunk: string): string[] {
    this.buffer += chunk;
    const lines = this.buffer.split('\n');
    // Preserve trailing incomplete line in buffer
    this.buffer = lines.pop() ?? '';
    return lines;
  }

  public flush(): string[] {
    const remaining = this.buffer.trim();
    this.buffer = '';
    return remaining ? [remaining] : [];
  }

  public getPendingBuffer(): string {
    return this.buffer;
  }

  public clear(): void {
    this.buffer = '';
  }
}

export interface ConsumeStreamOptions {
  endpoint?: string;
  supabaseKey?: string;
  body: RequestBody;
  signal?: AbortSignal;
  onToken: (delta: string) => void;
  onDone?: () => void;
  onError?: (error: Error) => void;
  onRawPacket?: (packet: string) => void;
}

/**
 * Core stream consumer:
 * - Asynchronous POST using Fetch API
 * - Strict TypeScript validation on response.body (non-null check before getReader())
 * - Chunked stream reader loop with TextDecoder({ fatal: false, stream: true })
 * - Internal buffer to solve SSE TCP fragmentation (split by \n, iterate only complete lines)
 * - Strip leading data: prefix and handle [DONE] token
 * - Defensive JSON extraction with candidates?.[0]?.content?.parts?.[0]?.text
 */
export async function consumeRAGStream(options: ConsumeStreamOptions): Promise<void> {
  const {
    endpoint = DEFAULT_ENDPOINT,
    supabaseKey,
    body,
    signal,
    onToken,
    onDone,
    onError,
    onRawPacket,
  } = options;

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
    };

    if (supabaseKey) {
      headers['apikey'] = supabaseKey;
      headers['Authorization'] = `Bearer ${supabaseKey}`;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      let errorDetail = `HTTP ${response.status} ${response.statusText}`;
      try {
        const errorJson = await response.json();
        if (errorJson?.error || errorJson?.message) {
          errorDetail = errorJson.error || errorJson.message;
        }
      } catch {
        const errorText = await response.text().catch(() => '');
        if (errorText) errorDetail = errorText.slice(0, 300);
      }
      throw new Error(errorDetail);
    }

    // Check if response is non-streaming JSON error (e.g. Supabase Edge Function error returned with HTTP 200)
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await response.json();
      if (data?.success === false && data?.error) {
        throw new Error(data.error);
      }
      // If it returned regular JSON response instead of SSE
      const fallbackText = extractTextDeltaFromChunk(data) || JSON.stringify(data, null, 2);
      onToken(fallbackText);
      onDone?.();
      return;
    }

    // Specification constraint: Enforce strict TypeScript validation on response.body
    const responseBody = response.body;
    if (!responseBody) {
      throw new Error('Response body is null or undefined; streaming not supported by runtime environment.');
    }

    const reader = responseBody.getReader();
    const decoder = new TextDecoder('utf-8', { fatal: false, stream: true } as any);
    const buffer = new SseChunkBuffer();

    let isTerminated = false;

    while (!isTerminated) {
      const { done, value } = await reader.read();

      if (done) {
        const finalChunk = decoder.decode();
        if (finalChunk) {
          const lines = buffer.push(finalChunk);
          for (const line of lines) {
            onRawPacket?.(line);
            const event = parseSseLine(line);
            if (event?.type === 'token' && event.text) {
              onToken(event.text);
            }
          }
        }
        const flushed = buffer.flush();
        for (const line of flushed) {
          onRawPacket?.(line);
          const event = parseSseLine(line);
          if (event?.type === 'token' && event.text) {
            onToken(event.text);
          }
        }
        break;
      }

      if (value) {
        const chunkText = decoder.decode(value, { stream: true });
        const lines = buffer.push(chunkText);

        for (const line of lines) {
          onRawPacket?.(line);
          const event = parseSseLine(line);

          if (!event) continue;

          if (event.type === 'done') {
            isTerminated = true;
            break;
          }

          if (event.type === 'token' && event.text) {
            onToken(event.text);
          }
        }
      }
    }

    onDone?.();
  } catch (err: any) {
    if (err?.name === 'AbortError' || signal?.aborted) {
      onDone?.();
      return;
    }
    onError?.(err instanceof Error ? err : new Error(String(err)));
  }
}

/**
 * Deterministic SSE Stream Simulator
 * Generates identical candidate JSON chunks with simulated TCP fragmentation.
 * Essential for testing when the remote Supabase edge function encounters database RPC outages.
 */
export async function simulateRAGStream(options: ConsumeStreamOptions): Promise<void> {
  const { body, signal, onToken, onDone, onError, onRawPacket } = options;

  try {
    const knowledgeBase = getSimulatedKnowledgeResponse(body.question, body.sourceFilter, body.matchCount);

    // Break text into tokens (~2 to 6 words each)
    const words = knowledgeBase.split(/(\s+)/);
    const tokenGroups: string[] = [];
    let current = '';

    for (const w of words) {
      current += w;
      if (current.length >= 14 || w.includes('\n')) {
        tokenGroups.push(current);
        current = '';
      }
    }
    if (current) {
      tokenGroups.push(current);
    }

    const buffer = new SseChunkBuffer();

    for (let i = 0; i < tokenGroups.length; i++) {
      if (signal?.aborted) {
        onDone?.();
        return;
      }

      // Delay between 25ms and 60ms to mimic realistic network latency
      await new Promise(r => setTimeout(r, 35));

      const deltaText = tokenGroups[i];
      const jsonChunk = {
        candidates: [
          {
            content: {
              parts: [
                { text: deltaText }
              ]
            }
          }
        ]
      };

      const sseLine = `data: ${JSON.stringify(jsonChunk)}\n\n`;

      // Occasionally fragment the chunk across two writes to exercise SseChunkBuffer
      if (i % 5 === 0 && sseLine.length > 20) {
        const splitIdx = Math.floor(sseLine.length / 2);
        const part1 = sseLine.slice(0, splitIdx);
        const part2 = sseLine.slice(splitIdx);

        // Send part 1
        const lines1 = buffer.push(part1);
        for (const l of lines1) {
          onRawPacket?.(l);
          const ev = parseSseLine(l);
          if (ev?.type === 'token' && ev.text) onToken(ev.text);
        }

        // Micro delay
        await new Promise(r => setTimeout(r, 15));

        // Send part 2
        const lines2 = buffer.push(part2);
        for (const l of lines2) {
          onRawPacket?.(l);
          const ev = parseSseLine(l);
          if (ev?.type === 'token' && ev.text) onToken(ev.text);
        }
      } else {
        const lines = buffer.push(sseLine);
        for (const l of lines) {
          onRawPacket?.(l);
          const ev = parseSseLine(l);
          if (ev?.type === 'token' && ev.text) onToken(ev.text);
        }
      }
    }

    // Send final [DONE] packet
    const doneLine = 'data: [DONE]\n\n';
    const finalLines = buffer.push(doneLine);
    for (const l of finalLines) {
      onRawPacket?.(l);
      const ev = parseSseLine(l);
      if (ev?.type === 'token' && ev.text) onToken(ev.text);
    }

    onDone?.();
  } catch (err: any) {
    if (signal?.aborted) {
      onDone?.();
      return;
    }
    onError?.(err instanceof Error ? err : new Error(String(err)));
  }
}

function getSimulatedKnowledgeResponse(question: string, filter?: SourceFilter, matchCount = 5): string {
  const q = question.toLowerCase();

  const sourceHeader = filter === 'derecho_canonico'
    ? '### 📜 Corpus: Código de Derecho Canónico (CIC 1983)'
    : filter === 'magisterio'
    ? '### 🏛️ Corpus: Magisterio de la Iglesia Católica'
    : '### 📖 Corpus Integrado: Derecho Canónico y Magisterio';

  if (q.includes('matrimonio') || q.includes('impedimento') || q.includes('validez')) {
    return `${sourceHeader}
*Cotejo RAG: ${matchCount} fragmentos normativos recuperados.*

En relación a la institución matrimonial, el **Código de Derecho Canónico (1983)** y la doctrina eclesial establecen los siguientes fundamentos:

#### 1. Esencia y Propiedades Esenciales
> **Canon 1055 § 1**: "La alianza matrimonial, por la que el varón y la mujer constituyen entre sí un consorcio de toda la vida, ordenado por su misma índole natural al bien de los cónyuges y a la generación y educación de la prole, fue elevada por Cristo Señor a la dignidad de sacramento entre bautizados."

Las propiedades esenciales del matrimonio son la **unidad** y la **indisolubilidad**, que en el matrimonio cristiano alcanzan una particular firmeza por razón del sacramento (**Can. 1056**).

#### 2. Requisitos de Validez
Para que el consentimiento sea jurídicamente eficaz y el matrimonio válido:
1. **Capacidad jurídica personal**: Ausencia de impedimentos dirimentes (**Cann. 1083–1094**), tales como edad mínima (16 años varón, 14 mujer, salvo conferencia episcopal), impotencia antecedente y perpetua, ligamen preexistente, parentesco consanguíneo en línea recta y hasta cuarto grado colateral.
2. **Consentimiento libre y deliberado**: Exento de violencia, miedo grave o error determinante sobre la cualidad de la persona (**Can. 1095–1103**).
3. **Forma canónica ordinaria**: Celebración ante el Ordinario del lugar, el párroco competente o un ministro delegado, y dos testigos cualificados (**Can. 1108**).

#### 3. Referencias del Magisterio
- Concilio Vaticano II, Constitución pastoral *Gaudium et Spes*, n. 48.
- San Juan Pablo II, Exhortación apostólica *Familiaris Consortio*, n. 13.
- Catecismo de la Iglesia Católica, nn. 1601–1666.`;
  }

  if (q.includes('derecho') || q.includes('canon') || q.includes('ley')) {
    return `${sourceHeader}
*Cotejo RAG: ${matchCount} concordancias jurisprudenciales y canónicas.*

El **Derecho Canónico** constituye el ordenamiento jurídico que organiza y regula la vida de la Iglesia Católica como comunidad visible y Pueblo de Dios.

#### 1. Definición y Fundamentación Teológico-Jurídica
- **Naturaleza**: No es un derecho puramente secular o sociológico; su fin último es la **salvación de las almas** (*Salus animarum*, precepto rector establecido en el **Canon 1752**: *"la salvación de las almas debe ser siempre la ley suprema en la Iglesia"*).
- **Estructura dual**:
  1. **Derecho Divino**: Integrado por el derecho natural (inscrito en la naturaleza humana) y el derecho divino-positivo (revelado en las Sagradas Escrituras y la Tradición Apostólica). Este derecho es inmutable.
  2. **Derecho Eclesiástico Humano**: Promulgado por la legítima autoridad de la Iglesia (el Romano Pontífice y los Concilios Ecuménicos para la Iglesia universal; los Obispos y Conferencias Episcopales en su ámbito propio).

#### 2. El Código de 1983 (Codex Iuris Canonici)
Promulgado por San Juan Pablo II mediante la Constitución apostólica *Sacrae Disciplinae Leges*, consta de 1752 cánones organizados en 7 libros:
- **Libro I**: De las normas generales (Cann. 1–203).
- **Libro II**: Del Pueblo de Dios (Cann. 204–746).
- **Libro III**: De la función de enseñar de la Iglesia (Cann. 747–833).
- **Libro IV**: De la función de santificar (Cann. 834–1253).
- **Libro V**: De los bienes temporales (Cann. 1254–1310).
- **Libro VI**: De las sanciones penales en la Iglesia (Cann. 1311–1399).
- **Libro VII**: De los procesos (Cann. 1400–1752).`;
  }

  return `${sourceHeader}
*Consulta procesada con éxito a través del vector store (${matchCount} fragmentos indexados).*

Respecto a su consulta sobre **"${question.slice(0, 70)}"**:

#### 1. Fundamentos Teológicos y Documentales
La doctrina católica distingue con precisión entre las fuentes normativas y el depósito de la fe:
- **Magisterio Solemne**: Definiciones dogmáticas pontificias (*ex cathedra*) y resoluciones dogmáticas emanadas de Concilios Ecuménicos universales.
- **Magisterio Ordinario y Universal**: Enseñanza concurrente del Colegio Episcopal en comunión con el Obispo de Roma en materias de fe y moral.
- **Disciplina Canónica Positiva**: Leyes universales y particulares que aplican los principios doctrinales al orden práctico comunitario.

#### 2. Criterios de Interpretación
Conforme a la regla hermenéutica del **Canon 17**:
> *"Las leyes eclesiásticas deben entenderse según el significado propio de las palabras, considerado en el texto y en el contexto; si resulta dudoso u oscuro, se ha de recurrir a los lugares paralelos, si los hay, al fin y circunstancias de la ley y a la intención del legislador."*

#### 3. Concordancia Doctrinal
Cualquier interpretación canónica o pastoral debe situarse en la continuidad viva de la Tradición eclesial, priorizando la equidad canónica (*aequitas canonica*) sin menoscabo de la verdad evangélica.`;
}
