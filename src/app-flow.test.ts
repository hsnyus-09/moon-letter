import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('composer flow', () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
    document.body.innerHTML = '<div id="app"></div>';
    window.history.replaceState(null, '', '/');
  });

  it('keeps unsaved text across validation rerenders', async () => {
    await import('./main');
    const recipient = byId('recipient-input') as HTMLInputElement;
    const sender = byId('sender-input') as HTMLInputElement;
    recipient.value = '어머니';
    sender.value = '나';
    recipient.dispatchEvent(new Event('input'));
    sender.dispatchEvent(new Event('input'));

    (byId('create-letter') as HTMLButtonElement).click();

    expect((byId('recipient-input') as HTMLInputElement).value).toBe('어머니');
    expect((byId('sender-input') as HTMLInputElement).value).toBe('나');
    expect((byId('message-input') as HTMLTextAreaElement).value).toBe('');
  });

  it('clears an old generated link when the draft changes', async () => {
    await import('./main');
    const recipient = byId('recipient-input') as HTMLInputElement;
    const sender = byId('sender-input') as HTMLInputElement;
    const message = byId('message-input') as HTMLTextAreaElement;
    recipient.value = '친구';
    sender.value = '나';
    message.value = '보름달처럼 환한 밤!';
    recipient.dispatchEvent(new Event('input'));
    sender.dispatchEvent(new Event('input'));
    message.dispatchEvent(new Event('input'));

    (byId('create-letter') as HTMLButtonElement).click();
    expect((byId('letter-link') as HTMLInputElement).value).toContain('#ml1.');

    const edited = byId('message-input') as HTMLTextAreaElement;
    edited.value = '새 마음을 담은 편지';
    edited.dispatchEvent(new Event('input'));

    expect((byId('letter-link') as HTMLInputElement).value).toBe('');
    expect((byId('message-input') as HTMLTextAreaElement).value).toBe('새 마음을 담은 편지');
  });
});

function byId(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing #${id}`);
  }
  return element;
}
