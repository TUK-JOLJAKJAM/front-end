import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the ReFit analysis dashboard entry point', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: '재활 게임 데이터 분석' })).toBeInTheDocument();
  expect(screen.getAllByRole('button', { name: /샘플 분석/ }).length).toBeGreaterThan(0);
});
