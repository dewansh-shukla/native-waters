import { describe, expect, it } from 'vitest';
import { metadata } from './layout';

describe('root SEO metadata', () => {
  it('includes the Google Search Console verification token', () => {
    expect(metadata.verification).toEqual({
      google: 'xkQ3RE8JHqlyb0L0KlRUiAyzbn3q7in0IY1tdw3icU0',
    });
  });
});
