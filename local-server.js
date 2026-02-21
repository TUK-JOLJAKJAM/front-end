const http = require('http');
const fs = require('fs');

// 실제 게임 결과 파일 경로 (Windows)
const FILE_PATH = 'C:\\Users\\zsxcd\\AppData\\LocalLow\\ReFit\\Refit_Demo\\WoodGameData.json';
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
