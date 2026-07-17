import { useMemo, useState } from 'react';
import './App.css';


const DEFAULT_AI_URL = process.env.REACT_APP_AI_API_URL || 'http://localhost:8000';
const DEFAULT_BACKEND_URL = process.env.REACT_APP_BACKEND_API_URL || 'http://localhost:8080';
const IS_HTTP_DEMO = typeof window !== 'undefined' && window.location.protocol === 'http:';

function quaternionSample(timestampMs, angleDeg) {
  const halfRadians = (angleDeg * Math.PI) / 360;
  return {
    timestamp_ms: Math.round(timestampMs),
    qx: Math.sin(halfRadians),
    qy: 0,
    qz: 0,
    qw: Math.cos(halfRadians),
  };
}


function buildDemoSession(baseTime = Date.now()) {
  const actionSpecs = [
    ['1', 74, 1120, 'GOOD'],
    ['2', 80, 1180, 'PERFECT'],
    ['3', 78, 1210, 'GOOD'],
    ['4', 72, 1260, 'NORMAL'],
    ['5', 75, 1290, 'GOOD'],
    ['6', 73, 1320, 'GOOD'],
  ];
  const actions = actionSpecs.map(([id, rom, duration, grade], index) => {
    const startedAt = baseTime + (index * 2600);
    const sampleAngles = [0, rom * 0.45, rom, rom * 0.5, 0];
    return {
      action_id: id,
      action_type: 'ATTACK',
      exercise_code: 'SHOULDER_FLEXION',
      direction: 'FORWARD',
      started_at_ms: startedAt,
      ended_at_ms: startedAt + duration,
      duration_ms: duration,
      result: true,
      grade,
      samples: sampleAngles.map((angle, sampleIndex) => (
        quaternionSample(startedAt + ((duration / 4) * sampleIndex), angle)
      )),
    };
  });
  return {
  schema_version: '2.0',
  history_id: 'react-demo-session',
  user_id: 'demo-user',
  game_id: 'ADVENTURE_FIGHT',
  game_name: 'ReFit 전투 재활',
  game_version: '1.0.0',
  primary_part: 'SHOULDER',
  side: 'BOTH',
  difficulty: 2,
  started_at_ms: baseTime,
  ended_at_ms: baseTime + 20000,
  action_count: 6,
  success_count: 6,
  fail_count: 0,
  self_report: {
    pain_before_0_10: 2,
    pain_after_0_10: 3,
    fatigue_after_0_10: 4,
    swelling: false,
  },
  actions,
  };
}


const DEMO_SESSION = buildDemoSession();

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


function authErrorMessage(error) {
  if (error?.message === 'INVALID_CREDENTIALS') return '이메일 또는 비밀번호가 일치하지 않습니다.';
  if (error?.message === 'EMAIL_ALREADY_EXISTS') return '이미 가입된 이메일입니다. 로그인 화면을 이용해 주세요.';
  return error?.message || '요청을 처리하지 못했습니다.';
}


