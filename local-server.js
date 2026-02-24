const http = require('http');
const fs = require('fs');
const path = require('path');

/************************************ 
 실제 게임 결과 파일 경로로 변경하세요
 예시 경로: C:\\Users\\zsxcd\\AppData\\LocalLow\\ReFit\\Refit_Demo\\WoodGameData.json
************************************/
const FILE_PATH = 'C:\\Users\\zsxcd\\AppData\\LocalLow\\ReFit\\Refit_Demo\\WoodGameData.json';
/************************************ 
 실제 게임 실행 파일 경로 설정
 - 우선순위: 환경변수(DEFAULT_EXE 또는 EXE_PATH) -> exe-config.json 파일(현재 비활성) -> 기본값(FALLBACK)
 - exe-config.json 예시(동일 폴더에 생성):
   { "default_exe": "C:\\path\\to\\game.exe", "profile_exe": "C:\\..." }
 - 단일 문자열을 파일에 썼을 경우 ("C:\\path\\to\\game.exe")에도 대응합니다.
************************************/
const CONFIG_FILE = path.join(__dirname, 'exe-config.json');
let EXE_PATHS = {};
const DEFAULT_EXE_FALLBACK = 'C:\\Users\\zsxcd\\Downloads\\ReFit_Demo_Arduino_Com6\\ReFit_Demo.exe';

// Load from environment first
if (process.env.DEFAULT_EXE) {
  EXE_PATHS = { default_exe: process.env.DEFAULT_EXE };
} else if (process.env.EXE_PATH) {
  EXE_PATHS = { default_exe: process.env.EXE_PATH };
} else {
  // exe-config.json 로드 부분은 주석 처리(비활성화)되어 있습니다.
  // 필요 시 아래 코드를 활성화하세요.
  /*
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, 'utf8').trim();
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'string') EXE_PATHS = { default_exe: parsed };
      else if (parsed && typeof parsed === 'object') EXE_PATHS = parsed;
      else EXE_PATHS = { default_exe: DEFAULT_EXE_FALLBACK };
    } else {
      EXE_PATHS = { default_exe: DEFAULT_EXE_FALLBACK };
    }
  } catch (e) {
    console.warn('Could not load exe-config.json, using fallback', e.message);
    EXE_PATHS = { default_exe: DEFAULT_EXE_FALLBACK };
  }
  */
  EXE_PATHS = { default_exe: DEFAULT_EXE_FALLBACK };
}

const PORT = process.env.PORT || 4000;

const server = http.createServer((req, res) => {
  // CORS 허용
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (req.method === 'OPTIONS') {
    res.writeHead(204, headers);
    return res.end();
  }

  if (req.url === '/woodgame') {
    fs.readFile(FILE_PATH, 'utf8', (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'application/json', ...headers });
        res.end(JSON.stringify({ error: '파일을 읽을 수 없습니다', message: err.message }));
        return;
      }

      // 응답은 원본 JSON 그대로 전달
      res.writeHead(200, { 'Content-Type': 'application/json', ...headers });
      res.end(data);
    });
    return;
  }

  // Provide configuration (exe paths) to the frontend so paths are not hardcoded.
  if (req.method === 'GET' && req.url === '/config') {
    res.writeHead(200, { 'Content-Type': 'application/json', ...headers });
    res.end(JSON.stringify(EXE_PATHS));
    return;
  }

  // Launch an executable on the local machine.
  // POST /launch with JSON body: { "path": "C:\\path\\to\\app.exe", "args": ["--flag"] }
  if (req.method === 'POST' && req.url === '/launch') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
      // limit body size
      if (body.length > 1e6) req.socket.destroy();
    });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const exePath = payload.path;
        const args = Array.isArray(payload.args) ? payload.args : [];
        if (!exePath) {
          res.writeHead(400, { 'Content-Type': 'application/json', ...headers });
          res.end(JSON.stringify({ error: 'path is required' }));
          return;
        }

        // security note: this endpoint runs local executables. Only run if you trust callers.
        console.log('launch request for', exePath, 'args=', args);
        // On Windows X_OK isn't meaningful; check read access instead
        fs.access(exePath, fs.constants.R_OK, (err) => {
          if (err) {
            console.error('access check failed for', exePath, err.message);
            res.writeHead(500, { 'Content-Type': 'application/json', ...headers });
            res.end(JSON.stringify({ error: 'cannot access exe', message: err.message }));
            return;
          }

          const { spawn } = require('child_process');
          try {
            const child = spawn(exePath, args, { detached: true, stdio: 'ignore' });
            child.unref();
            res.writeHead(200, { 'Content-Type': 'application/json', ...headers });
            res.end(JSON.stringify({ ok: true }));
          } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json', ...headers });
            res.end(JSON.stringify({ error: 'failed to launch', message: e.message }));
          }
        });
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json', ...headers });
        res.end(JSON.stringify({ error: 'invalid json', message: e.message }));
      }
    });
    return;
  }

  if (req.url === '/' || req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain', ...headers });
    res.end('local-server ok');
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json', ...headers });
  res.end(JSON.stringify({ error: 'not found' }));
});

server.listen(PORT, () => {
  console.log(`local-server listening on http://localhost:${PORT}/woodgame`);
  console.log(`serving file: ${FILE_PATH}`);
});

