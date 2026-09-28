export interface StoredDraft {
  enabled: boolean;
  recipient: string;
  sender: string;
  body: string;
}

export type StorageResult<T> = { ok: true; value: T } | { ok: false; reason: string };

const STORAGE_KEY = 'moon-letter:draft:v1';

export function loadDraft(): StorageResult<StoredDraft> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ok: true, value: { enabled: false, recipient: '', sender: '', body: '' } };
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!isDraft(parsed)) {
      clearDraft();
      return { ok: false, reason: '저장된 초안 형식이 올바르지 않아 지웠습니다.' };
    }
    return { ok: true, value: parsed };
  } catch {
    return { ok: false, reason: '브라우저 저장소를 읽을 수 없습니다.' };
  }
}

export function saveDraft(draft: StoredDraft): StorageResult<StoredDraft> {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    return { ok: true, value: draft };
  } catch {
    return { ok: false, reason: '브라우저 저장소에 초안을 저장할 수 없습니다.' };
  }
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Clearing is best effort when storage is unavailable.
  }
}

function isDraft(value: unknown): value is StoredDraft {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const draft = value as Record<string, unknown>;
  return (
    typeof draft.enabled === 'boolean' &&
    typeof draft.recipient === 'string' &&
    typeof draft.sender === 'string' &&
    typeof draft.body === 'string'
  );
}
