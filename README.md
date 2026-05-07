# frontEnd
React 앱입니다. Create React App으로 부트스트랩되었습니다.

## 빠른 시작

### 1. 의존성 설치
프로젝트 경로에서 터미널을 열고:
```bash
npm install
```

### 2. 로컬 서버 실행 (게임 결과 및 exe 실행용)
별도의 터미널에서:
```bash
node local-server.js
```
- 이 서버는 `http://localhost:4000`에서 게임 결과 JSON을 제공합니다.
- 게임 실행 파일 경로도 이 서버를 통해 설정됩니다.

### 3. 백엔드 API 서버 확인
- 백엔드 서버가 `http://43.200.20.216`에서 실행 중이어야 합니다.
- 회원가입/로그인/프로필 저장 기능이 이 서버를 사용합니다.
- Swagger 문서: `http://43.200.20.216/swagger-ui/index.html#/`

### 4. 프론트엔드 개발 서버 실행
1.에서 생성한 터미널에서:
```bash
npm start
```
- 브라우저에서 `http://localhost:3000` 접속
- 회원가입 → 프로필 입력 → 게임 실행 → 결과 보기 순서로 테스트 가능

## 기능 설명
- **회원가입/로그인**: 백엔드 API를 통해 사용자 인증
- **프로필 관리**: 키, 체중, 우세손, 질병코드, 통증 정도 등 입력
- **게임 실행**: 로컬 exe 파일 실행
- **결과 보기**: 게임 결과를 로드하고 백엔드에 저장

## 설정 변경
- **백엔드 API 주소**: `src/App.js`의 `API_BASE` 변수 수정
- **게임 결과 파일 경로**: `local-server.js`의 `FILE_PATH` 수정 또는 `process.env.FILE_PATH` 설정
- **게임 exe 경로**: `local-server.js`의 `DEFAULT_EXE_FALLBACK` 수정 또는 `process.env.DEFAULT_EXE`/`process.env.EXE_PATH` 설정
- **파일/실행파일 선택**: `GET /choose-file` 또는 `GET /choose-exe`로 Windows 파일 선택 대화상자에서 경로 선택 가능

## 프로덕션 빌드
```bash
npm run build
```

## 테스트
```bash
npm test
```

## 주의사항
- 백엔드 서버가 실행 중이어야 정상 동작합니다.
- 게임 파일 경로는 실제 환경에 맞게 설정하세요.
- 정확한 의존성 버전 관리를 위해 `package-lock.json`을 함께 사용하세요.

실행
```powershell
# 1) 로컬 서버를 먼저 실행
node local-server.js

# 2) React 개발 서버 실행
npm start
```

보안 주의
- `POST /launch` 엔드포인트는 로컬에서 임의 실행 파일을 실행합니다. 이 서버는 로컬에서만 실행하거나 네트워크 접근을 제한해야 합니다. 인터넷에 노출하지 마세요.

개발 힌트
- `src/App.js`는 `/config` 응답을 문자열 또는 객체 모두 수용하도록 정규화합니다.
- `local-server.js`에 변경(예: exe-config.json 활성화)을 적용하면 클라이언트가 자동으로 새 설정을 사용합니다.

원하시면 `exe-config.sample.json`을 추가하거나 README에 배포/패키징 가이드를 더 작성해 드립니다.
