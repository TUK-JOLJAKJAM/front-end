# ReFit Analysis Dashboard

Spring 백엔드의 게임 기록을 불러와 ReFit AI 서버로 분석하고, 수행 지표·데이터 품질·위험 신호·난이도 추천을 보여주는 React 대시보드입니다.

## 실행

```bash
npm install
npm start
```

브라우저에서 http://localhost:3000 접속 후 `샘플 분석 실행`을 누르면 전체 화면을 확인할 수 있습니다.

AI 서버는 기본적으로 `http://localhost:8000`을 사용합니다. 먼저 AI 서버를 실행해야 분석 요청이 성공합니다.

## 실제 Spring 기록 분석

1. 상단 `데이터 입력` 클릭
2. AI 서버와 Spring 백엔드 주소 확인
3. Spring 계정으로 로그인
4. 저장된 게임 기록 선택
5. 상세 기록과 프로필이 AI 서버로 전달되고 분석 결과가 표시됨

비밀번호는 저장하지 않으며 Access Token만 현재 브라우저 탭의 `sessionStorage`에 보관합니다.

## 환경 변수

`.env` 파일을 만들거나 빌드 환경에 다음 값을 설정합니다.

```env
REACT_APP_AI_API_URL=http://localhost:8000
REACT_APP_BACKEND_API_URL=http://localhost:8080
```

운영 빌드는 `.env.production`을 사용합니다.

```env
REACT_APP_AI_API_URL=https://43.200.20.216.sslip.io/ai
REACT_APP_BACKEND_API_URL=https://43.200.20.216.sslip.io
```

`main`에 병합되면 GitHub Actions가 테스트와 운영 빌드를 실행하고 GitHub Pages에 자동 배포합니다. 빌드 안에 HTTPS 운영 API 주소가 실제로 포함됐는지도 CI에서 검사합니다.

## 검증 및 빌드

```bash
CI=true npm test -- --watchAll=false
npm run build
```

GitHub Pages 기본 경로는 `https://tuk-joljakjam.github.io/front-end`로 설정되어 있습니다.
