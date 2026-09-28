import './styles.css';
import {
  MAX_BODY_LENGTH,
  MAX_FIELD_LENGTH,
  MAX_HASH_LENGTH,
  buildShareUrl,
  createLetter,
  decodeLetter,
  encodeLetter,
  estimatePayloadLength,
  type MoonLetter
} from './codec';
import { downloadKeepsakePng, downloadKeepsakeSvg } from './keepsake';
import { loadDraft, saveDraft, clearDraft, type StoredDraft } from './storage';

type Mode = 'compose' | 'reveal' | 'read' | 'invalid';

interface AppState {
  mode: Mode;
  letter: MoonLetter | null;
  composerDraft: Omit<StoredDraft, 'enabled'>;
  shareUrl: string;
  status: string;
  error: string;
  persistenceEnabled: boolean;
}

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) {
  throw new Error('App root is missing.');
}
const appRoot = app;

const decoded = decodeLetter(window.location.hash);
const draft = loadDraft();
const state: AppState = {
  mode: decoded.ok ? 'reveal' : window.location.hash ? 'invalid' : 'compose',
  letter: decoded.ok ? decoded.value : null,
  composerDraft: draft.ok ? { recipient: draft.value.recipient, sender: draft.value.sender, body: draft.value.body } : { recipient: '', sender: '', body: '' },
  shareUrl: decoded.ok ? window.location.href : '',
  status: '',
  error: decoded.ok || !window.location.hash ? '' : decoded.reason,
  persistenceEnabled: draft.ok ? draft.value.enabled : false
};

window.addEventListener('hashchange', () => {
  routeFromCurrentHash();
});

render();

function render(): void {
  appRoot.replaceChildren(createLayout());
  if (state.mode === 'reveal' && state.letter) {
    setupScratchMoon(state.letter);
  }
}

function routeFromCurrentHash(): void {
  const current = decodeLetter(window.location.hash);
  if (current.ok) {
    state.mode = 'reveal';
    state.letter = current.value;
    state.shareUrl = window.location.href;
    state.status = '';
    state.error = '';
  } else if (window.location.hash) {
    state.mode = 'invalid';
    state.letter = null;
    state.shareUrl = '';
    state.status = '';
    state.error = current.reason;
  } else {
    state.mode = 'compose';
    state.letter = null;
    state.shareUrl = '';
    state.status = '';
    state.error = '';
  }
  render();
}

function createLayout(): HTMLElement {
  const shell = el('main', { className: 'app-shell' }, [
    createStars(),
    el('header', { className: 'topbar' }, [
      el('a', { className: 'brand', href: basePath() }, [
        el('span', { className: 'brand-mark', ariaHidden: 'true' }, ['◐']),
        el('span', {}, ['Moon Letter'])
      ]),
      el('p', { className: 'privacy-pill' }, ['링크 보유자는 읽을 수 있어요 · 암호화 아님'])
    ]),
    state.mode === 'compose' ? createComposer() : null,
    state.mode === 'reveal' && state.letter ? createReveal(state.letter) : null,
    state.mode === 'read' && state.letter ? createReader(state.letter) : null,
    state.mode === 'invalid' ? createInvalid() : null,
    createFooter()
  ]);
  return shell;
}

