import type { MoonLetter } from './codec';

export function buildKeepsakeSvg(letter: MoonLetter): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1600" viewBox="0 0 1200 1600" role="img" aria-label="Moon Letter keepsake">
  <rect width="1200" height="1600" fill="#111634"/>
  <circle cx="910" cy="210" r="150" fill="#f8efd1"/>
  <circle cx="850" cy="170" r="34" fill="#ded0aa" opacity=".55"/>
  <circle cx="950" cy="260" r="48" fill="#cdbd91" opacity=".5"/>
  <rect x="150" y="360" width="900" height="900" rx="20" fill="#fffaf0"/>
  <path d="M150 430c210 60 670 60 900 0" fill="none" stroke="#d9c9df" stroke-width="8"/>
  <text x="220" y="520" fill="#545071" font-size="38" font-family="Georgia, 'Noto Serif KR', serif">To</text>
  <text x="220" y="600" fill="#25233e" font-size="70" font-family="Georgia, 'Noto Serif KR', serif">${escapeXml(letter.recipient)}</text>
  ${wrapText(letter.body, 24, 11)
    .map(
      (line, index) => {
        const y = String(730 + index * 58);
        return `<text x="220" y="${y}" fill="#34304e" font-size="40" font-family="'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif">${escapeXml(line)}</text>`;
      }
    )
    .join('\n  ')}
  <text x="220" y="1150" fill="#545071" font-size="36" font-family="Georgia, 'Noto Serif KR', serif">From ${escapeXml(letter.sender)}</text>
  <text x="220" y="1210" fill="#6f698c" font-size="28" font-family="'Apple SD Gothic Neo', sans-serif">Moon Letter · fragment-only, not encrypted</text>
</svg>`;
}

export function downloadKeepsakeSvg(letter: MoonLetter): void {
  downloadBlob(new Blob([buildKeepsakeSvg(letter)], { type: 'image/svg+xml' }), 'moon-letter.svg');
}

export async function downloadKeepsakePng(letter: MoonLetter): Promise<void> {
  const svg = buildKeepsakeSvg(letter);
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const image = new Image();
    image.decoding = 'async';
    const loaded = new Promise<void>((resolve, reject) => {
      image.addEventListener(
        'load',
        () => {
          resolve();
        },
        { once: true }
      );
      image.addEventListener(
        'error',
        () => {
          reject(new Error('Image failed to load.'));
        },
        { once: true }
      );
    });
    image.src = url;
    await loaded;
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 1600;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas unavailable.');
    }
    context.drawImage(image, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/png');
    });
    if (!blob) {
      throw new Error('PNG export failed.');
    }
    downloadBlob(blob, 'moon-letter.png');
  } finally {
    URL.revokeObjectURL(url);
  }
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function wrapText(value: string, maxChars: number, maxLines: number): string[] {
  const words = value.replace(/\s+/g, ' ').trim().split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
    while (current.length > maxChars) {
      lines.push(current.slice(0, maxChars));
      current = current.slice(maxChars);
    }
    if (lines.length >= maxLines) {
      break;
    }
  }
  if (current && lines.length < maxLines) {
    lines.push(current);
  }
  return lines.length > 0 ? lines : [''];
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}
