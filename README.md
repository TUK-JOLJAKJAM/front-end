# frontEnd
React 앱입니다. Create React App으로 부트스트랩되었습니다.

## 빠른 시작

의존성 설치:
```bash
npm install
```

개발 서버 실행:
```bash
npm start
```

프로덕션 빌드:
```bash
npm run build
```

테스트 실행:
```bash
npm test
```

## 주의
- 정확한 의존성 버전 관리를 위해 `package-lock.json`을 함께 올려두는 것이 좋습니다.

## 배포 관련
CI/배포 환경에서는 `npm ci`로 잠금된 버전대로 설치하는 것을 권장합니다.

## 로컬 개발용: 결과 파일 및 게임 실행 파일 설정

이 저장소는 프론트엔드와 별도로 로컬에서 실행되는 `local-server.js`를 통해
게임 결과(JSON) 파일과 게임 실행(.exe)을 연결하도록 설계되어 있습니다.

요약 (현재 동작)
- 프론트엔드(`src/App.js`)는 결과를 `http://localhost:4000/woodgame`에서 가져옵니다.
- 프론트엔드는 실행 파일 경로를 서버의 `/config`에서 읽어옵니다. `/config`는 현재 구조상 객체형태로 `{ default_exe: 'C:\\...' }`를 반환합니다.
- `local-server.js`는 exe 경로를 설정하는 우선순위를 지원합니다: 환경변수(`DEFAULT_EXE`/`EXE_PATH`) -> (비활성) `exe-config.json` 파일 -> 코드 내 fallback 값.

설정 방법
1. 결과 JSON 파일 경로 설정
	- `local-server.js`의 `FILE_PATH` 상수를 실제 결과 JSON 파일 경로로 설정합니다.
	- 예시 경로: `C:\\Users\\zsxcd\\AppData\\LocalLow\\ReFit\\Refit_Demo\\WoodGameData.json`

2. exe 경로 설정 (권장: 환경변수)
	- `local-server.js`의 `DEFAULT_EXE_FALLBACK` 상수를 실제 exe 파일 경로로 설정합니다.
	- 예시 경로: `C:\\Users\\zsxcd\\Downloads\\ReFit_Demo_Arduino_Com6\\ReFit_Demo.exe`

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
