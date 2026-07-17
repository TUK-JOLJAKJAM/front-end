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
  data_quality: { completeness: 1, status: 'GOOD', flags: [] },
  coaching_messages: [],
  reason_codes: [],
  risk_flags: [],
};

beforeEach(() => {
  jest.spyOn(window, 'scrollTo').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('renders the ReFit analysis dashboard entry point', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: '재활 게임 데이터 분석' })).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('HTTP 데모 모드');
  expect(screen.getAllByRole('button', { name: /샘플 분석/ }).length).toBeGreaterThan(0);
});

test('sends a sample session to the configured AI analysis endpoint', async () => {
  const configuredAiUrl = (process.env.REACT_APP_AI_API_URL || 'http://localhost:8000')
    .replace(/\/$/, '');

  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    text: async () => JSON.stringify(ANALYSIS_RESPONSE),
  });

  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: '샘플 분석 실행' }));

  await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
  expect(global.fetch).toHaveBeenCalledWith(
    `${configuredAiUrl}/api/v1/analyze_session`,
    expect.objectContaining({ method: 'POST' }),
  );
  expect(await screen.findByText('안정적으로 수행했습니다.')).toBeInTheDocument();
  expect(screen.getByText('88')).toBeInTheDocument();
});
