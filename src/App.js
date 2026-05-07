import './App.css';
import { useState, useEffect } from 'react';

const API_BASE = 'http://43.200.20.216/api/v1';
const LOCAL_SERVER_BASE = 'http://localhost:4000';

async function sendPlayResultToServer(playResult, userId = null) {
  const url = `${API_BASE}/game-result`; // 백엔드 엔드포인트를 실제값으로 바꾸세요
  const body = {
    userId,
    timestamp: new Date().toISOString(),
    ...playResult,
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.warn('백엔드 게임 결과 저장 실패', res.status, errorText);
      return false;
    }

    console.log('백엔드 게임 결과 저장 성공', await res.json());
    return true;
  } catch (err) {
    console.warn('백엔드 게임 결과 저장 중 예외', err.message);
    return false;
  }
}

function loadUsers() {
  try {
    const raw = localStorage.getItem('users');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to load users', e);
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem('users', JSON.stringify(users));
}

// Translate body_part and side to Korean
function translateBodyPart(bodyPart, side) {
  const bodyPartMap = {
    'WRIST': '손목',
    'SHOULDER': '어깨',
    'WAIST': '허리',
    'LEG': '다리',
  };

  const sideMap = {
    'LEFT': '왼쪽',
    'RIGHT': '오른쪽',
    'BOTH': '양쪽',
    'NONE': '',
  };

  const bp = (bodyPart || '').toString().toUpperCase().trim();
  const sd = (side || '').toString().toUpperCase().trim();

  const part = bodyPartMap[bp] || bodyPartMap[bodyPart] || bodyPart || '';
  const sideStr = sideMap[sd] !== undefined ? sideMap[sd] : '';

  return sideStr ? `${sideStr} ${part}` : part;
}

function App() {
  const [screen, setScreen] = useState('signup');

  // signup form fields
  const [signup, setSignup] = useState({ name: '', personal_id: '', password: '', confirm: '', terms: false });
  // profile form fields
  const [profile, setProfile] = useState({ birth_year: '', gender: '', height_cm: '170', weight_kg: '70', dominant_hand: '', diagnosis_tags: '', pain_baseline_0_10: '0', notes: '' });

  // currently created user id after signup
  const [currentUserId, setCurrentUserId] = useState(null);

  // game play result data
  const [playResult, setPlayResult] = useState(null);
  // login form state
  const [loginForm, setLoginForm] = useState({ personal_id: '', personal_pw: '' });
  // server-provided configuration (exe paths, file path 등)
  const [serverConfig, setServerConfig] = useState({ file_path: '', default_exe: '', exe_paths: null });
  const [localServerReady, setLocalServerReady] = useState(false);

  const handleSignupChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSignup((s) => ({ ...s, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleProfileChange = (e) => {
    const { name, value, type, checked } = e.target;
    setProfile((p) => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
  };

  const fetchLocalApi = async (path, options) => {
    const url = `${LOCAL_SERVER_BASE}${path}`;
    const res = await fetch(url, options);
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      throw new Error(payload.message || payload.error || `local server ${path} failed`);
    }
    return res.json().catch(() => ({}));
  };

  const refreshLocalServerConfig = async () => {
    try {
      const raw = await fetchLocalApi('/config');
      const cfg = normalizeServerConfig(raw);
      setServerConfig(cfg);
      setLocalServerReady(true);
      return cfg;
    } catch (e) {
      console.warn('local server config refresh failed', e.message);
      setLocalServerReady(false);
      return null;
    }
  };

  // Try to auto-load play result from a fixed local path when entering result screen.
  // 개발용: 로컬 서버에서 최신 AppData 파일을 제공합니다
  const DEFAULT_PLAY_RESULT_PATH = `${LOCAL_SERVER_BASE}/woodgame`;
  // 자동 로드를 비활성화했습니다 — '결과보기' 버튼으로만 파일을 불러옵니다.

  // Manual loader triggered by "결과보기" button
  const loadDefaultPlayResult = async () => {
    try {
      const data = await fetchLocalApi('/woodgame');
      setPlayResult(data);
      console.log('Loaded play result from default path (button):', DEFAULT_PLAY_RESULT_PATH);

      // 결과를 백엔드 DB에도 전송
      await sendPlayResultToServer(data, currentUserId);
    } catch (err) {
      console.warn('결과 로드 실패:', err.message);
        alert('결과 파일을 불러오지 못했습니다. 로컬 서버가 실행 중인지 확인하세요 (node local-server.js).');
    }
  };

  const normalizeServerConfig = (raw) => {
    if (typeof raw === 'string') {
      return { file_path: '', default_exe: raw, exe_paths: null };
    }

    const exePaths = raw.exe_paths || raw;
    const defaultExe = typeof exePaths === 'string'
      ? exePaths
      : exePaths?.default_exe || raw.default_exe || '';

    return {
      file_path: raw.file_path || '',
      default_exe: defaultExe,
      exe_paths: typeof exePaths === 'object' ? exePaths : null,
    };
  };

  // Load server config (exe paths) once on mount
  useEffect(() => {
    let canceled = false;
    const loadConfig = async () => {
      const cfg = await refreshLocalServerConfig();
      if (canceled) return;
      if (!cfg) {
        setLocalServerReady(false);
      }
    };
    loadConfig();
    return () => { canceled = true; };
  }, []);

  // Launch an exe via local server. If `exePath` is omitted, try server-provided default.
  const launchExe = async (exePath, args = []) => {
    try {
      let pathToUse = exePath;
      if (!pathToUse) {
        if (serverConfig && serverConfig.default_exe) {
          pathToUse = serverConfig.default_exe;
        } else {
          // try to fetch config on demand
          try {
            const rawCfg = await fetchLocalApi('/config');
            const cfg = normalizeServerConfig(rawCfg);
            setServerConfig(cfg);
            pathToUse = cfg.default_exe;
          } catch (e) {
            // ignore
          }
        }
      }

      if (!pathToUse) {
        alert('실행 파일 경로가 설정되지 않았습니다. 서버의 /config를 확인하세요.');
        return false;
      }

      await fetchLocalApi('/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: pathToUse, args }),
      });
      console.log('launched exe', pathToUse);
      return true;
    } catch (e) {
      console.error('launch failed', e.message);
      alert('실행에 실패했습니다: ' + e.message);
      return false;
    }
  };

  const chooseResultFile = async () => {
    try {
      const json = await fetchLocalApi('/choose-file');
      setServerConfig((cfg) => ({ ...cfg, file_path: json.file_path || cfg.file_path }));
      alert(`결과 파일이 선택되었습니다:\n${json.file_path}`);
    } catch (e) {
      console.error('choose-file failed', e.message);
      alert('결과 파일 선택에 실패했습니다: ' + e.message);
    }
  };

  const chooseExePath = async () => {
    try {
      const json = await fetchLocalApi('/choose-exe');
      const selectedPath = json.exe_path || json.default_exe || json.exePath || '';
      setServerConfig((cfg) => ({ ...cfg, default_exe: selectedPath, exe_paths: { ...cfg.exe_paths, default_exe: selectedPath } }));
      alert(`실행 파일이 선택되었습니다:\n${selectedPath}`);
    } catch (e) {
      console.error('choose-exe failed', e.message);
      alert('실행 파일 선택에 실패했습니다: ' + e.message);
    }
  };

  const handleLoginChange = (e) => {
    const { name, value } = e.target;
    setLoginForm((l) => ({ ...l, [name]: value }));
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    const users = loadUsers();
    const found = users.find((u) => u.personal_id === loginForm.personal_id && u.personal_pw === loginForm.personal_pw);
    if (!found) {
      alert('아이디 또는 비밀번호가 일치하지 않습니다.');
      return;
    }
    setCurrentUserId(found.user_id);
    setLoginForm({ personal_id: '', personal_pw: '' });
    setScreen('postLogin');
  };

  const openProfileForCurrentUser = () => {
    if (!currentUserId) {
      setScreen('profile');
      return;
    }
    const users = loadUsers();
    const u = users.find((x) => x.user_id === currentUserId);
    if (!u) {
      setProfile({ birth_year: '', gender: '', height_cm: '170', weight_kg: '70', dominant_hand: '', diagnosis_tags: '', pain_baseline_0_10: '0', notes: '' });
    } else {
      setProfile({
        birth_year: u.birth_year !== null && u.birth_year !== undefined ? String(u.birth_year) : '',
        gender: u.gender || '',
        height_cm: u.height_cm !== null && u.height_cm !== undefined ? String(u.height_cm) : '',
        weight_kg: u.weight_kg !== null && u.weight_kg !== undefined ? String(u.weight_kg) : '',
        dominant_hand: u.dominant_hand || '',
        diagnosis_tags: u.diagnosis_tags || '',
        pain_baseline_0_10: u.pain_baseline_0_10 !== null && u.pain_baseline_0_10 !== undefined ? String(u.pain_baseline_0_10) : '0',
        notes: u.notes || '',
      });
    }
    setScreen('profile');
  };

  const startGameForCurrentUser = () => {
    // clear any previous play result and go to result screen (placeholder for actual game)
    setPlayResult(null);
    setScreen('result');
    // 게임 실행

    /**********************************************************
    개발용: exe 경로를 실제 게임 실행 파일 경로로 변경하세요
    예시 경로: C:\Users\zsxcd\Downloads\ReFit_Demo_CustomSave\ReFit_Demo.exe
    ***********************************************************/
      // Use server-configured exe path
      launchExe();
  };

  const handleSignupSubmit = (event) => {
    event.preventDefault();

    if (signup.password !== signup.confirm) {
      alert('비밀번호와 확인이 일치하지 않습니다.');
      return;
    }

    // Load existing users and create a new id
    const users = loadUsers();
    const nextId = users.length ? Math.max(...users.map((u) => u.user_id)) + 1 : 1;

    // Build user object matching provided schema in attachment
    const user = {
      user_id: nextId,
      personal_id: signup.personal_id || '',
      personal_pw: signup.password || '',
      age: null,
      weight: null,
      body_link: `/api/body/${nextId}`,
      game_link: `/api/game/${nextId}`,
    };

    users.push(user);
    saveUsers(users);

    setCurrentUserId(nextId);
    setScreen('profile');
  };

  const handleProfileSubmit = (event) => {
    event.preventDefault();

    if (!currentUserId) {
      alert('계정이 생성되지 않았습니다. 다시 시도해주세요.');
      return;
    }

    const users = loadUsers();
    const idx = users.findIndex((u) => u.user_id === currentUserId);
    if (idx === -1) {
      alert('계정 정보를 찾을 수 없습니다.');
      return;
    }

    // Update fields according to schema
    users[idx].birth_year = profile.birth_year ? parseInt(profile.birth_year, 10) : null;
    users[idx].gender = profile.gender || null;
    users[idx].height_cm = profile.height_cm ? parseFloat(profile.height_cm) : null;
    users[idx].weight_kg = profile.weight_kg ? parseFloat(profile.weight_kg) : null;
    users[idx].disease_code = profile.disease_code || null;
    users[idx].diagnosis_tags = profile.diagnosis_tags || null;
    users[idx].pain_baseline_0_10 = profile.pain_baseline_0_10 ? parseInt(profile.pain_baseline_0_10, 10) : 0;
    users[idx].notes = profile.notes || null;
    // Persist dominant hand
    users[idx].dominant_hand = profile.dominant_hand || null;

    saveUsers(users);

    // For now show the result screen immediately (test data)
    setScreen('result');
    // launch the game exe after profile submit (server provides path)
      launchExe();
  };

  return (
    <>
      {screen === 'signup' && (
        <main className="page">
          <section className="hero">
            <p className="eyebrow">치료와 게임의 만남</p>
            <h1 className="title">환영합니다!</h1>
            <p className="lede">
              재미있는 게임 속에서 맞춤형 재활치료를 받으세요. 
              당신의 회복 속도에 맞춘 프로그램이 기다리고 있습니다.
            </p>
            <ul className="benefits">
              <li>진행 상황 분석과 실시간 피드백</li>
              <li>개인 맞춤형 치료 프로토콜</li>
            </ul>
          </section>

          <section className="card" aria-label="회원가입">
            <div className="card-header">
              <span className="badge">New</span>
              <h2>회원가입</h2>
              <p className="hint">회원님의 정보를 입력해주세요.</p>
            </div>

            <form className="form" onSubmit={handleSignupSubmit}>
              <label className="field">
                <span>이름</span>
                <input
                  type="text"
                  name="name"
                  placeholder="홍길동"
                  required
                  value={signup.name}
                  onChange={handleSignupChange}
                />
              </label>

              <label className="field">
                <span>사용자 ID</span>
                <input
                  type="text"
                  name="personal_id"
                  placeholder="my_username"
                  required
                  value={signup.personal_id}
                  onChange={handleSignupChange}
                />
              </label>

              <div className="field-group">
                <label className="field">
                  <span>비밀번호</span>
                  <input
                    type="password"
                    name="password"
                    placeholder="••••••••"
                    required
                    value={signup.password}
                    onChange={handleSignupChange}
                  />
                </label>

                <label className="field">
                  <span>비밀번호 확인</span>
                  <input
                    type="password"
                    name="confirm"
                    placeholder="••••••••"
                    required
                    value={signup.confirm}
                    onChange={handleSignupChange}
                  />
                </label>
              </div>

              <label className="checkbox">
                <input
                  type="checkbox"
                  name="terms"
                  required
                  checked={signup.terms}
                  onChange={handleSignupChange}
                />
                <span>
                  이용약관과 개인정보 처리방침에 동의합니다
                </span>
              </label>

              <button type="submit" className="submit">다음으로</button>

              <p className="footnote">
                이미 계정이 있나요? <a href="#login" onClick={(e) => { e.preventDefault(); setScreen('login'); }}>로그인</a>
              </p>
            </form>
          </section>
        </main>
      )}

      {screen === 'postLogin' && (
        <main className="page">
          <section className="hero">
            <p className="eyebrow">환영합니다</p>
            <h1 className="title">로그인에 성공했습니다</h1>
            <p className="lede">계속하려면 다음 중 하나를 선택하세요.</p>
          </section>

          <section className="card" aria-label="선택">
            <div className="card-header">
              <h2>다음 작업 선택</h2>
              <p className="hint">정보 수정 또는 게임 시작을 선택할 수 있습니다.</p>
            </div>

            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button className="submit" onClick={openProfileForCurrentUser}>정보 수정</button>
              <button className="submit" onClick={startGameForCurrentUser}>게임 시작</button>
              <button className="submit" onClick={() => setScreen('signup')}>로그아웃</button>
            </div>

            <div style={{ padding: 16, marginTop: 16, borderTop: '1px solid #eee', display: 'grid', gap: 12 }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>로컬 설정</h3>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="submit" onClick={chooseResultFile}>결과 파일 선택</button>
                <button className="submit" onClick={chooseExePath}>게임 실행 파일 선택</button>
                <button className="submit" onClick={refreshLocalServerConfig}>로컬 서버 새로고침</button>
              </div>
              <div style={{ fontSize: 13, color: '#444', lineHeight: 1.6 }}>
                <div><strong>로컬 서버:</strong> {localServerReady ? '연결됨' : '연결 안됨'}</div>
                <div><strong>현재 결과 파일:</strong> {serverConfig.file_path || '설정되지 않음'}</div>
                <div><strong>현재 실행 파일:</strong> {serverConfig.default_exe || '설정되지 않음'}</div>
              </div>
            </div>
          </section>
        </main>
      )}

      {screen === 'login' && (
        <main className="page">
          <section className="hero">
            <p className="eyebrow">로그인</p>
            <h1 className="title">계정으로 로그인</h1>
            <p className="lede">계정 정보를 입력해 프로필 설정을 계속하세요.</p>
          </section>

          <section className="card" aria-label="로그인">
            <div className="card-header">
              <h2>로그인</h2>
              <p className="hint">사용자 ID와 비밀번호를 입력하세요.</p>
            </div>

            <form className="form" onSubmit={handleLoginSubmit}>
              <label className="field">
                <span>사용자 ID</span>
                <input
                  type="text"
                  name="personal_id"
                  required
                  value={loginForm.personal_id}
                  onChange={handleLoginChange}
                />
              </label>

              <label className="field">
                <span>비밀번호</span>
                <input
                  type="password"
                  name="personal_pw"
                  required
                  value={loginForm.personal_pw}
                  onChange={handleLoginChange}
                />
              </label>

              <div style={{ display: 'flex', gap: 8 }}>
                <button className="submit" type="submit">로그인</button>
                <button className="submit" onClick={(e) => { e.preventDefault(); setScreen('signup'); }}>회원가입</button>
              </div>
            </form>
          </section>
        </main>
      )}

      {screen === 'profile' && (
        <main className="page">
          <section className="hero">
            <p className="eyebrow">개인화 설정</p>
            <h1 className="title">당신에게 맞는 치료를 준비중입니다</h1>
            <p className="lede">
              신체 정보를 입력하면 당신의 상태에 최적화된 
              재활 게임 프로그램을 생성해드립니다.
            </p>
            <ul className="benefits">
              <li>개인별 회복 목표 설정</li>
              <li>난이도 자동 조절</li>
            </ul>
          </section>

          <section className="card" aria-label="프로필 설정">
            <div className="card-header">
              <span className="badge">Step 2</span>
              <h2>신체 정보 입력</h2>
              <p className="hint">정확한 신체 정보로 더 효과적인 치료를 받으세요.</p>
            </div>

            <form className="form" onSubmit={handleProfileSubmit}>
              <label className="field">
                <span>태어난 년도</span>
                <input
                  type="number"
                  name="birth_year"
                  placeholder="1990"
                  min="1900"
                  max={new Date().getFullYear()}
                  required
                  value={profile.birth_year}
                  onChange={handleProfileChange}
                />
              </label>

              <label className="field">
                <span>성별</span>
                <select
                  name="gender"
                  required
                  className="select-field"
                  value={profile.gender}
                  onChange={handleProfileChange}
                >
                  <option value="">선택해주세요</option>
                  <option value="male">남성</option>
                  <option value="female">여성</option>
                  <option value="other">기타</option>
                </select>
              </label>

              <label className="field">
                <span>우세손</span>
                <div className="dominant-hand" style={{ marginTop: 8 }}>
                  <label>
                    <input
                      type="radio"
                      name="dominant_hand"
                      value="left"
                      checked={profile.dominant_hand === 'left'}
                      onChange={handleProfileChange}
                      required
                    />
                    <span>왼손</span>
                  </label>

                  <label>
                    <input
                      type="radio"
                      name="dominant_hand"
                      value="right"
                      checked={profile.dominant_hand === 'right'}
                      onChange={handleProfileChange}
                    />
                    <span>오른손</span>
                  </label>
                </div>
              </label>

              <label className="field">
                <span>질병 코드</span>
                <input
                  type="text"
                  name="disease_code"
                  placeholder="예: M54.5"
                  value={profile.disease_code}
                  onChange={handleProfileChange}
                />
              </label>

              <label className="field">
                <span>평소 통증 (0~10)</span>
                <select
                  name="pain_baseline_0_10"
                  required
                  value={profile.pain_baseline_0_10}
                  onChange={handleProfileChange}
                >
                  {Array.from({ length: 11 }, (_, idx) => (
                    <option key={idx} value={idx}>{idx}</option>
                  ))}
                </select>
              </label>

              <div className="field-group">
                <label className="field">
                  <span>키 (cm)</span>
                  <input
                    type="number"
                    name="height_cm"
                    placeholder="170"
                    min="50"
                    max="250"
                    step="0.1"
                    required
                    value={profile.height_cm}
                    onChange={handleProfileChange}
                  />
                </label>

                <label className="field">
                  <span>체중 (kg)</span>
                  <input
                    type="number"
                    name="weight_kg"
                    placeholder="70"
                    min="20"
                    max="500"
                    step="0.1"
                    required
                    value={profile.weight_kg}
                    onChange={handleProfileChange}
                  />
                </label>
              </div>

              <button type="submit" className="submit">시작하기</button>

              <p className="footnote">
                <a href="#back" onClick={(e) => { e.preventDefault(); setScreen('signup'); }}>이전으로 돌아가기</a>
              </p>
            </form>
          </section>
        </main>
      )}

      {screen === 'result' && (
        <main className="page">
          <section className="hero">
            <p className="eyebrow">게임 결과</p>
            <h1 className="title">수고 하셨습니다!</h1>
            <p className="lede">결과 보기 버튼을 눌러 상세 결과를 확인해보세요.</p>
          </section>

          <section className="card" aria-label="게임 결과">
            <div className="card-header">
              <h2>{playResult ? '게임 결과 상세' : '저장한 게임 결과를 확인하세요'}</h2>
              <p className="hint">{playResult ? '게임 실행 결과를 확인하세요.' : ''}</p>
            </div>

            <div style={{ padding: '16px' }}>
              {!playResult ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="submit" onClick={loadDefaultPlayResult}>결과보기</button>
                  <button
                    className="submit"
                    onClick={async () => {
                      // launch exe (server-provided path), then go to profile
                      await launchExe();
                      setPlayResult(null);
                      setScreen('profile');
                    }}
                  >
                    다시하기
                  </button>
                  <button className="submit" onClick={() => setScreen('signup')}>홈으로</button>
                </div>
              ) : (
                <div>
                  {/* 대상 부위 */}
                  <div style={{ marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid #eee' }}>
                    <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>대상 부위</h3>
                    <div>
                        <div className="body-part-translation">
                          {translateBodyPart(playResult.body_part, playResult.side) || '—'}
                        </div>
                      </div>
                  </div>

                  {/* 플레이 시간 */}
                  <div style={{ marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid #eee' }}>
                    <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>플레이 시간</h3>
                    <div>
                      <div style={{ fontSize: 12, color: '#666' }}>소요 시간</div>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>
                        {(playResult.duration_sec !== undefined && playResult.duration_sec !== null)
                          ? `${playResult.duration_sec}초`
                          : '—'}
                      </div>
                    </div>
                  </div>

                  {/* 성과 */}
                  <div style={{ marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid #eee' }}>
                    <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>성과</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
                        <div>
                          <div style={{ fontSize: 12, color: '#666' }}>점수</div>
                          <div style={{ fontSize: 20, fontWeight: 600, color: '#2ecc71' }}>
                            {playResult.score !== undefined ? playResult.score.toLocaleString() : '—'}
                          </div>
                        </div>
                      </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                    <button
                      className="submit"
                      onClick={() => {
                        setPlayResult(null);
                      }}
                    >
                      다시 업로드
                    </button>
                    <button
                      className="submit"
                      onClick={() => {
                        setPlayResult(null);
                        setScreen('profile');
                      }}
                    >
                      다시하기
                    </button>
                    <button className="submit" onClick={() => setScreen('signup')}>홈으로</button>
                  </div>
                </div>
              )}
            </div>
          </section>
        </main>
      )}
    </>
  );
}

export default App;
