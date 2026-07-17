import { useMemo, useState } from 'react';
import './App.css';


const DEFAULT_AI_URL = process.env.REACT_APP_AI_API_URL || 'http://localhost:8000';
const DEFAULT_BACKEND_URL = process.env.REACT_APP_BACKEND_API_URL || 'http://localhost:8080';

const DEMO_SESSION = {
  schema_version: '1.0',
  history_id: 'react-demo-session',
  user_id: 'demo-user',
  game_id: 'ADVENTURE_FIGHT',
  game_name: 'ReFit 전투 재활',
  game_version: '1.0.0',
  primary_part: 'SHOULDER',
  side: 'BOTH',
  difficulty: 2,
  started_at_ms: Date.now(),
  ended_at_ms: Date.now() + 20000,
  action_count: 6,
  success_count: 6,
  fail_count: 0,
  self_report: {
    pain_before_0_10: 2,
    pain_after_0_10: 3,
    fatigue_after_0_10: 4,
    swelling: false,
  },
  actions: [
    { action_id: '1', action_type: 'ATTACK', direction: 'FORWARD', duration_ms: 1120, result: true, grade: 'GOOD', rom_deg: 74, peak_angular_velocity_dps: 122 },
    { action_id: '2', action_type: 'ATTACK', direction: 'FORWARD', duration_ms: 1180, result: true, grade: 'PERFECT', rom_deg: 80, peak_angular_velocity_dps: 126 },
    { action_id: '3', action_type: 'ATTACK', direction: 'FORWARD', duration_ms: 1210, result: true, grade: 'GOOD', rom_deg: 78, peak_angular_velocity_dps: 130 },
    { action_id: '4', action_type: 'ATTACK', direction: 'FORWARD', duration_ms: 1260, result: true, grade: 'NORMAL', rom_deg: 72, peak_angular_velocity_dps: 134 },
    { action_id: '5', action_type: 'ATTACK', direction: 'FORWARD', duration_ms: 1290, result: true, grade: 'GOOD', rom_deg: 75, peak_angular_velocity_dps: 138 },
    { action_id: '6', action_type: 'ATTACK', direction: 'FORWARD', duration_ms: 1320, result: true, grade: 'GOOD', rom_deg: 73, peak_angular_velocity_dps: 142 },
  ],
};

const METRIC_LABELS = {
  success_rate: '성공률',
  accuracy: '동작 정확도',
  rom_achievement: '가동범위 달성도',
  consistency: '동작 일관성',
  smoothness: '움직임 부드러움',
  safety: '안전 점수',
};

const FLAG_LABELS = {
  LEGACY_COMPOSITE_ACTION: '현재 Unity 문자열 형식을 변환해 분석했습니다.',
  LEGACY_NON_EPOCH_TIMESTAMP: '게임 시간이 epoch 밀리초 형식이 아닙니다.',
  NO_ACTION_DATA: '세부 동작 데이터가 없습니다.',
  INSUFFICIENT_ACTIONS: '추세를 분석하기에는 동작 횟수가 부족합니다.',
  MISSING_ROM: 'ROM 데이터가 없어 가동범위 평가는 제외되었습니다.',
  MISSING_SPEED: '각속도 데이터가 없어 속도 평가는 제외되었습니다.',
  MISSING_ACTION_TIMESTAMPS: '동작 시작·종료 시각이 없습니다.',
  MISSING_SENSOR_SEQUENCE: '연속 센서 샘플이 없어 저크 분석이 제한됩니다.',
  MISSING_SELF_REPORT: '운동 후 통증·피로 입력이 없습니다.',
  ACTION_COUNT_MISMATCH: '요약 횟수와 세부 동작 개수가 일치하지 않습니다.',
};


async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!response.ok) {
    const message = typeof body === 'object' ? body?.detail || body?.error : body;
    throw new Error(message || `요청 실패 (${response.status})`);
  }
  return body;
}


function formatPercent(value, fraction = false) {
  if (value === null || value === undefined) return '측정 불가';
  const number = fraction ? value * 100 : value;
  return `${Math.round(number * 10) / 10}%`;
}


function StatusBadge({ value }) {
  const normalized = String(value || 'UNKNOWN').toLowerCase();
  return <span className={`status-badge status-${normalized}`}>{value || 'UNKNOWN'}</span>;
}