function AuthLanding({
  mode,
  setMode,
  credentials,
  setCredentials,
  signup,
  setSignup,
  onLogin,
  onSignup,
  loading,
  error,
}) {
  return (
    <div className="auth-shell">
      {IS_HTTP_DEMO && (
        <div className="demo-warning" role="status">
          HTTP 데모 모드입니다. 실제 환자정보와 실사용 비밀번호 대신 테스트 계정과 비식별 데이터만 사용하세요.
        </div>
      )}
      <main className="auth-page">
        <section className="auth-hero">
          <p className="auth-eyebrow">치료와 게임의 만남</p>
          <h1>환영합니다!</h1>
          <p>
            재미있는 게임 속에서 맞춤형 재활 운동을 진행하고,
            로그인 후 저장된 게임 기록과 분석 결과를 확인하세요.
          </p>
          <ul>
            <li>게임 수행 기록 자동 저장</li>
            <li>회복 지표와 안전 신호 분석</li>
            <li>개인별 다음 난이도 추천</li>
          </ul>
        </section>

        <section className="auth-card" aria-label={mode === 'login' ? '로그인' : '회원가입'}>
          <div className="auth-tabs" role="tablist" aria-label="계정 메뉴">
            <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>로그인</button>
            <button type="button" className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')}>회원가입</button>
          </div>

          <div className="auth-card-header">
            <span className="auth-badge">ReFit</span>
            <h2>{mode === 'login' ? '다시 오신 것을 환영합니다' : '새 계정 만들기'}</h2>
            <p>{mode === 'login' ? '로그인하면 분석 대시보드로 이동합니다.' : '가입 후 신체 정보 설정을 진행합니다.'}</p>
          </div>

          {error && <div className="auth-error" role="alert">{error}</div>}

          {mode === 'login' ? (
            <form className="auth-form" onSubmit={onLogin}>
              <label>
                <span>이메일</span>
                <input
                  type="email"
                  autoComplete="username"
                  required
                  value={credentials.email}
                  onChange={(event) => setCredentials({ ...credentials, email: event.target.value })}
                  placeholder="refit-test@example.com"
                />
              </label>
              <label>
                <span>비밀번호</span>
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={credentials.password}
                  onChange={(event) => setCredentials({ ...credentials, password: event.target.value })}
                  placeholder="8자 이상"
                />
              </label>
              <button className="auth-submit" disabled={loading}>{loading ? '로그인 중...' : '로그인하고 분석 보기'}</button>
              <p className="auth-footnote">계정이 없나요? <button type="button" onClick={() => setMode('signup')}>회원가입</button></p>
            </form>
          ) : (
            <form className="auth-form" onSubmit={onSignup}>
              <label>
                <span>이름</span>
                <input required maxLength="50" value={signup.name} onChange={(event) => setSignup({ ...signup, name: event.target.value })} placeholder="테스트 사용자" />
              </label>
              <label>
                <span>이메일</span>
                <input type="email" autoComplete="username" required value={signup.email} onChange={(event) => setSignup({ ...signup, email: event.target.value })} placeholder="test@example.com" />
              </label>
              <div className="auth-field-row">
                <label>
                  <span>비밀번호</span>
                  <input type="password" autoComplete="new-password" minLength="8" required value={signup.password} onChange={(event) => setSignup({ ...signup, password: event.target.value })} placeholder="8자 이상" />
                </label>
                <label>
                  <span>비밀번호 확인</span>
                  <input type="password" autoComplete="new-password" minLength="8" required value={signup.confirm} onChange={(event) => setSignup({ ...signup, confirm: event.target.value })} placeholder="다시 입력" />
                </label>
              </div>
              <label className="auth-checkbox">
                <input type="checkbox" required checked={signup.terms} onChange={(event) => setSignup({ ...signup, terms: event.target.checked })} />
                <span>HTTP 데모에는 테스트 정보만 입력하는 것에 동의합니다.</span>
              </label>
              <button className="auth-submit" disabled={loading}>{loading ? '가입 중...' : '가입하고 시작하기'}</button>
              <p className="auth-footnote">이미 계정이 있나요? <button type="button" onClick={() => setMode('login')}>로그인</button></p>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}


function ProfileSetup({ profile, setProfile, onSave, onSkip, loading, error }) {
  return (
    <div className="auth-shell">
      {IS_HTTP_DEMO && (
        <div className="demo-warning" role="status">
          HTTP 데모에서는 실제 신체정보 대신 가짜 테스트 값을 입력하거나 이 단계를 건너뛰세요.
        </div>
      )}
      <main className="auth-page">
        <section className="auth-hero">
          <p className="auth-eyebrow">개인화 설정</p>
          <h1>분석 준비를 마무리합니다</h1>
          <p>테스트용 신체 정보를 입력하면 게임 기록과 함께 분석에 활용할 수 있습니다.</p>
          <ul>
            <li>개인별 가동범위 분석 기반 마련</li>
            <li>운동 전 기준 통증과 세션 비교</li>
            <li>언제든지 대시보드에서 기록 확인</li>
          </ul>
        </section>
        <section className="auth-card" aria-label="프로필 설정">
          <div className="auth-card-header">
            <span className="auth-badge">Step 2</span>
            <h2>테스트 프로필 설정</h2>
            <p>실제 개인정보를 입력하지 마세요. 지금은 건너뛰어도 됩니다.</p>
          </div>
          {error && <div className="auth-error" role="alert">{error}</div>}
          <form className="auth-form" onSubmit={onSave}>
            <div className="auth-field-row">
              <label><span>키 (cm)</span><input type="number" min="50" max="250" step="0.1" required value={profile.heightCm} onChange={(event) => setProfile({ ...profile, heightCm: event.target.value })} /></label>
              <label><span>몸무게 (kg)</span><input type="number" min="20" max="300" step="0.1" required value={profile.weightKg} onChange={(event) => setProfile({ ...profile, weightKg: event.target.value })} /></label>
            </div>
            <div className="auth-field-row">
              <label><span>주 사용 손</span><select value={profile.dominantHand} onChange={(event) => setProfile({ ...profile, dominantHand: event.target.value })}><option value="R">오른손</option><option value="L">왼손</option></select></label>
              <label><span>기준 통증 (0~10)</span><input type="number" min="0" max="10" required value={profile.painBaseline0to10} onChange={(event) => setProfile({ ...profile, painBaseline0to10: event.target.value })} /></label>
            </div>
            <button className="auth-submit" disabled={loading}>{loading ? '저장 중...' : '저장하고 분석 대시보드 열기'}</button>
            <button className="auth-skip" type="button" onClick={onSkip} disabled={loading}>지금은 건너뛰기</button>
          </form>
        </section>
      </main>
    </div>
  );
}


function AnalysisDashboard({ analysis, persisted, analysisHistory, userAnalyses }) {
  const distributionMax = Math.max(1, ...Object.values(analysis.distribution_data || {}));
  const latestByHistory = new Map();
  (userAnalyses || []).forEach((item) => {
    if (!latestByHistory.has(item.historyId)) latestByHistory.set(item.historyId, item);
  });
  const recentSessions = Array.from(latestByHistory.values()).slice(0, 8).reverse();
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

      <div className={`provenance-strip ${persisted ? 'persisted' : 'preview'}`}>
        <span className="provenance-icon">{persisted ? '✓' : 'i'}</span>
        <div>
          <strong>{persisted ? 'Spring DB에 분석 결과가 저장되었습니다' : '샘플 미리보기 결과입니다'}</strong>
          <small>
            {persisted
              ? `분석 ID ${analysis.analysis_id} · 동일 기록 재분석 이력 ${analysisHistory.length || 1}건`
              : '실제 게임 기록과 연결되지 않으며 DB에는 저장되지 않습니다.'}
          </small>
        </div>
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

      {recentSessions.length > 0 && (
        <article className="panel trend-panel">
          <div className="panel-heading inline-heading">
            <div>
              <p className="section-kicker">Recovery trend</p>
              <h3>최근 세션 회복 추세</h3>
            </div>
            <small>DB에 저장된 기록 기준 · 최근 {recentSessions.length}개 세션</small>
          </div>
          <div className="trend-chart" aria-label="최근 분석 점수 추세">
            {recentSessions.map((item, index) => (
              <div className="trend-column" key={item.analysisId || `${item.historyId}-${index}`}>
                <strong>{item.score}</strong>
                <div className="trend-track"><span style={{ height: `${Math.max(4, Math.min(100, item.score || 0))}%` }} /></div>
                <small>{new Date(item.analyzedAtMs).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}</small>
                <StatusBadge value={item.safetyStatus} />
              </div>
            ))}
          </div>
        </article>
      )}

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
            <span>
              수집 완성도 · 신뢰도 {formatPercent(analysis.data_quality?.confidence, true)}
              {' · '}센서 샘플 {analysis.data_quality?.sensor_sample_count || 0}개
            </span>
          </div>
          <div className={`assessability ${analysis.data_quality?.assessable ? 'ready' : 'held'}`}>
            <strong>{analysis.data_quality?.assessable ? '규칙 판정 가능' : '판정 보류'}</strong>
            <span>
              {analysis.data_quality?.assessable
                ? '필수 동작·시간·ROM·속도·센서 조건을 충족했습니다.'
                : '누락 데이터를 보완하기 전 결과를 재활 의사결정에 사용하지 마세요.'}
            </span>
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
  const aiUrl = DEFAULT_AI_URL;
  const backendUrl = DEFAULT_BACKEND_URL;
  const [rawJson, setRawJson] = useState(JSON.stringify(DEMO_SESSION, null, 2));
  const [analysis, setAnalysis] = useState(null);
  const [analysisPersisted, setAnalysisPersisted] = useState(false);
  const [analysisHistory, setAnalysisHistory] = useState([]);
  const [userAnalyses, setUserAnalyses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showJson, setShowJson] = useState(() => Boolean(sessionStorage.getItem('refitAccessToken')));
  const [showRawJson, setShowRawJson] = useState(false);

  const [authMode, setAuthMode] = useState('login');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [signup, setSignup] = useState({ name: '', email: '', password: '', confirm: '', terms: false });
  const [profile, setProfile] = useState({ heightCm: '170', weightKg: '65', dominantHand: 'R', painBaseline0to10: '1' });
  const [needsProfileSetup, setNeedsProfileSetup] = useState(false);
  const [accessToken, setAccessToken] = useState(() => sessionStorage.getItem('refitAccessToken') || '');
  const [accountEmail, setAccountEmail] = useState(() => sessionStorage.getItem('refitAccountEmail') || '');
  const [histories, setHistories] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const normalizedAiUrl = useMemo(() => aiUrl.replace(/\/$/, ''), [aiUrl]);
  const normalizedBackendUrl = useMemo(() => backendUrl.replace(/\/$/, ''), [backendUrl]);

  const loadHistories = async (token = accessToken) => {
    if (!token) return;
    setHistoryLoading(true);
    setError('');
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [response, trendResponse] = await Promise.all([
        requestJson(`${normalizedBackendUrl}/api/v1/game-histories?size=50`, { headers }),
        requestJson(`${normalizedBackendUrl}/api/v1/analyses?size=20`, { headers }).catch(() => null),
      ]);
      setHistories(response.items || []);
      if (trendResponse) setUserAnalyses(trendResponse.items || []);
      setHistoryLoaded(true);
    } catch (requestError) {
      setError(`게임 기록 조회 실패: ${requestError.message}`);
    } finally {
      setHistoryLoading(false);
    }
  };

  const establishSession = async (email, password) => {
    const normalizedEmail = email.trim();
    const response = await requestJson(`${normalizedBackendUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: normalizedEmail,
        password,
        clientType: 'WEB',
        deviceId: 'react-analysis-dashboard',
      }),
    });
    setAccessToken(response.accessToken);
    setAccountEmail(normalizedEmail);
    sessionStorage.setItem('refitAccessToken', response.accessToken);
    sessionStorage.setItem('refitAccountEmail', normalizedEmail);
    return response;
  };

  const loginBackend = async (event) => {
    event.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    try {
      const response = await establishSession(credentials.email, credentials.password);
      setShowJson(true);
      await loadHistories(response.accessToken);
    } catch (requestError) {
      setAuthError(authErrorMessage(requestError));
    } finally {
      setAuthLoading(false);
    }
  };

  const signupBackend = async (event) => {
    event.preventDefault();
    setAuthError('');
    if (signup.password !== signup.confirm) {
      setAuthError('비밀번호와 비밀번호 확인이 일치하지 않습니다.');
      return;
    }
    setAuthLoading(true);
    try {
      await requestJson(`${normalizedBackendUrl}/api/v1/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: signup.email.trim(),
          password: signup.password,
          name: signup.name.trim(),
          role: 'PATIENT',
        }),
      });
      await establishSession(signup.email, signup.password);
      setNeedsProfileSetup(true);
    } catch (requestError) {
      setAuthError(authErrorMessage(requestError));
    } finally {
      setAuthLoading(false);
    }
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    try {
      await requestJson(`${normalizedBackendUrl}/api/v1/users/me/profile`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          heightCm: Number(profile.heightCm),
          weightKg: Number(profile.weightKg),
          dominantHand: profile.dominantHand,
          diagnosisTags: [],
          painBaseline0to10: Number(profile.painBaseline0to10),
          notes: '',
        }),
      });
      setNeedsProfileSetup(false);
      setShowJson(true);
      await loadHistories(accessToken);
    } catch (requestError) {
      setAuthError(`프로필 저장 실패: ${requestError.message}`);
    } finally {
      setAuthLoading(false);
    }
  };

  const skipProfile = async () => {
    setNeedsProfileSetup(false);
    setShowJson(true);
    await loadHistories(accessToken);
  };

  const showAnalysis = (result, persisted = false) => {
    setAnalysis(result);
    setAnalysisPersisted(persisted);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const analyzePayload = async (payload) => {
    setLoading(true);
    setError('');
    try {
      const result = await requestJson(`${normalizedAiUrl}/api/v1/analyze_session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      showAnalysis(result, false);
      setAnalysisHistory([]);
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
    const payload = buildDemoSession();
    setRawJson(JSON.stringify(payload, null, 2));
    analyzePayload(payload);
  };

  const analyzeHistory = async (historyId) => {
    setHistoryLoading(true);
    setError('');
    try {
      const headers = { Authorization: `Bearer ${accessToken}` };
      let result;
      let fallbackMessage = '';
      try {
        result = await requestJson(`${normalizedBackendUrl}/api/v1/game-histories/${historyId}/analyses`, {
          method: 'POST',
          headers,
        });
      } catch (analysisError) {
        try {
          result = await requestJson(`${normalizedBackendUrl}/api/v1/game-histories/${historyId}/analyses/latest`, { headers });
          fallbackMessage = `새 분석 연결 실패(${analysisError.message}). DB에 저장된 최신 분석 결과를 표시합니다.`;
        } catch {
          throw analysisError;
        }
      }
      showAnalysis(result, true);
      if (fallbackMessage) setError(fallbackMessage);

      const [history, savedAnalyses, trendResponse] = await Promise.all([
        requestJson(`${normalizedBackendUrl}/api/v1/game-histories/${historyId}`, { headers }).catch(() => null),
        requestJson(`${normalizedBackendUrl}/api/v1/game-histories/${historyId}/analyses?size=8`, { headers }).catch(() => null),
        requestJson(`${normalizedBackendUrl}/api/v1/analyses?size=20`, { headers }).catch(() => null),
      ]);
      if (history) setRawJson(JSON.stringify(history, null, 2));
      setAnalysisHistory(savedAnalyses?.items || []);
      if (trendResponse) setUserAnalyses(trendResponse.items || []);
    } catch (requestError) {
      setError(`게임 기록 분석 실패: ${requestError.message}`);
    } finally {
      setHistoryLoading(false);
    }
  };

  const logoutBackend = async () => {
    try {
      if (accessToken) {
        await requestJson(`${normalizedBackendUrl}/api/v1/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
        });
      }
    } catch {
      // 로컬 세션은 서버 응답과 관계없이 반드시 정리한다.
    } finally {
      sessionStorage.removeItem('refitAccessToken');
      sessionStorage.removeItem('refitAccountEmail');
      setAccessToken('');
      setAccountEmail('');
      setCredentials({ email: '', password: '' });
      setHistories([]);
      setHistoryLoaded(false);
      setAnalysis(null);
      setAnalysisPersisted(false);
      setAnalysisHistory([]);
      setUserAnalyses([]);
      setShowJson(false);
      setShowRawJson(false);
      setAuthMode('login');
      setAuthError('');
    }
  };

  if (!accessToken) {
    return (
      <AuthLanding
        mode={authMode}
        setMode={setAuthMode}
        credentials={credentials}
        setCredentials={setCredentials}
        signup={signup}
        setSignup={setSignup}
        onLogin={loginBackend}
        onSignup={signupBackend}
        loading={authLoading}
        error={authError}
      />
    );
  }

  if (needsProfileSetup) {
    return (
      <ProfileSetup
        profile={profile}
        setProfile={setProfile}
        onSave={saveProfile}
        onSkip={skipProfile}
        loading={authLoading}
        error={authError}
      />
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-mark">R</div>
        <div className="brand-copy">
          <strong>ReFit Analysis</strong>
          <span>게임형 재활 세션 리포트</span>
        </div>
        <div className="topbar-actions">
          <span className="account-chip">{accountEmail || '로그인됨'}</span>
          <button className="button secondary" onClick={() => setShowJson((value) => !value)}>
            {showJson ? '기록 닫기' : '게임 기록'}
          </button>
          <button className="button primary" onClick={runDemo} disabled={loading}>
            {loading ? '분석 중...' : '샘플 분석'}
          </button>
          <button className="text-button logout-button" onClick={logoutBackend}>로그아웃</button>
        </div>
      </header>

      {IS_HTTP_DEMO && (
        <div className="demo-warning" role="status">
          HTTP 데모 모드입니다. 실제 환자정보와 실사용 비밀번호 대신 테스트 계정과 비식별 데이터만 사용하세요.
        </div>
      )}

      <main className="main-content">
        <section className="page-heading">
          <div>
            <p className="section-kicker">Rehabilitation intelligence</p>
            <h1>재활 게임 데이터 분석</h1>
            <p>로그인한 사용자의 게임 기록을 분석해 회복 지표, 위험 신호와 다음 난이도를 보여줍니다.</p>
          </div>
          {analysis && (
            <div className="analysis-time">
              <span>마지막 분석</span>
              <strong>{new Date(analysis.analyzed_at_ms).toLocaleString('ko-KR')}</strong>
            </div>
          )}
        </section>

        <section className="pipeline-panel" aria-label="데이터 연결 상태">
          <div className="pipeline-copy">
            <p className="section-kicker">Live data pipeline</p>
            <strong>게임에서 리포트까지 연결 상태</strong>
            <small>규칙 기반 분석 · 임상 진단이 아닌 재활 의사결정 보조 지표</small>
          </div>
          <div className="pipeline-flow">
            <div><span>01</span><strong>Unity 센서</strong><small>계약 v2.0</small></div>
            <i>→</i>
            <div><span>02</span><strong>Spring · DB</strong><small>{historyLoaded ? `연결됨 · ${histories.length}건` : '연결 확인 중'}</small></div>
            <i>→</i>
            <div><span>03</span><strong>Rules Engine</strong><small>{analysis ? analysis.analysis_version : '분석 대기'}</small></div>
            <i>→</i>
            <div><span>04</span><strong>Patient Report</strong><small>{analysisPersisted ? 'DB 저장 완료' : analysis ? '미리보기' : '대기'}</small></div>
          </div>
        </section>

        {error && <div className="error-banner">{error}</div>}

        {showJson && (
          <section className={`input-workspace ${showRawJson ? 'raw-open' : ''}`}>
            <article className="panel connection-panel">
              <div className="panel-heading">
                <div><p className="section-kicker">Account</p><h3>로그인된 계정</h3></div>
              </div>
              <StatusBadge value="CONNECTED" />
              <p className="account-email">{accountEmail}</p>
              <p className="server-summary">게임 기록은 Spring에서 조회하고 선택한 기록만 AI 서버로 분석합니다.</p>
              <button className="button secondary refresh-button" onClick={() => loadHistories()} disabled={historyLoading}>
                {historyLoading ? '불러오는 중...' : '기록 새로고침'}
              </button>
              <button className="text-button raw-toggle" onClick={() => setShowRawJson((value) => !value)}>
                {showRawJson ? '개발자 JSON 닫기' : '개발자 JSON 열기'}
              </button>
            </article>

            {showRawJson && <article className="panel json-panel">
              <div className="panel-heading inline-heading">
                <div><p className="section-kicker">Raw session</p><h3>분석할 JSON</h3></div>
                <button className="button primary" onClick={analyzeJson} disabled={loading}>{loading ? '분석 중...' : '이 JSON 분석'}</button>
              </div>
              <textarea value={rawJson} onChange={(event) => setRawJson(event.target.value)} spellCheck="false" />
            </article>}

            <article className="panel history-panel">
              <div className="panel-heading"><div><p className="section-kicker">Backend history</p><h3>저장된 게임 기록</h3></div></div>
              {histories.length === 0 ? <p className="empty-text">저장된 기록이 없습니다. Unity 플레이 후 새로고침하거나 샘플 분석을 실행하세요.</p> : (
                <div className="history-list">
                  {histories.map((history) => (
                    <button key={history.historyId} onClick={() => analyzeHistory(history.historyId)}>
                      <span><strong>{history.gameName || history.gameId}</strong><small>{history.primaryPart} · {history.actionCount ?? 0}회 · 계약 {history.schemaVersion || 'legacy'}</small></span>
                      <span><strong>{history.score ?? '-'}</strong><small>{history.endedAtMs ? new Date(history.endedAtMs).toLocaleDateString('ko-KR') : ''}</small></span>
                    </button>
                  ))}
                </div>
              )}
            </article>
          </section>
        )}

        {analysis ? (
          <AnalysisDashboard
            analysis={analysis}
            persisted={analysisPersisted}
            analysisHistory={analysisHistory}
            userAnalyses={userAnalyses}
          />
        ) : (
          <section className="empty-state">
            <div className="empty-icon">↗</div>
            <h2>분석 결과가 아직 없습니다</h2>
            <p>‘게임 기록’을 열어 저장된 기록을 선택하거나 샘플 분석을 실행하세요.</p>
            <button className="button primary" onClick={() => { setShowJson(true); loadHistories(); }} disabled={historyLoading}>
              {historyLoading ? '기록 불러오는 중...' : '내 게임 기록 보기'}
            </button>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
