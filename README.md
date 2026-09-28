# Moon Letter

Moon Letter는 추석 달빛 편지를 만들고 링크로 건네는 정적 웹앱입니다. 편지 내용은 URL의 `#` fragment 안에 들어가며, 서버로 저장하거나 전송하지 않습니다.

암호화 도구가 아닙니다. 링크를 가진 사람은 누구나 편지를 읽을 수 있습니다.

## 실행

Node.js 22 LTS(22.12 이상)를 사용합니다.

```bash
npm ci
npm run dev
```

개발 서버는 기본적으로 `http://localhost:5177`에서 실행됩니다.

## 링크와 저장

- fragment 형식은 `ml1.<base64url(utf8-json)>`입니다.
- URL fragment는 일반 HTTP 요청에 자동으로 포함되지 않습니다.
- 브라우저 확장, 스크린샷, 붙여넣기, 공유 앱을 통해 링크가 노출될 수 있습니다.
- 초안 저장은 사용자가 체크박스로 켤 때만 이 브라우저의 `localStorage`에 저장됩니다.
- 원격 폰트, 분석 스크립트, 서버 API를 사용하지 않습니다.

민감한 개인정보, 비밀번호, 금융 정보는 Moon Letter 링크에 넣지 마세요.

## 제한

- 받는 사람: 160자
- 보내는 사람: 160자
- 편지 본문: 1800자
- 전체 fragment: 7600자

편지 데이터가 손상됐거나 버전·길이·필수 항목이 맞지 않으면 복구 화면을 표시합니다.

## 사용

편지를 작성하고 링크를 복사해 보냅니다. 받는 사람은 달을 긁거나 바로 열기 버튼을 눌러 편지를 읽습니다. 읽은 편지는 SVG·PNG 이미지로 저장할 수 있습니다.

## 배포

```bash
npm run build
npm run preview
```

빌드한 `dist/`의 내용만 정적 호스팅에 올립니다. 빌드는 상대 경로 자산을 사용하므로 하위 경로 배포에도 맞습니다.

## 테스트

```bash
npm run check
```

브라우저 테스트까지 확인하려면 Playwright 브라우저를 먼저 설치합니다.

```bash
npx playwright install chromium
npm run test:e2e
```

## 문서

[기여 안내](CONTRIBUTING.md) · [보안 정책](SECURITY.md) · [라이선스](LICENSE)
