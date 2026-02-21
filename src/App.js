import './App.css';
import { useState } from 'react';

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

function App() {
  const [screen, setScreen] = useState('signup');

  // signup form fields
  const [signup, setSignup] = useState({ name: '', personal_id: '', password: '', confirm: '', terms: false });
  // profile form fields
  const [profile, setProfile] = useState({ age: '', gender: '', height: '', weight: '' });

  // currently created user id after signup
  const [currentUserId, setCurrentUserId] = useState(null);

  const handleSignupChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSignup((s) => ({ ...s, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfile((p) => ({ ...p, [name]: value }));
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

    saveUsers(users);

    alert('프로필 정보 저장 완료 (localStorage에 저장됨)');
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

              <button type="submit" className="submit">시작하기</button>

              <p className="footnote">
                이미 계정이 있나요? <a href="#login">로그인</a>
              </p>
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
    </>
  );
}

export default App;