function createComposer(): HTMLElement {
  const draftValue = state.composerDraft;
  const recipient = input('recipient-input', '받는 사람', draftValue.recipient, MAX_FIELD_LENGTH);
  const sender = input('sender-input', '보내는 사람', draftValue.sender, MAX_FIELD_LENGTH);
  const body = textarea('message-input', '편지 내용', draftValue.body, MAX_BODY_LENGTH);
  const previewTo = el('strong', {}, [draftValue.recipient || '소중한 사람']);
  const previewBody = el('p', { className: 'preview-body' }, [draftValue.body || '달빛 아래 전하고 싶은 말을 적어 주세요.']);
  const previewFrom = el('span', {}, [draftValue.sender || '나']);
  const status = el('p', { className: 'form-status', ariaLive: 'polite' }, [state.status]);
  const error = el('p', { className: 'form-error', role: 'alert' }, [state.error]);
  const counter = el('p', { className: 'counter', ariaLive: 'polite' });
  const linkOutput = input('letter-link', '생성된 링크', state.shareUrl, 9000);
  linkOutput.readOnly = true;
  const persist = input('persist', '이 기기에 초안 저장', '', 1);
  persist.type = 'checkbox';
  persist.checked = state.persistenceEnabled;
  persist.className = 'checkbox-input';

  const updatePreview = (clearGeneratedLink: boolean): void => {
    state.composerDraft = { recipient: recipient.value, sender: sender.value, body: body.value };
    previewTo.textContent = recipient.value.trim() || '소중한 사람';
    previewBody.textContent = body.value.trim() || '달빛 아래 전하고 싶은 말을 적어 주세요.';
    previewFrom.textContent = sender.value.trim() || '나';
    const estimate = estimatePayloadLength({ recipient: recipient.value, sender: sender.value, body: body.value });
    counter.textContent = `링크 크기 예상 ${estimate.toLocaleString('ko-KR')} / ${MAX_HASH_LENGTH.toLocaleString('ko-KR')}자`;
    counter.classList.toggle('danger', estimate > MAX_HASH_LENGTH);
    if (clearGeneratedLink && state.shareUrl) {
      state.shareUrl = '';
      state.letter = null;
      linkOutput.value = '';
      window.history.replaceState(null, '', basePath());
      state.status = '내용이 바뀌어 이전 링크를 비웠습니다. 다시 만들어 주세요.';
      status.textContent = state.status;
    }
    maybePersist({ recipient: recipient.value, sender: sender.value, body: body.value });
  };

  for (const field of [recipient, sender, body]) {
    field.addEventListener('input', () => {
      updatePreview(true);
    });
  }
  persist.addEventListener('change', () => {
    state.persistenceEnabled = persist.checked;
    if (persist.checked) {
      state.composerDraft = { recipient: recipient.value, sender: sender.value, body: body.value };
      const result = saveDraft({ enabled: true, recipient: recipient.value, sender: sender.value, body: body.value });
      state.status = result.ok ? '초안을 이 기기에만 저장합니다.' : result.reason;
    } else {
      clearDraft();
      state.status = '초안 저장을 껐고 저장된 초안을 지웠습니다.';
    }
    state.error = '';
    render();
  });

  const generate = button('link-button primary', '링크 만들기', () => {
    try {
      state.composerDraft = { recipient: recipient.value, sender: sender.value, body: body.value };
      const letter = createLetter({ recipient: recipient.value, sender: sender.value, body: body.value });
      const payload = encodeLetter(letter);
      state.letter = letter;
      state.shareUrl = buildShareUrl(payload, window.location.href);
      state.status = '링크가 준비되었습니다. 주소 끝의 # 뒤에 편지가 들어 있습니다.';
      state.error = '';
      linkOutput.value = state.shareUrl;
      window.history.replaceState(null, '', state.shareUrl);
    } catch (errorValue) {
      state.error = errorValue instanceof Error ? errorValue.message : '링크를 만들 수 없습니다.';
      state.status = '';
    }
    render();
  });
  generate.id = 'create-letter';
  generate.prepend(icon('moon'));

  const copy = button('link-button', '복사', () => {
    void copyText(state.shareUrl, '링크를 복사했습니다.');
  });
  copy.id = 'copy-link';
  copy.prepend(icon('copy'));

  const share = button('link-button', '공유', () => {
    void shareText(state.shareUrl);
  });
  share.prepend(icon('share'));

  const clear = button('link-button', '지우기', () => {
    recipient.value = '';
    sender.value = '';
    body.value = '';
    state.composerDraft = { recipient: '', sender: '', body: '' };
    state.shareUrl = '';
    state.letter = null;
    clearDraft();
    state.status = '입력과 저장된 초안을 지웠습니다.';
    state.error = '';
    updatePreview(false);
    render();
  });
  clear.id = 'new-letter';
  clear.prepend(icon('reset'));

  const composer = section('composer-grid', [
    el('div', { className: 'hero-copy' }, [
      el('p', { className: 'eyebrow' }, ['추석 달빛 편지']),
      el('h1', {}, ['달빛에 담아,\n마음을 전해요.']),
      el('p', { className: 'lede' }, [
        '서버로 보내지 않는 정적 웹 편지입니다. 링크의 # 조각에 내용이 담기며, 암호화가 아니므로 링크를 가진 사람은 읽을 수 있습니다.'
      ])
    ]),
    el('form', { className: 'composer-panel' }, [
      labelWrap('받는 사람', recipient),
      labelWrap('보내는 사람', sender),
      labelWrap('편지 내용', body),
      counter,
      el('label', { className: 'persist-row' }, [persist, el('span', {}, ['명시적으로 이 기기에 초안 저장'])]),
      el('div', { className: 'action-row' }, [generate, copy, share, clear]),
      labelWrap('생성된 링크', linkOutput),
      status,
      error
    ]),
    el('aside', { className: 'letter-preview', ariaLabel: '편지 미리보기' }, [
      el('div', { className: 'paper-letter' }, [
        el('span', { className: 'letter-small' }, ['To']),
        previewTo,
        previewBody,
        el('span', { className: 'letter-from' }, ['From ', previewFrom])
      ])
    ])
  ]);
  updatePreview(false);
  return composer;
}

