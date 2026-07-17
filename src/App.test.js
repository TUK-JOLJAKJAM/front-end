import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';

const ANALYSIS_RESPONSE = {
  history_id: 'react-demo-session',
  score: 88,
  safety_status: 'SAFE',
  difficulty_recommend: 'MAINTAIN',
  feedback_message: '안정적으로 수행했습니다.',
  game_id: 'ADVENTURE_FIGHT',
  body_part: 'SHOULDER',
  side: 'BOTH',
  analysis_version: 'rules-test',
  analyzed_at_ms: 1700000000000,
  chart_data: {},
  distribution_data: {},
  metrics: {},
  difficulty: {},
  data_quality: { completeness: 1, confidence: 1, status: 'GOOD', assessable: true, sensor_sample_count: 30, flags: [] },
  coaching_messages: [],
  reason_codes: [],
  risk_flags: [],
};

const CONFIGURED_BACKEND_URL = (process.env.REACT_APP_BACKEND_API_URL || 'http://localhost:8080').replace(/\/$/, '');

function jsonResponse(body, ok = true) {
  return Promise.resolve({
    ok,
    status: ok ? 200 : 401,
    text: async () => (body === null ? '' : JSON.stringify(body)),
  });
}

beforeEach(() => {
  sessionStorage.clear();
  jest.spyOn(window, 'scrollTo').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
  delete global.fetch;
});

test('restores the authentication entry point before the dashboard', () => {
  render(<App />);

  expect(screen.getByRole('heading', { name: '환영합니다!' })).toBeInTheDocument();
  expect(screen.getByRole('region', { name: '로그인' })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: '재활 게임 데이터 분석' })).not.toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('HTTP 데모 모드');
});

test('logs in, loads histories, and only then opens the analysis dashboard', async () => {
  global.fetch = jest.fn()
    .mockImplementationOnce(() => jsonResponse({ accessToken: 'access-test', userId: 'user-test' }))
    .mockImplementationOnce(() => jsonResponse({
      items: [{ historyId: 'history-1', gameName: '수동 연동 테스트', primaryPart: 'SHOULDER', actionCount: 6, score: 84 }],
    }));

  render(<App />);
  fireEvent.change(screen.getByLabelText('이메일'), { target: { value: '  test@example.com  ' } });
  fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'RefitDemo!1234' } });
  fireEvent.click(screen.getByRole('button', { name: '로그인하고 분석 보기' }));

  expect(await screen.findByRole('heading', { name: '재활 게임 데이터 분석' })).toBeInTheDocument();
  expect(await screen.findByText('수동 연동 테스트')).toBeInTheDocument();
  expect(global.fetch).toHaveBeenNthCalledWith(
    1,
    `${CONFIGURED_BACKEND_URL}/api/v1/auth/login`,
    expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('"email":"test@example.com"'),
    }),
  );
  expect(global.fetch).toHaveBeenNthCalledWith(
    2,
    `${CONFIGURED_BACKEND_URL}/api/v1/game-histories?size=50`,
    expect.objectContaining({ headers: { Authorization: 'Bearer access-test' } }),
  );
});

test('signs up through Spring and shows profile setup before the dashboard', async () => {
  global.fetch = jest.fn()
    .mockImplementationOnce(() => jsonResponse(null))
    .mockImplementationOnce(() => jsonResponse({ accessToken: 'new-access', userId: 'new-user' }))
    .mockImplementationOnce(() => jsonResponse({ items: [] }));

  render(<App />);
  fireEvent.click(screen.getAllByRole('button', { name: '회원가입' })[0]);
  fireEvent.change(screen.getByLabelText('이름'), { target: { value: '테스트 사용자' } });
  fireEvent.change(screen.getByLabelText('이메일'), { target: { value: 'new@example.com' } });
  fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'RefitDemo!1234' } });
  fireEvent.change(screen.getByLabelText('비밀번호 확인'), { target: { value: 'RefitDemo!1234' } });
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: '가입하고 시작하기' }));

  expect(await screen.findByRole('heading', { name: '테스트 프로필 설정' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '지금은 건너뛰기' }));
  expect(await screen.findByRole('heading', { name: '재활 게임 데이터 분석' })).toBeInTheDocument();
  expect(global.fetch).toHaveBeenNthCalledWith(
    1,
    `${CONFIGURED_BACKEND_URL}/api/v1/auth/signup`,
    expect.objectContaining({ method: 'POST' }),
  );
});

