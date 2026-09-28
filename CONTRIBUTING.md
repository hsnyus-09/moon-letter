# Contributing

Moon Letter is a static web app. Keep changes small, and do not blur the security boundary: anyone with a link can read the letter.

## Development

```bash
npm ci
npm run dev
```

## Before submitting

```bash
npm run check
```

To run browser tests, install the Playwright browser first.

```bash
npx playwright install chromium
npm run test:e2e
```

## Boundaries to preserve

- Do not describe Moon Letter as an encrypted messaging tool.
- Update the README and tests whenever the fragment codec format or length limits change.
- Drafts must only be saved when the user has explicitly enabled draft saving.
- Do not add analytics scripts, remote fonts, or server APIs.
- Add or update tests when changing the codec, storage, export, hash routing, or reveal interaction.