function createReveal(letter: MoonLetter): HTMLElement {
  const revealButton = button('link-button primary reveal-now', '키보드로 바로 열기', () => {
    setMode('read');
  });
  revealButton.id = 'reveal-letter';
  revealButton.prepend(icon('spark'));
  return section('reveal-grid', [
    el('div', { className: 'moon-stage' }, [
      el('div', { className: 'giant-moon', ariaHidden: 'true' }),
      el('canvas', { className: 'scratch-canvas', width: '620', height: '620', ariaHidden: 'true' })
    ]),
    el('div', { className: 'reveal-copy' }, [
      el('p', { className: 'eyebrow' }, ['달 표면을 문질러 주세요']),
      el('h1', {}, [`${letter.recipient}에게 온 달빛 편지`]),
      el('p', { className: 'lede' }, ['마우스나 손가락으로 달을 긁으면 종이 편지가 열립니다. 움직임이 불편하면 버튼으로 바로 열 수 있습니다.']),
      revealButton,
      withId(
        button('link-button', '새 편지 쓰기', () => {
          newLetter();
        }),
        'new-letter'
      )
    ])
  ]);
}

function createReader(letter: MoonLetter): HTMLElement {
  const date = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'long' }).format(new Date(letter.createdAt));
  const copy = button('link-button', '링크 복사', () => {
    void copyText(window.location.href, '읽기 링크를 복사했습니다.');
  });
  copy.id = 'copy-link';
  copy.prepend(icon('copy'));
  const svg = button('link-button', 'SVG 저장', () => {
    downloadKeepsakeSvg(letter);
  });
  svg.prepend(icon('download'));
  const png = button('link-button', 'PNG 저장', () => {
    void downloadKeepsakePng(letter).catch(() => {
      state.status = 'PNG를 만들 수 없어 SVG 저장을 이용해 주세요.';
      render();
    });
  });
  png.prepend(icon('image'));
  return section('reader-grid', [
    el('article', { className: 'read-letter', id: 'letter-content' }, [
      el('span', { className: 'letter-small' }, [date]),
      el('h1', {}, [letter.recipient]),
      el('p', { className: 'read-body' }, [letter.body]),
      el('p', { className: 'signature' }, [`${letter.sender} 드림`])
    ]),
    el('aside', { className: 'reader-actions' }, [
      el('p', { className: 'eyebrow' }, ['Moon Letter']),
      el('h2', {}, ['이 링크는 비밀 상자가 아닙니다.']),
      el('p', {}, ['내용은 URL 조각에 들어 있으며 암호화되지 않습니다. 서버 요청에는 자동으로 붙지 않지만, 링크를 받은 사람은 누구나 읽을 수 있습니다.']),
      el('div', { className: 'action-row' }, [copy, svg, png]),
      withId(
        button('link-button primary', '답장 쓰기', () => {
          replyLetter(letter);
        }),
        'create-letter'
      ),
      withId(
        button('link-button', '새 편지', () => {
          newLetter();
        }),
        'new-letter'
      ),
      el('p', { className: 'form-status', ariaLive: 'polite' }, [state.status])
    ])
  ]);
}

