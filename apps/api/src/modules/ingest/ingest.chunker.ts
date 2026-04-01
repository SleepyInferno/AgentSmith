import { getEncoding } from 'js-tiktoken';

/**
 * Splits text into token-bounded chunks using cl100k_base encoding.
 *
 * @param text - Input text to chunk
 * @param chunkSize - Maximum tokens per chunk (default: 512)
 * @param overlap - Overlap in tokens between adjacent chunks (default: 100)
 * @returns Array of text strings, one per chunk. Empty for empty/whitespace input.
 */
export function chunkText(text: string, chunkSize = 512, overlap = 100): string[] {
  if (!text.trim()) return [];

  const enc = getEncoding('cl100k_base');
  const tokens = enc.encode(text);

  if (tokens.length <= chunkSize) {
    // Return the original text as a single chunk (no decode needed)
    return [text];
  }

  const chunks: string[] = [];
  const step = chunkSize - overlap;

  for (let start = 0; start < tokens.length; start += step) {
    const end = Math.min(start + chunkSize, tokens.length);
    const chunkTokens = Array.from(tokens.slice(start, end));
    chunks.push(enc.decode(chunkTokens));
    if (end === tokens.length) break;
  }

  return chunks;
}
