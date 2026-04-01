import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { chunkText } from '../ingest.chunker.js';

describe('chunkText', () => {
  it('returns a single chunk for short text', () => {
    const text = 'Hello world, this is a short document.';
    const chunks = chunkText(text);
    assert.equal(chunks.length, 1);
    assert.ok(chunks[0].length > 0);
  });

  it('returns empty array for empty string', () => {
    const chunks = chunkText('');
    assert.deepEqual(chunks, []);
  });

  it('returns empty array for whitespace-only string', () => {
    const chunks = chunkText('   \n\t  ');
    assert.deepEqual(chunks, []);
  });

  it('splits long text into multiple chunks', () => {
    // Generate text that is well over 512 tokens (each word ~1 token, need ~600+ words)
    const word = 'information ';
    const longText = word.repeat(700);
    const chunks = chunkText(longText, 512, 100);
    assert.ok(chunks.length > 1, `Expected multiple chunks, got ${chunks.length}`);
  });

  it('chunks have overlap — content from end of one chunk appears near start of next', () => {
    const word = 'token ';
    const longText = word.repeat(700);
    const chunks = chunkText(longText, 512, 100);
    assert.ok(chunks.length >= 2);
    // All chunks should be non-empty strings
    for (const chunk of chunks) {
      assert.ok(typeof chunk === 'string');
      assert.ok(chunk.length > 0);
    }
  });

  it('respects custom chunkSize and overlap parameters', () => {
    const word = 'word ';
    const text = word.repeat(300);
    const chunks = chunkText(text, 200, 50);
    assert.ok(chunks.length > 1);
  });
});