function createInvalid(): HTMLElement {
  const invalid = section('invalid-state', [
    el('div', { className: 'paper-letter compact' }, [
      el('p', { className: 'eyebrow' }, ['링크를 열 수 없습니다']),
      el('h1', {}, ['달빛 편지가 깨졌어요.']),
      el('p', {}, [state.error || '지원하지 않는 편지 링크입니다.']),
      el('p', {}, ['링크를 다시 받거나 새 편지를 작성해 주세요.']),
      withId(
        button('link-button primary', '새 편지 쓰기', () => {
          newLetter();
        }),
        'new-letter'
      )
    ])
  ]);
  invalid.id = 'invalid-link';
  return invalid;
}

function createFooter(): HTMLElement {
  return el('footer', { className: 'site-footer' }, [
    el('p', {}, ['No analytics. No remote fonts. Fragment links are not encryption.']),
    el('p', {}, ['정적 배포에 적합하며 초안 저장은 사용자가 켤 때만 이 브라우저에 저장됩니다.'])
  ]);
}

function setupScratchMoon(letter: MoonLetter): void {
  const canvas = document.querySelector<HTMLCanvasElement>('.scratch-canvas');
  if (!canvas) {
    return;
  }
  const context = canvas.getContext('2d');
  if (!context) {
    return;
  }
  drawMoonCover(context, canvas.width, canvas.height);
  let drawing = false;
  let revealed = 0;
  const scratch = (clientX: number, clientY: number): void => {
    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;
    context.globalCompositeOperation = 'destination-out';
    context.beginPath();
    context.arc(x, y, 42, 0, Math.PI * 2);
    context.fill();
    context.globalCompositeOperation = 'source-over';
    revealed += 1;
    if (revealed > 18) {
      state.letter = letter;
      setMode('read');
    }
  };
  canvas.addEventListener('pointerdown', (event) => {
    drawing = true;
    canvas.setPointerCapture(event.pointerId);
    scratch(event.clientX, event.clientY);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (drawing) {
      scratch(event.clientX, event.clientY);
    }
  });
  canvas.addEventListener('pointerup', () => {
    drawing = false;
  });
}

