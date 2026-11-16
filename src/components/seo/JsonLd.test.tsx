import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { JsonLd } from './JsonLd';

function readPayload(container: HTMLElement) {
  const script = container.querySelector('script[type="application/ld+json"]');
  expect(script).not.toBeNull();
  return script!.innerHTML;
}

describe('JsonLd', () => {
  it('renders a machine-readable script tag', () => {
    const { container } = render(<JsonLd data={{ '@type': 'WebSite', name: 'Native Waters' }} />);
    const payload = JSON.parse(readPayload(container));
    expect(payload).toEqual({ '@type': 'WebSite', name: 'Native Waters' });
  });

  it('escapes markup so catalog text cannot close the script element', () => {
    const hostile = 'Fish </script><img src=x onerror=alert(1)>';
    const { container } = render(<JsonLd data={{ description: hostile }} />);
    const raw = readPayload(container);
    expect(raw).not.toContain('</script');
    expect(JSON.parse(raw).description).toBe(hostile);
  });
});
