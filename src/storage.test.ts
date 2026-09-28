import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearDraft, loadDraft, saveDraft } from './storage';

describe('draft storage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('defaults to disabled storage and saves only when called explicitly', () => {
    expect(loadDraft()).toEqual({ ok: true, value: { enabled: false, recipient: '', sender: '', body: '' } });
    expect(saveDraft({ enabled: true, recipient: '달', sender: '나', body: '안녕' })).toMatchObject({ ok: true });
    expect(loadDraft()).toEqual({ ok: true, value: { enabled: true, recipient: '달', sender: '나', body: '안녕' } });
  });

  it('clears malformed drafts without leaking body into error text', () => {
    localStorage.setItem('moon-letter:draft:v1', '{"enabled":true,"body":42}');
    const result = loadDraft();
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) {
      expect(result.reason).not.toContain('42');
    }
    expect(localStorage.getItem('moon-letter:draft:v1')).toBeNull();
  });

  it('handles unavailable storage', () => {
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(saveDraft({ enabled: true, recipient: 'A', sender: 'B', body: 'C' })).toMatchObject({ ok: false });
    clearDraft();
  });
});
