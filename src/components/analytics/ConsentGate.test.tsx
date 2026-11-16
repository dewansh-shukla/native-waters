import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@next/third-parties/google', () => ({
  GoogleAnalytics: () => <div data-testid="ga" />,
}));

import { ConsentGate } from './ConsentGate';

describe('ConsentGate', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows the banner and no analytics when no choice is stored', () => {
    render(<ConsentGate gaId="G-TEST" />);
    expect(screen.getByRole('region', { name: /analytics consent/i })).toBeInTheDocument();
    expect(screen.queryByTestId('ga')).toBeNull();
  });

  it('loads analytics and no banner when consent was previously granted', async () => {
    window.localStorage.setItem('nw-analytics-consent', 'granted');
    render(<ConsentGate gaId="G-TEST" />);
    expect(await screen.findByTestId('ga')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /analytics consent/i })).toBeNull();
  });

  it('declines: removes the banner, loads no analytics, persists the choice', async () => {
    render(<ConsentGate gaId="G-TEST" />);
    fireEvent.click(screen.getByRole('button', { name: /decline/i }));
    await waitFor(() => expect(screen.queryByRole('region', { name: /analytics consent/i })).toBeNull());
    expect(screen.queryByTestId('ga')).toBeNull();
    expect(window.localStorage.getItem('nw-analytics-consent')).toBe('declined');
  });

  it('accepts: loads analytics and persists the choice', async () => {
    render(<ConsentGate gaId="G-TEST" />);
    fireEvent.click(screen.getByRole('button', { name: /accept analytics/i }));
    expect(await screen.findByTestId('ga')).toBeInTheDocument();
    expect(window.localStorage.getItem('nw-analytics-consent')).toBe('granted');
  });
});
