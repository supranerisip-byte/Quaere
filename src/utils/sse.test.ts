import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractTextDeltaFromChunk,
  parseSseLine,
  SseChunkBuffer,
} from './sse';

test('extractTextDeltaFromChunk extracts text from standard candidates hierarchy', () => {
  const chunk = {
    candidates: [
      {
        content: {
          parts: [
            { text: 'Conforme al Canon 1055, la alianza matrimonial...' }
          ]
        }
      }
    ]
  };

  const text = extractTextDeltaFromChunk(chunk);
  assert.equal(text, 'Conforme al Canon 1055, la alianza matrimonial...');
});

test('extractTextDeltaFromChunk handles null/undefined and malformed inputs defensively', () => {
  assert.equal(extractTextDeltaFromChunk(null), null);
  assert.equal(extractTextDeltaFromChunk(undefined), null);
  assert.equal(extractTextDeltaFromChunk({}), null);
  assert.equal(extractTextDeltaFromChunk({ candidates: [] }), null);
  assert.equal(extractTextDeltaFromChunk({ candidates: [{ content: {} }] }), null);
  assert.equal(extractTextDeltaFromChunk({ candidates: [{ content: { parts: [] } }] }), null);
});

test('extractTextDeltaFromChunk supports alternative text keys defensively', () => {
  assert.equal(extractTextDeltaFromChunk({ text: 'Simple text' }), 'Simple text');
  assert.equal(extractTextDeltaFromChunk({ delta: 'Delta text' }), 'Delta text');
  assert.equal(extractTextDeltaFromChunk({ content: 'Direct content' }), 'Direct content');
});

test('parseSseLine handles data line with JSON candidate chunk', () => {
  const line = 'data: {"candidates":[{"content":{"parts":[{"text":"Artículo 1"}]}}]}';
  const event = parseSseLine(line);
  assert.ok(event);
  assert.equal(event.type, 'token');
  assert.equal(event.text, 'Artículo 1');
});

test('parseSseLine handles [DONE] token', () => {
  const line = 'data: [DONE]';
  const event = parseSseLine(line);
  assert.ok(event);
  assert.equal(event.type, 'done');
});

test('parseSseLine handles keep-alive comments and empty lines', () => {
  assert.equal(parseSseLine(''), null);
  assert.equal(parseSseLine('   '), null);

  const commentEvent = parseSseLine(': keep-alive ping');
  assert.ok(commentEvent);
  assert.equal(commentEvent.type, 'comment');
  assert.equal(commentEvent.text, 'keep-alive ping');
});

test('SseChunkBuffer handles TCP packet fragmentation across multiple chunks', () => {
  const buffer = new SseChunkBuffer();

  // Packet 1: incomplete line
  const p1 = 'data: {"candidates":[{"content":';
  const lines1 = buffer.push(p1);
  assert.equal(lines1.length, 0);
  assert.equal(buffer.getPendingBuffer(), p1);

  // Packet 2: completes the line and includes newline
  const p2 = '{"parts":[{"text":"Deus Caritas Est"}]}}]}\n';
  const lines2 = buffer.push(p2);
  assert.equal(lines2.length, 1);
  assert.equal(buffer.getPendingBuffer(), '');

  const event = parseSseLine(lines2[0]);
  assert.ok(event);
  assert.equal(event.type, 'token');
  assert.equal(event.text, 'Deus Caritas Est');
});

test('SseChunkBuffer handles multiple lines in a single TCP packet', () => {
  const buffer = new SseChunkBuffer();
  const multiline = 'data: {"text":"token1"}\ndata: {"text":"token2"}\ndata: [DONE]\n';
  const lines = buffer.push(multiline);

  assert.equal(lines.length, 3);
  assert.equal(parseSseLine(lines[0])?.text, 'token1');
  assert.equal(parseSseLine(lines[1])?.text, 'token2');
  assert.equal(parseSseLine(lines[2])?.type, 'done');
});

test('SseChunkBuffer flush retrieves trailing content on EOF', () => {
  const buffer = new SseChunkBuffer();
  buffer.push('data: trailing-without-newline');
  const flushed = buffer.flush();
  assert.equal(flushed.length, 1);
  assert.equal(flushed[0], 'data: trailing-without-newline');
  assert.equal(buffer.getPendingBuffer(), '');
});

test('simulateRAGStream produces structured candidate chunks and can be aborted', async () => {
  const receivedTokens: string[] = [];
  const controller = new AbortController();

  // Abort after small delay
  setTimeout(() => controller.abort(), 100);

  const { simulateRAGStream } = await import('./sse');
  await simulateRAGStream({
    body: { question: '¿Qué es el matrimonio?', sourceFilter: 'derecho_canonico', matchCount: 3 },
    signal: controller.signal,
    onToken: (delta) => receivedTokens.push(delta),
  });

  assert.ok(receivedTokens.length > 0, 'Should have received some tokens before abort');
});