function MetricBar({ label, value }) {
  const safeValue = value === null || value === undefined ? 0 : Math.max(0, Math.min(100, value));
  return (
    <div className="metric-row">
      <div className="metric-label">
        <span>{label}</span>
        <strong>{value === null || value === undefined ? '데이터 없음' : `${Math.round(value * 10) / 10}%`}</strong>
      </div>
      <div className="metric-track" aria-label={`${label} ${safeValue}%`}>
        <div className="metric-fill" style={{ width: `${safeValue}%` }} />
      </div>
    </div>
  );
}


function AnalysisDashboard({ analysis }) {
  const distributionMax = Math.max(1, ...Object.values(analysis.distribution_data || {}));
  return (
    <section className="dashboard" aria-live="polite">
      <div className="summary-grid">
        <article className="summary-card primary-card">
          <span>종합 점수</span>
          <strong>{analysis.score}</strong>
          <small>100점 기준</small>
        </article>
        <article className="summary-card">
          <span>성공률</span>
          <strong>{formatPercent(analysis.metrics?.success_rate, true)}</strong>
          <small>{analysis.metrics?.successful_actions || 0}/{analysis.metrics?.total_actions || 0}회 성공</small>
        </article>
        <article className="summary-card">
          <span>안전 상태</span>
          <StatusBadge value={analysis.safety_status} />
          <small>안전 점수 {analysis.metrics?.safety_score ?? 0}</small>
        </article>
        <article className="summary-card">
          <span>추천 난이도</span>
          <StatusBadge value={analysis.difficulty_recommend} />
          <small>
            {analysis.difficulty?.current_level
              ? `${analysis.difficulty.current_level} → ${analysis.difficulty.recommended_level}`
              : '현재 난이도 정보 없음'}
          </small>
        </article>
      </div>

      <div className="feedback-panel">
        <div>
          <p className="section-kicker">이번 세션 분석</p>
          <h2>{analysis.feedback_message}</h2>
        </div>
        <div className="session-meta">
          <span>{analysis.game_id}</span>
          <span>{analysis.body_part} · {analysis.side}</span>
          <span>{analysis.analysis_version}</span>
        </div>
      </div>

      <div className="content-grid">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-kicker">Performance</p>
              <h3>핵심 수행 지표</h3>
            </div>
          </div>
          <div className="metrics-list">
            {Object.entries(METRIC_LABELS).map(([key, label]) => (
              <MetricBar key={key} label={label} value={analysis.chart_data?.[key]} />
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-kicker">Distribution</p>
              <h3>동작 등급 분포</h3>
            </div>
          </div>
          <div className="distribution-list">
            {Object.entries(analysis.distribution_data || {}).map(([grade, count]) => (
              <div className="distribution-row" key={grade}>
                <span>{grade}</span>
                <div className="distribution-track">
                  <div style={{ width: `${(count / distributionMax) * 100}%` }} />
                </div>
                <strong>{count}</strong>
              </div>
            ))}
          </div>
          <div className="number-stats">
            <div><span>평균 동작시간</span><strong>{analysis.metrics?.average_duration_ms ? `${analysis.metrics.average_duration_ms} ms` : '-'}</strong></div>
            <div><span>평균 ROM</span><strong>{analysis.metrics?.average_rom_deg ? `${analysis.metrics.average_rom_deg}°` : '-'}</strong></div>
            <div><span>최대 각속도</span><strong>{analysis.metrics?.peak_angular_velocity_dps ? `${analysis.metrics.peak_angular_velocity_dps}°/s` : '-'}</strong></div>
            <div><span>피로 지수</span><strong>{analysis.metrics?.fatigue_index === null ? '-' : formatPercent(analysis.metrics?.fatigue_index, true)}</strong></div>
          </div>
        </article>
      </div>

      <div className="content-grid lower-grid">
        <article className="panel">
          <div className="panel-heading inline-heading">
            <div>
              <p className="section-kicker">Data quality</p>
              <h3>데이터 신뢰도</h3>
            </div>
            <StatusBadge value={analysis.data_quality?.status} />
          </div>
          <div className="quality-score">
            <strong>{formatPercent(analysis.data_quality?.completeness, true)}</strong>
            <span>수집 완성도 · 센서 샘플 {analysis.data_quality?.sensor_sample_count || 0}개</span>
          </div>
          <ul className="message-list quality-list">
            {(analysis.data_quality?.flags || []).length === 0 ? (
              <li className="positive">필수 분석 데이터가 정상적으로 수집되었습니다.</li>
            ) : (
              analysis.data_quality.flags.map((flag) => <li key={flag}>{FLAG_LABELS[flag] || flag}</li>)
            )}
          </ul>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-kicker">Coaching</p>
              <h3>추천 피드백</h3>
            </div>
          </div>
          <ul className="message-list coaching-list">
            {(analysis.coaching_messages || []).map((message) => <li key={message}>{message}</li>)}
          </ul>
          <div className="reason-tags">
            {(analysis.reason_codes || []).map((code) => <span key={code}>{code}</span>)}
          </div>
        </article>
      </div>

      {(analysis.risk_flags || []).length > 0 && (
        <article className="panel risk-panel">
          <div className="panel-heading">
            <div>
              <p className="section-kicker">Safety flags</p>
              <h3>확인해야 할 위험 신호</h3>
            </div>
          </div>
          <div className="risk-list">
            {analysis.risk_flags.map((risk) => (
              <div className={`risk-item severity-${risk.severity.toLowerCase()}`} key={risk.code}>
                <StatusBadge value={risk.severity} />
                <div><strong>{risk.code}</strong><p>{risk.message}</p></div>
              </div>
            ))}
          </div>
        </article>
      )}
    </section>
  );
}


function App() {
  const [aiUrl, setAiUrl] = useState(DEFAULT_AI_URL);
  const [backendUrl, setBackendUrl] = useState(DEFAULT_BACKEND_URL);
  const [rawJson, setRawJson] = useState(JSON.stringify(DEMO_SESSION, null, 2));
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showJson, setShowJson] = useState(false);

  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [accessToken, setAccessToken] = useState(() => sessionStorage.getItem('refitAccessToken') || '');
  const [histories, setHistories] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const normalizedAiUrl = useMemo(() => aiUrl.replace(/\/$/, ''), [aiUrl]);
  const normalizedBackendUrl = useMemo(() => backendUrl.replace(/\/$/, ''), [backendUrl]);

  const analyzePayload = async (payload) => {
    setLoading(true);
    setError('');
    try {
      const result = await requestJson(`${normalizedAiUrl}/api/v1/analyze_session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      setAnalysis(result);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (requestError) {
      setError(`AI 분석 실패: ${requestError.message}`);
    } finally {
      setLoading(false);
    }
  };

  const analyzeJson = async () => {
    try {
      await analyzePayload(JSON.parse(rawJson));
    } catch (parseError) {
      setError(`JSON 형식 오류: ${parseError.message}`);
    }
  };

  const runDemo = () => {
    const payload = { ...DEMO_SESSION, started_at_ms: Date.now(), ended_at_ms: Date.now() + 20000 };
    setRawJson(JSON.stringify(payload, null, 2));
    analyzePayload(payload);
  };

  const loginBackend = async (event) => {
    event.preventDefault();
    setHistoryLoading(true);
    setError('');
    try {
      const response = await requestJson(`${normalizedBackendUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: credentials.email,
          password: credentials.password,
          clientType: 'WEB',
          deviceId: 'react-analysis-dashboard',
        }),
      });
      setAccessToken(response.accessToken);
      sessionStorage.setItem('refitAccessToken', response.accessToken);
      await loadHistories(response.accessToken);
    } catch (requestError) {
      setError(`백엔드 로그인 실패: ${requestError.message}`);
    } finally {
      setHistoryLoading(false);
    }
  };

  const loadHistories = async (token = accessToken) => {
    if (!token) return;
    setHistoryLoading(true);
    setError('');
    try {
      const response = await requestJson(`${normalizedBackendUrl}/api/v1/game-histories?size=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setHistories(response.items || []);
    } catch (requestError) {
      setError(`게임 기록 조회 실패: ${requestError.message}`);
    } finally {
      setHistoryLoading(false);
    }
  };

  const analyzeHistory = async (historyId) => {
    setHistoryLoading(true);
    setError('');
    try {
      const headers = { Authorization: `Bearer ${accessToken}` };
      const [history, profile] = await Promise.all([
        requestJson(`${normalizedBackendUrl}/api/v1/game-histories/${historyId}`, { headers }),
        requestJson(`${normalizedBackendUrl}/api/v1/users/me/profile`, { headers }).catch(() => null),
      ]);
      const payload = profile ? { ...history, profile } : history;
      setRawJson(JSON.stringify(payload, null, 2));
      await analyzePayload(payload);
    } catch (requestError) {
      setError(`게임 기록 분석 실패: ${requestError.message}`);
    } finally {
      setHistoryLoading(false);
    }
  };

  const logoutLocal = () => {
    sessionStorage.removeItem('refitAccessToken');
    setAccessToken('');
    setHistories([]);
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-mark">R</div>
        <div className="brand-copy">
          <strong>ReFit Analysis</strong>
          <span>게임형 재활 세션 리포트</span>
        </div>
        <div className="topbar-actions">
          <button className="button secondary" onClick={() => setShowJson((value) => !value)}>
            {showJson ? '입력창 닫기' : '데이터 입력'}
          </button>
          <button className="button primary" onClick={runDemo} disabled={loading}>
            {loading ? '분석 중...' : '샘플 분석 실행'}
          </button>
        </div>
      </header>

      <main className="main-content">
        <section className="page-heading">
          <div>
            <p className="section-kicker">Rehabilitation intelligence</p>
            <h1>재활 게임 데이터 분석</h1>
            <p>게임 수행 데이터를 분석해 회복 지표, 위험 신호와 다음 난이도를 한 화면에 보여줍니다.</p>
          </div>
          {analysis && (
            <div className="analysis-time">
              <span>마지막 분석</span>
              <strong>{new Date(analysis.analyzed_at_ms).toLocaleString('ko-KR')}</strong>
            </div>
          )}
        </section>

        {error && <div className="error-banner">{error}</div>}

        {showJson && (
          <section className="input-workspace">
            <article className="panel connection-panel">
              <div className="panel-heading">
                <div><p className="section-kicker">Connection</p><h3>서버 연결</h3></div>
              </div>
              <label>AI 서버 주소<input value={aiUrl} onChange={(event) => setAiUrl(event.target.value)} /></label>
              <label>Spring 백엔드 주소<input value={backendUrl} onChange={(event) => setBackendUrl(event.target.value)} /></label>
              {!accessToken ? (
                <form onSubmit={loginBackend} className="login-form">
                  <label>이메일<input type="email" required value={credentials.email} onChange={(event) => setCredentials({ ...credentials, email: event.target.value })} /></label>
                  <label>비밀번호<input type="password" required value={credentials.password} onChange={(event) => setCredentials({ ...credentials, password: event.target.value })} /></label>
                  <button className="button primary" disabled={historyLoading}>{historyLoading ? '연결 중...' : '로그인 후 기록 불러오기'}</button>
                </form>
              ) : (
                <div className="connected-actions">
                  <StatusBadge value="CONNECTED" />
                  <button className="button secondary" onClick={() => loadHistories()}>기록 새로고침</button>
                  <button className="text-button" onClick={logoutLocal}>연결 해제</button>
                </div>
              )}
            </article>

            <article className="panel json-panel">
              <div className="panel-heading inline-heading">
                <div><p className="section-kicker">Raw session</p><h3>분석할 JSON</h3></div>
                <button className="button primary" onClick={analyzeJson} disabled={loading}>{loading ? '분석 중...' : '이 JSON 분석'}</button>
              </div>
              <textarea value={rawJson} onChange={(event) => setRawJson(event.target.value)} spellCheck="false" />
            </article>

            {accessToken && (
              <article className="panel history-panel">
                <div className="panel-heading"><div><p className="section-kicker">Backend history</p><h3>저장된 게임 기록</h3></div></div>
                {histories.length === 0 ? <p className="empty-text">저장된 기록이 없거나 아직 불러오지 않았습니다.</p> : (
                  <div className="history-list">
                    {histories.map((history) => (
                      <button key={history.historyId} onClick={() => analyzeHistory(history.historyId)}>
                        <span><strong>{history.gameName || history.gameId}</strong><small>{history.primaryPart} · {history.actionCount ?? 0}회</small></span>
                        <span><strong>{history.score ?? '-'}</strong><small>{history.endedAtMs ? new Date(history.endedAtMs).toLocaleDateString('ko-KR') : ''}</small></span>
                      </button>
                    ))}
                  </div>
                )}
              </article>
            )}
          </section>
        )}

        {analysis ? (
          <AnalysisDashboard analysis={analysis} />
        ) : (
          <section className="empty-state">
            <div className="empty-icon">↗</div>
            <h2>분석 결과가 아직 없습니다</h2>
            <p>상단의 ‘샘플 분석 실행’을 누르면 전체 대시보드를 즉시 확인할 수 있습니다.</p>
            <button className="button primary" onClick={runDemo} disabled={loading}>{loading ? '분석 중...' : '샘플 데이터 분석하기'}</button>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
