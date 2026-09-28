# Security Policy

Moon Letter is not an encrypted messaging tool. The entire letter is contained in the URL fragment of the generated link, and anyone with the link can read it.

Do not put passwords, financial information, or sensitive personal information in a Moon Letter link.

## Reporting

Please report vulnerabilities privately, including reproduction steps, impact, and browser and operating system information. Do not post exploitable details in a public issue.

## Data Handling

- Letters are not stored on a server.
- Fragments are not automatically included in ordinary HTTP requests.
- Drafts are saved to this browser's `localStorage` only when the user enables draft saving.
- No remote fonts, analytics scripts, or server APIs are used.
