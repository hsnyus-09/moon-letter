# Contributing

Moon Letter는 정적 웹앱입니다. 변경은 작게 유지하고, 링크 보유자가 편지를 읽을 수 있다는 보안 경계를 흐리지 말아 주세요.

## 개발

```bash
npm ci
npm run dev
```

## 제출 전 확인

```bash
npm run check
```

브라우저 테스트까지 확인하려면 Playwright 브라우저를 먼저 설치합니다.

```bash
npx playwright install chromium
npm run test:e2e
```

## 지켜야 할 경계

- Moon Letter를 암호화된 메시징 도구처럼 설명하지 않습니다.
- fragment codec 형식과 길이 제한이 바뀌면 README와 테스트를 함께 갱신합니다.
- 초안 저장은 사용자가 명시적으로 켠 경우에만 동작해야 합니다.
- 분석 스크립트, 원격 폰트, 서버 API를 추가하지 않습니다.
- codec, storage, export, hash routing, reveal 상호작용을 바꾸면 테스트를 추가하거나 갱신합니다.
