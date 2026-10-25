import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ReferenceLayout from './ReferenceLayout';

describe('reference layout panel', () => {
  it('shows the river description panel with a close button by default', () => {
    render(<ReferenceLayout visual={<p>visual</p>}><h2>Choose a river basin</h2></ReferenceLayout>);
    const panel = screen.getByRole('region', { name: 'River and species reference' });
    expect(panel).toBeVisible();
    expect(within(panel).getByText('Choose a river basin')).toBeVisible();
    expect(screen.getByRole('button', { name: /close river reference/i })).toBeInTheDocument();
  });

  it('closes the panel and offers a way to reopen it', () => {
    render(<ReferenceLayout visual={<p>visual</p>}><h2>Choose a river basin</h2></ReferenceLayout>);
    fireEvent.click(screen.getByRole('button', { name: /close river reference/i }));

    const panelAfterClose = screen.queryByRole('region', { name: 'River and species reference' });
    expect(panelAfterClose).toBeNull();

    const reopen = screen.getByRole('button', { name: /open river reference/i });
    expect(reopen).toBeInTheDocument();

    fireEvent.click(reopen);
    expect(screen.getByRole('region', { name: 'River and species reference' })).toBeVisible();
    expect(screen.queryByRole('button', { name: /open river reference/i })).toBeNull();
  });
});
