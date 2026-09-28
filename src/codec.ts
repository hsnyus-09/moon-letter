export interface MoonLetter {
  recipient: string;
  sender: string;
  body: string;
  createdAt: string;
}

export type DecodeResult =
  | { ok: true; value: MoonLetter }
  | { ok: false; reason: string };

const CODEC_VERSION = 'ml1';
export const MAX_FIELD_LENGTH = 160;
export const MAX_BODY_LENGTH = 1800;
export const MAX_HASH_LENGTH = 7600;
const textEncoder = new TextEncoder();

export function createLetter(input: {
  recipient: string;
  sender: string;
  body: string;
  createdAt?: string;
}): MoonLetter {
  const createdAt = input.createdAt ?? new Date().toISOString();
  if (Number.isNaN(Date.parse(createdAt))) {
    throw new Error('편지 날짜가 올바르지 않습니다.');
  }
  return {
    recipient: normalizeField(input.recipient, '받는 사람', MAX_FIELD_LENGTH),
    sender: normalizeField(input.sender, '보내는 사람', MAX_FIELD_LENGTH),
    body: normalizeField(input.body, '편지 내용', MAX_BODY_LENGTH),
    createdAt
  };
}

export function encodeLetter(letter: MoonLetter): string {
  const safeLetter = createLetter(letter);
  const json = JSON.stringify(safeLetter);
  const bytes = textEncoder.encode(json);
  const encoded = base64UrlEncode(bytes);
  const payload = `${CODEC_VERSION}.${encoded}`;
  if (payload.length > MAX_HASH_LENGTH) {
    throw new Error('편지가 너무 길어 링크로 만들 수 없습니다.');
  }
  return payload;
}

export function estimatePayloadLength(input: { recipient: string; sender: string; body: string }): number {
  const json = JSON.stringify({
    recipient: input.recipient.trim(),
    sender: input.sender.trim(),
    body: input.body.trim(),
    createdAt: new Date('2026-09-26T00:00:00.000Z').toISOString()
  });
  const bytes = textEncoder.encode(json);
  return `${CODEC_VERSION}.${base64UrlEncode(bytes)}`.length;
}

export function decodeLetter(fragment: string): DecodeResult {
  const payload = stripHash(fragment);
  if (!payload) {
    return { ok: false, reason: '편지 링크가 비어 있습니다.' };
  }
  if (payload.length > MAX_HASH_LENGTH) {
    return { ok: false, reason: '편지 링크가 너무 깁니다.' };
  }
  const [version, encoded, extra] = payload.split('.');
  if (version !== CODEC_VERSION || !encoded || extra !== undefined) {
    return { ok: false, reason: '지원하지 않는 편지 링크 형식입니다.' };
  }
  if (!/^[A-Za-z0-9_-]+$/.test(encoded)) {
    return { ok: false, reason: '편지 링크에 올바르지 않은 문자가 있습니다.' };
  }

  try {
    const json = new TextDecoder('utf-8', { fatal: true }).decode(base64UrlDecode(encoded));
    const parsed = JSON.parse(json) as unknown;
    return validateDecoded(parsed);
  } catch {
    return { ok: false, reason: '편지 링크를 읽을 수 없습니다.' };
  }
}

export function buildShareUrl(payload: string, href = globalThis.location.href): string {
  const url = new URL(href);
  url.hash = payload;
  return url.toString();
}

function validateDecoded(value: unknown): DecodeResult {
  if (!isRecord(value)) {
    return { ok: false, reason: '편지 데이터가 올바르지 않습니다.' };
  }
  const recipient = readBoundedString(value, 'recipient', MAX_FIELD_LENGTH);
  const sender = readBoundedString(value, 'sender', MAX_FIELD_LENGTH);
  const body = readBoundedString(value, 'body', MAX_BODY_LENGTH);
  const createdAt = readBoundedString(value, 'createdAt', 80);
  if (!recipient || !sender || !body || !createdAt) {
    return { ok: false, reason: '편지 데이터에 필요한 값이 없습니다.' };
  }
  if (Number.isNaN(Date.parse(createdAt))) {
    return { ok: false, reason: '편지 날짜가 올바르지 않습니다.' };
  }
  return { ok: true, value: { recipient, sender, body, createdAt } };
}

function readBoundedString(record: Record<string, unknown>, key: string, maxLength: number): string | null {
  const value = record[key];
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength) {
    return null;
  }
  return trimmed;
}

function normalizeField(value: string, label: string, maxLength: number): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${label}을 입력해 주세요.`);
  }
  if (trimmed.length > maxLength) {
    throw new Error(`${label}은 ${String(maxLength)}자 이하여야 합니다.`);
  }
  return trimmed;
}

function stripHash(fragment: string): string {
  return fragment.startsWith('#') ? fragment.slice(1) : fragment;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function base64UrlDecode(value: string): Uint8Array {
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/');
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}
