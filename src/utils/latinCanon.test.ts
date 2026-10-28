import test from 'node:test';
import assert from 'node:assert/strict';
import { extractLatinAndSpanish } from './latinCanon';

test('extractLatinAndSpanish extracts explicit delimiters cleanly', () => {
  const input = `### CANON - LATIN
Can. 1055 — Matrimoniale foedus...

### INTERPRETATIO - ESPAÑOL
El canon 1055 define la alianza matrimonial...`;

  const result = extractLatinAndSpanish(input);
  assert.ok(result.latin.includes('Matrimoniale foedus'));
  assert.ok(result.spanish.includes('alianza matrimonial'));
});

test('extractLatinAndSpanish provides authentic Latin text for marriage questions', () => {
  const result = extractLatinAndSpanish('Explicación sobre el consentimiento matrimonial', '¿Qué dice el canon 1055?');
  assert.ok(result.latin.includes('Can. 1055'));
  assert.ok(result.latin.includes('Matrimoniale foedus'));
  assert.ok(result.spanish.length > 0);
});

test('extractLatinAndSpanish provides authentic Latin text for Canon 1752 and salus animarum', () => {
  const result = extractLatinAndSpanish('Trata sobre la ley suprema', 'Can. 1752 salus animarum');
  assert.ok(result.latin.includes('salute animarum'));
  assert.ok(result.latin.includes('suprema semper lex'));
});
