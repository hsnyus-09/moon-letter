# Moon Letter

Moon Letter is a static web app for creating Chuseok moonlight letters and sharing them via a link. The letter content is embedded in the URL's `#` fragment; it is not stored or sent to a server.

This is not an encryption tool. Anyone with the link can read the letter.

## Run

Use Node.js 22 LTS (22.12 or later).

```bash
npm ci
npm run dev
```

The development server runs at `http://localhost:5177` by default.

## Links and storage

- The fragment format is `ml1.<base64url(utf8-json)>`.
- URL fragments are not automatically included in ordinary HTTP requests.
- Links may be exposed through browser extensions, screenshots, copy-and-paste, or sharing apps.
- Drafts are saved to this browser's `localStorage` only when the user enables the checkbox.
- No remote fonts, analytics scripts, or server APIs are used.

Do not put sensitive personal information, passwords, or financial information in a Moon Letter link.

## Limits

- Recipient: 160 characters
- Sender: 160 characters
- Letter body: 1,800 characters
- Entire fragment: 7,600 characters

If letter data is corrupted or its version, length, or required fields do not match, a recovery screen is displayed.

## Usage

Write a letter and send the copied link. Recipients can scratch the moon or press the “Open now” button to read the letter. An opened letter can be saved as an SVG or PNG image.

## Deployment

```bash
npm run build
npm run preview
```

Upload only the contents of the built `dist/` directory to static hosting. The build uses relative asset paths, so it also works when deployed under a subpath.

## Tests

```bash
npm run check
```

To run browser tests, install the Playwright browser first.

```bash
npx playwright install chromium
npm run test:e2e
```

## Documentation

[Contributing guide](CONTRIBUTING.md) · [Security policy](SECURITY.md) · [License](LICENSE)