test('runs AI analysis only after an authenticated session exists', async () => {
  const configuredAiUrl = (process.env.REACT_APP_AI_API_URL || 'http://localhost:8000').replace(/\/$/, '');
  sessionStorage.setItem('refitAccessToken', 'existing-access');
  sessionStorage.setItem('refitAccountEmail', 'test@example.com');
  global.fetch = jest.fn().mockImplementation(() => jsonResponse(ANALYSIS_RESPONSE));

  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: '샘플 분석' }));

  await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
  expect(global.fetch).toHaveBeenCalledWith(
    `${configuredAiUrl}/api/v1/analyze_session`,
    expect.objectContaining({ method: 'POST' }),
  );
  expect(await screen.findByText('안정적으로 수행했습니다.')).toBeInTheDocument();
  expect(screen.getByText('88')).toBeInTheDocument();
  expect(screen.getByText('샘플 미리보기 결과입니다')).toBeInTheDocument();
});

test('routes a saved game history through Spring and reports DB persistence', async () => {
  sessionStorage.setItem('refitAccessToken', 'existing-access');
  sessionStorage.setItem('refitAccountEmail', 'test@example.com');
  global.fetch = jest.fn()
    .mockImplementationOnce(() => jsonResponse({
      items: [{ historyId: 'history-1', gameName: 'Unity 어깨 게임', primaryPart: 'SHOULDER', actionCount: 6, score: 84, schemaVersion: '2.0' }],
    }))
    .mockImplementationOnce(() => jsonResponse({ items: [] }))
    .mockImplementationOnce(() => jsonResponse({ ...ANALYSIS_RESPONSE, analysis_id: 'analysis-1' }))
    .mockImplementationOnce(() => jsonResponse({ historyId: 'history-1', gameId: 'UNITY_GAME', gameData: [] }))
    .mockImplementationOnce(() => jsonResponse({ items: [{ analysisId: 'analysis-1' }] }))
    .mockImplementationOnce(() => jsonResponse({ items: [{ analysisId: 'analysis-1', historyId: 'history-1', score: 88, safetyStatus: 'SAFE', analyzedAtMs: 1700000000000 }] }));

  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: '기록 새로고침' }));
  fireEvent.click(await screen.findByRole('button', { name: /Unity 어깨 게임/ }));

  expect(await screen.findByText('Spring DB에 분석 결과가 저장되었습니다')).toBeInTheDocument();
  expect(global.fetch).toHaveBeenNthCalledWith(
    3,
    `${CONFIGURED_BACKEND_URL}/api/v1/game-histories/history-1/analyses`,
    expect.objectContaining({
      method: 'POST',
      headers: { Authorization: 'Bearer existing-access' },
    }),
  );
});

test('falls back to the latest persisted result when a new analysis is unavailable', async () => {
  sessionStorage.setItem('refitAccessToken', 'existing-access');
  sessionStorage.setItem('refitAccountEmail', 'test@example.com');
  global.fetch = jest.fn()
    .mockImplementationOnce(() => jsonResponse({
      items: [{ historyId: 'history-1', gameName: 'Unity 허리 게임', primaryPart: 'WAIST', actionCount: 5 }],
    }))
    .mockImplementationOnce(() => jsonResponse({ items: [] }))
    .mockImplementationOnce(() => jsonResponse({ error: 'AI_ANALYSIS_UNAVAILABLE' }, false))
    .mockImplementationOnce(() => jsonResponse({ ...ANALYSIS_RESPONSE, analysis_id: 'cached-analysis' }))
    .mockImplementationOnce(() => jsonResponse({ historyId: 'history-1', gameId: 'UNITY_GAME' }))
    .mockImplementationOnce(() => jsonResponse({ items: [{ analysisId: 'cached-analysis' }] }))
    .mockImplementationOnce(() => jsonResponse({ items: [{ analysisId: 'cached-analysis', historyId: 'history-1', score: 88, safetyStatus: 'SAFE', analyzedAtMs: 1700000000000 }] }));

  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: '기록 새로고침' }));
  fireEvent.click(await screen.findByRole('button', { name: /Unity 허리 게임/ }));

  expect(await screen.findByText(/DB에 저장된 최신 분석 결과를 표시합니다/)).toBeInTheDocument();
  expect(global.fetch).toHaveBeenNthCalledWith(
    4,
    `${CONFIGURED_BACKEND_URL}/api/v1/game-histories/history-1/analyses/latest`,
    expect.objectContaining({ headers: { Authorization: 'Bearer existing-access' } }),
  );
});
