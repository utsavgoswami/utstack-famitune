import { render } from '@testing-library/react';

import App from './app';

describe('App', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<App />);
    expect(baseElement).toBeTruthy();
  });

  it('should define all 5 glossary terms', () => {
    const { getByText } = render(<App />);
    for (const term of [
      'Stream',
      'Monophonic stream',
      'Parallel streams',
      'Channel',
      'Melodic channel',
    ]) {
      expect(getByText(term)).toBeTruthy();
    }
  });

  it('should define all 5 sheet-music terms', () => {
    const { getByText } = render(<App />);
    for (const term of [
      'Note',
      'Measure (bar)',
      'Staff (stave)',
      'Voice',
      'Part',
    ]) {
      expect(getByText(term)).toBeTruthy();
    }
  });
});