function drawMoonCover(context: CanvasRenderingContext2D, width: number, height: number): void {
  context.clearRect(0, 0, width, height);
  const gradient = context.createRadialGradient(width * 0.38, height * 0.3, 20, width / 2, height / 2, width * 0.48);
  gradient.addColorStop(0, '#fff8df');
  gradient.addColorStop(0.62, '#efe0b2');
  gradient.addColorStop(1, '#bda978');
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(width / 2, height / 2, width * 0.44, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = 'rgba(89, 69, 114, 0.16)';
  for (const crater of [
    [235, 220, 34],
    [375, 275, 52],
    [290, 380, 44],
    [430, 410, 24],
    [180, 350, 22]
  ] as const) {
    context.beginPath();
    context.arc(crater[0], crater[1], crater[2], 0, Math.PI * 2);
    context.fill();
  }
}

function maybePersist(values: Omit<StoredDraft, 'enabled'>): void {
  if (!state.persistenceEnabled) {
    return;
  }
  const result = saveDraft({ enabled: true, ...values });
  if (!result.ok) {
    state.status = result.reason;
  }
}

async function copyText(value: string, successMessage: string): Promise<void> {
  if (!value) {
    state.error = '먼저 링크를 만들어 주세요.';
    render();
    return;
  }
  try {
    await navigator.clipboard.writeText(value);
    state.status = successMessage;
    state.error = '';
  } catch {
    const helper = document.createElement('textarea');
    helper.value = value;
    helper.setAttribute('readonly', '');
    helper.style.position = 'fixed';
    helper.style.opacity = '0';
    document.body.append(helper);
    helper.select();
    // Clipboard API is unavailable in some static-file or older-browser contexts.
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    const copied = document.execCommand('copy');
    helper.remove();
    state.status = copied ? successMessage : '복사할 수 없어 링크 입력칸에서 직접 복사해 주세요.';
  }
  render();
}

async function shareText(value: string): Promise<void> {
  if (!value) {
    state.error = '먼저 링크를 만들어 주세요.';
    render();
    return;
  }
  if ('share' in navigator) {
    try {
      await navigator.share({ title: 'Moon Letter', text: '달빛 편지가 도착했어요.', url: value });
      state.status = '공유 창을 열었습니다.';
    } catch {
      state.status = '공유가 취소되었습니다.';
    }
  } else {
    await copyText(value, '공유 기능 대신 링크를 복사했습니다.');
    return;
  }
  render();
}

function setMode(mode: Mode): void {
  state.mode = mode;
  state.status = '';
  state.error = '';
  render();
}

function replyLetter(letter: MoonLetter): void {
  window.history.replaceState(null, '', basePath());
  state.mode = 'compose';
  state.letter = null;
  state.composerDraft = { recipient: letter.sender, sender: letter.recipient, body: '' };
  state.shareUrl = '';
  state.status = `${letter.sender}에게 답장을 써 보세요.`;
  state.error = '';
  render();
}

function newLetter(): void {
  window.history.replaceState(null, '', basePath());
  state.mode = 'compose';
  state.letter = null;
  state.composerDraft = { recipient: '', sender: '', body: '' };
  state.shareUrl = '';
  state.error = '';
  state.status = '';
  render();
}

function basePath(): string {
  return `${window.location.pathname}${window.location.search}`;
}

function section(className: string, children: Array<Node | string | null>): HTMLElement {
  return el('section', { className }, children);
}

function labelWrap(text: string, field: HTMLInputElement | HTMLTextAreaElement): HTMLLabelElement {
  return el('label', { className: 'field' }, [el('span', {}, [text]), field]);
}

function input(id: string, label: string, value: string, maxLength: number): HTMLInputElement {
  const field = el('input', {
    id,
    name: id,
    ariaLabel: label,
    maxLength: String(maxLength),
    value
  });
  return field;
}

function textarea(id: string, label: string, value: string, maxLength: number): HTMLTextAreaElement {
  return el('textarea', {
    id,
    name: id,
    ariaLabel: label,
    maxLength: String(maxLength),
    rows: '8',
    value
  });
}

function button(className: string, text: string, handler: () => void): HTMLButtonElement {
  const element = el('button', { type: 'button', className }, [text]);
  element.addEventListener('click', handler);
  return element;
}

function withId<T extends HTMLElement>(element: T, id: string): T {
  element.id = id;
  return element;
}

function icon(name: 'moon' | 'copy' | 'share' | 'reset' | 'spark' | 'download' | 'image'): SVGSVGElement {
  const paths: Record<typeof name, string> = {
    moon: 'M21 12.8A8.8 8.8 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z',
    copy: 'M8 8h11v11H8z M5 5h11',
    share: 'M4 12v7h16v-7 M12 15V3 M7 8l5-5 5 5',
    reset: 'M4 7v5h5 M5 12a7 7 0 1 0 2-5',
    spark: 'M12 2l2.7 6.8L22 12l-7.3 3.2L12 22l-2.7-6.8L2 12l7.3-3.2Z',
    download: 'M12 3v12 M7 10l5 5 5-5 M5 21h14',
    image: 'M4 5h16v14H4z M7 15l3-3 3 3 2-2 3 3 M8 9h.1'
  };
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', paths[name]);
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', '1.8');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');
  svg.append(path);
  return svg;
}

function createStars(): HTMLElement {
  const stars = el('div', { className: 'stars', ariaHidden: 'true' });
  for (let index = 0; index < 72; index += 1) {
    const x = String((index * 37) % 100);
    const y = String((index * 61) % 100);
    const size = String(1 + (index % 3));
    const duration = String(2 + (index % 5));
    const star = el('i', {
      style: `--x:${x}%;--y:${y}%;--s:${size}px;--d:${duration}s;`
    });
    stars.append(star);
  }
  return stars;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Record<string, string | boolean> = {},
  children: Array<Node | string | null> = []
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === 'className') {
      element.className = String(value);
    } else if (key === 'ariaHidden') {
      element.setAttribute('aria-hidden', String(value));
    } else if (key === 'ariaLabel') {
      element.setAttribute('aria-label', String(value));
    } else if (key === 'style') {
      element.setAttribute('style', String(value));
    } else if (key in element) {
      Reflect.set(element, key, value);
    } else {
      element.setAttribute(key, String(value));
    }
  }
  for (const child of children) {
    if (child !== null) {
      element.append(child);
    }
  }
  return element;
}
