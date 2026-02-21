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


## 로컬 개발용: 결과 파일 경로 및 게임 실행 파일 변경

다음은 개발 환경에서 로컬 게임 결과(JSON)와 게임 실행 파일(.exe)을 연동할 때 참고할 설정입니다.

- 결과 파일(게임이 생성하는 JSON) 경로
	- 기본값(앱 코드): `src/App.js`에서 `DEFAULT_PLAY_RESULT_PATH` 값을 사용합니다.
	- 개발용으로는 로컬 서버(`local-server.js`)를 통해 실제 AppData 경로의 파일을 제공하도록 구성되어 있습니다.
	- 실제 파일 경로 예: `C:\Users\zsxcd\AppData\LocalLow\ReFit\Refit_Demo\WoodGameData.json` (이 경로는 `local-server.js`의 `FILE_PATH`로 설정됨)
	- 변경/확인 방법:
		1. 열기: `local-server.js` 파일을 편집
		2. `FILE_PATH` 상수에 실제 JSON 파일 경로를 설정
		3. 서버 실행: `node local-server.js` (포트는 기본 4000)
		4. React 앱에서 결과를 불러오려면 `src/App.js`의 `DEFAULT_PLAY_RESULT_PATH` 값을 `http://localhost:4000/woodgame`으로 유지하세요.

- 게임 실행 파일(.exe) 경로
	- 버튼 클릭으로 게임을 실행할 때 `src/App.js`에서 `launchExe(...)` 호출에 전달되는 경로를 사용합니다.
	- 현재 예시 경로: `C:\Users\zsxcd\Downloads\ReFit_Demo_CustomSave\ReFit_Demo.exe`
	- 변경/확인 방법:
		1. 열기: `src/App.js`
		2. `launchExe('...')`로 호출되는 문자열을 원하는 exe 경로로 수정
		3. 로컬 실행 서버가 필요합니다: `node local-server.js`를 먼저 실행하세요 (서버가 POST /launch 요청을 받아 exe를 실행합니다).

주의
- `POST /launch` 엔드포인트는 로컬 머신에서 임의의 실행 파일을 실행할 수 있으므로 절대 외부에 노출하지 마시고, 다른 사용자와 공유하지 마세요.

