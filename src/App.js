import './App.css';
import { useState, useEffect } from 'react';

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
  const [profile, setProfile] = useState({ age: '', gender: '', height: '', weight: '', dominant_hand: '' });

  // currently created user id after signup
  const [currentUserId, setCurrentUserId] = useState(null);

  // game play result data
  const [playResult, setPlayResult] = useState(null);
  // login form state
  const [loginForm, setLoginForm] = useState({ personal_id: '', personal_pw: '' });
  // server-provided configuration (exe paths etc.)
  const [serverConfig, setServerConfig] = useState(null);

  const handleSignupChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSignup((s) => ({ ...s, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleProfileChange = (e) => {
    const { name, value, type, checked } = e.target;
    setProfile((p) => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
  };



  // Try to auto-load play result from a fixed local path when entering result screen.
  // 개발용: 로컬 서버에서 최신 AppData 파일을 제공합니다
  const DEFAULT_PLAY_RESULT_PATH = 'http://localhost:4000/woodgame';
  // 자동 로드를 비활성화했습니다 — '결과보기' 버튼으로만 파일을 불러옵니다.

  // Manual loader triggered by "결과보기" button
  const loadDefaultPlayResult = async () => {
    try {
      const res = await fetch(DEFAULT_PLAY_RESULT_PATH);
      if (!res.ok) throw new Error('파일을 불러올 수 없습니다: ' + res.status);
      const data = await res.json();
      setPlayResult(data);
      console.log('Loaded play result from default path (button):', DEFAULT_PLAY_RESULT_PATH);
    } catch (err) {
      console.warn('결과 로드 실패:', err.message);
        alert('결과 파일을 불러오지 못했습니다. 로컬 서버가 실행 중인지 확인하세요 (node local-server.js).');
    }
  };

  // Load server config (exe paths) once on mount
  useEffect(() => {
    let canceled = false;
    const loadConfig = async () => {
      try {
        const res = await fetch('http://localhost:4000/config');
        if (!res.ok) return;
        const raw = await res.json();
        // Normalize string -> { default_exe: string }
        const cfg = typeof raw === 'string' ? { default_exe: raw } : raw;
        if (!canceled) setServerConfig(cfg);
      } catch (e) {
        console.warn('Could not load server config', e.message);
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
            const res = await fetch('http://localhost:4000/config');
              if (res.ok) {
                const rawCfg = await res.json();
                const cfg = typeof rawCfg === 'string' ? { default_exe: rawCfg } : rawCfg;
                setServerConfig(cfg);
                pathToUse = cfg.default_exe;
              }
          } catch (e) {
            // ignore
          }
        }
      }

      if (!pathToUse) {
        alert('실행 파일 경로가 설정되지 않았습니다. 서버의 /config를 확인하세요.');
        return false;
      }

      const res = await fetch('http://localhost:4000/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: pathToUse, args }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json && json.message ? json.message : 'launch failed');
      console.log('launched exe', pathToUse);
      return true;
    } catch (e) {
      console.error('launch failed', e.message);
      alert('실행에 실패했습니다: ' + e.message);
      return false;
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
      setProfile({ age: '', gender: '', height: '', weight: '', dominant_hand: '' });
    } else {
      setProfile({
        age: u.age !== null && u.age !== undefined ? String(u.age) : '',
        gender: u.gender || '',
        height: u.height !== null && u.height !== undefined ? String(u.height) : '',
        weight: u.weight !== null && u.weight !== undefined ? String(u.weight) : '',
        dominant_hand: u.dominant_hand || '',
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
    users[idx].age = profile.age ? parseInt(profile.age, 10) : null;
    users[idx].weight = profile.weight ? parseFloat(profile.weight) : null;
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
                <span>나이</span>
                <input
                  type="number"
                  name="age"
                  placeholder="25"
                  min="1"
                  max="120"
                  required
                  value={profile.age}
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

              <div className="field-group">
                <label className="field">
                  <span>키 (cm)</span>
                  <input
                    type="number"
                    name="height"
                    placeholder="170"
                    min="50"
                    max="250"
                    step="0.1"
                    required
                    value={profile.height}
                    onChange={handleProfileChange}
                  />
                </label>

                <label className="field">
                  <span>체중 (kg)</span>
                  <input
                    type="number"
                    name="weight"
                    placeholder="70"
                    min="20"
                    max="500"
                    step="0.1"
                    required
                    value={profile.weight}
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
