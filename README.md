# ReFit Analysis Dashboard

Spring 백엔드의 게임 기록을 불러와 수행 지표·데이터 품질·위험 신호·난이도 추천을 보여주는 React 대시보드입니다. 저장된 기록은 `React → Spring → 규칙 엔진 → Spring DB` 경로로 분석하며, 브라우저가 원본 기록을 AI 서버에 직접 전송하지 않습니다.

## 실행

```bash
npm install
npm start
```

브라우저에서 http://localhost:3000 접속 후 Spring 테스트 계정으로 로그인하면 분석 화면을 확인할 수 있습니다. 분석 대시보드는 인증 전에는 노출되지 않습니다.

샘플 JSON 미리보기는 기본적으로 `http://localhost:8000`의 AI 서버를 사용합니다. 저장된 게임 기록 분석은 Spring이 설정한 내부 AI 주소를 사용합니다.

## 사용자 흐름

1. 기존 ReFit 환영 화면에서 로그인 또는 회원가입
2. 신규 사용자는 테스트 프로필 저장 또는 건너뛰기
3. 인증 성공 후 분석 대시보드 진입
4. 저장된 게임 기록 선택 또는 샘플 분석

회원가입과 로그인은 브라우저 `localStorage`가 아니라 실제 Spring API를 사용합니다.

## 실제 Spring 기록 분석

1. Spring 계정으로 로그인
2. 상단 `게임 기록` 클릭
3. 저장된 게임 기록 선택
4. Spring이 상세 기록과 프로필을 규칙 엔진에 전달하고 전체 분석 결과를 DB에 저장
5. 화면에서 분석 ID, 저장 여부, 규칙 버전, 데이터 판정 가능 여부 확인
6. 여러 게임 기록에 저장된 분석을 최근 세션 회복 추세로 확인

비밀번호는 저장하지 않으며 Access Token만 현재 브라우저 탭의 `sessionStorage`에 보관합니다.

## 환경 변수

`.env` 파일을 만들거나 빌드 환경에 다음 값을 설정합니다.

```env
# 샘플 JSON 미리보기 전용
REACT_APP_AI_API_URL=http://localhost:8000
REACT_APP_BACKEND_API_URL=http://localhost:8080
```

운영 빌드는 `.env.production`을 사용합니다.

```env
REACT_APP_AI_API_URL=http://43.200.20.216/ai
REACT_APP_BACKEND_API_URL=http://43.200.20.216
```

현재는 빠른 시연을 위한 HTTP 데모 모드입니다. `main`에 병합되면 GitHub Actions가 테스트와 운영 빌드를 검증하고, 백엔드 배포 파이프라인이 이 저장소를 체크아웃해 동일한 Lightsail 서버의 `/`에 배포합니다. `/api`는 Spring, `/ai`는 AI 서버로 전달됩니다.

HTTP에서는 통신이 암호화되지 않으므로 테스트 계정과 비식별 데이터만 사용해야 합니다. 실제 사용자 테스트 전에는 HTTPS로 전환해야 합니다.

## 검증 및 빌드

```bash
CI=true npm test -- --watchAll=false
npm run build
```

HTTP 데모 공개 주소는 `http://43.200.20.216`입니다.
