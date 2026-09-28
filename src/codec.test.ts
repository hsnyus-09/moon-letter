import { describe, expect, it } from 'vitest';
import {
  MAX_BODY_LENGTH,
  MAX_HASH_LENGTH,
  buildShareUrl,
  createLetter,
  decodeLetter,
  encodeLetter,
  estimatePayloadLength
} from './codec';

describe('moon letter codec', () => {
  it('round-trips Korean, emoji, and punctuation through a versioned URL fragment', () => {
    const letter = createLetter({
      recipient: '할머니 🌕',
      sender: '유성',
      body: '풍성한 한가위 보내세요. <script>alert("x")</script>',
      createdAt: '2026-09-26T10:00:00.000Z'
    });
    const payload = encodeLetter(letter);
    expect(payload.startsWith('ml1.')).toBe(true);
    expect(payload).not.toContain('<script>');
    expect(decodeLetter(`#${payload}`)).toEqual({ ok: true, value: letter });
  });

  it('rejects malformed, unsupported, oversized, and corrupt fragments', () => {
    expect(decodeLetter('')).toMatchObject({ ok: false });
    expect(decodeLetter('ml2.abc')).toMatchObject({ ok: false });
    expect(decodeLetter(`ml1.${'a'.repeat(MAX_HASH_LENGTH + 10)}`)).toMatchObject({ ok: false });
    expect(decodeLetter('ml1.@@@@')).toMatchObject({ ok: false });
    expect(decodeLetter('ml1.e30')).toMatchObject({ ok: false });
  });

  it('enforces body bounds before links are generated', () => {
    expect(() =>
      createLetter({
        recipient: 'A',
        sender: 'B',
        body: '달'.repeat(MAX_BODY_LENGTH + 1)
      })
    ).toThrow(/편지 내용/);
  });

  it('rejects invalid timestamps before creating a payload', () => {
    expect(() =>
      createLetter({
        recipient: 'A',
        sender: 'B',
        body: 'C',
        createdAt: 'not-a-date'
      })
    ).toThrow(/날짜/);
  });

  it('surfaces hash-size limits for worst-case Unicode content', () => {
    const estimate = estimatePayloadLength({
      recipient: '달'.repeat(160),
      sender: '별'.repeat(160),
      body: '한'.repeat(MAX_BODY_LENGTH)
    });
    expect(estimate).toBeGreaterThan(MAX_HASH_LENGTH);
    expect(() =>
      encodeLetter(
        createLetter({
          recipient: '달'.repeat(160),
          sender: '별'.repeat(160),
          body: '한'.repeat(MAX_BODY_LENGTH),
          createdAt: '2026-09-26T10:00:00.000Z'
        })
      )
    ).toThrow(/너무 길어/);
  });

  it('puts the payload in the URL fragment, not the path or query', () => {
    const url = buildShareUrl('ml1.payload', 'https://example.test/moon-letter/?theme=night');
    expect(url).toBe('https://example.test/moon-letter/?theme=night#ml1.payload');
  });

  it('recovers from the corrupt-link E2E fixture', () => {
    expect(decodeLetter('#ml1.corrupt-payload')).toMatchObject({ ok: false });
  });
});
