import mammoth from 'mammoth';
import { extractText, getDocumentProxy } from 'unpdf';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import type { ParseResult } from './ingest.types.js';

const SUPPORTED_EXTENSIONS = new Set(['.md', '.txt', '.docx', '.pdf']);

export function isSupportedFile(filePath: string): boolean {
  return SUPPORTED_EXTENSIONS.has(extname(filePath).toLowerCase());
}

export async function parsePlainText(filePath: string): Promise<ParseResult> {
  const text = await readFile(filePath, 'utf-8');
  return { text };
}

export async function parseDocx(filePath: string): Promise<ParseResult> {
  const data = await readFile(filePath);
  const result = await mammoth.extractRawText({ buffer: data });
  return { text: result.value };
}

export async function parsePdf(filePath: string): Promise<ParseResult> {
  const data = await readFile(filePath);
  const pdf = await getDocumentProxy(new Uint8Array(data));
  const { text } = await extractText(pdf, { mergePages: true });
  return { text };
}

export async function parseFile(filePath: string): Promise<ParseResult> {
  const ext = extname(filePath).toLowerCase();
  switch (ext) {
    case '.md':
    case '.txt':
      return parsePlainText(filePath);
    case '.docx':
      return parseDocx(filePath);
    case '.pdf':
      return parsePdf(filePath);
    default:
      throw new Error(`Unsupported file extension: ${ext}`);
  }
}
