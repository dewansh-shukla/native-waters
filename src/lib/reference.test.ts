import { describe, expect, it } from 'vitest';
import { getRiver, getSpecies, referenceMetadata, SITE_ORIGIN } from './reference';
import { freshwaterCatalog as catalog } from './catalog';
import { generateStaticParams as basinParams } from '@/app/basins/[slug]/page';
import { generateStaticParams as speciesParams } from '@/app/species/[slug]/page';
import sitemap from '@/app/sitemap';
import robots from '@/app/robots';
describe('reference routing', () => {
  it('generates every published slug and rejects missing records', () => {
    expect(basinParams()).toEqual(catalog.rivers.map(r => ({ slug: r.id })));
    expect(speciesParams()).toEqual(catalog.species.map(s => ({ slug: s.id })));
    expect(getRiver('cauvery').name).toBe('Cauvery');
    expect(getSpecies('labeo-rohita').scientificName).toBe('Labeo rohita');
    expect(() => getRiver('unknown')).toThrow();
    expect(() => getSpecies('unknown')).toThrow();
  });
  it('uses the production origin and bare titles', () => {
    const m = referenceMetadata('Cauvery', 'Basin reference', '/basins/cauvery');
    expect(m.alternates?.canonical).toBe('https://www.discovernativewaters.com/basins/cauvery');
    expect(m.openGraph).toMatchObject({ url: 'https://www.discovernativewaters.com/basins/cauvery', title: 'Cauvery' });
    expect(m.title).toBe('Cauvery');
  });
  it('publishes only canonical routes and every catalog record in the sitemap', () => {
    const urls = sitemap().map(entry => entry.url);
    expect(new Set(urls).size).toBe(urls.length);
    expect(urls).toHaveLength(23);
    expect(urls.some(url => url.includes('/experience'))).toBe(false);
    expect(urls.filter(url => url.includes('/basins/'))).toHaveLength(5);
    expect(urls.filter(url => url.includes('/species/'))).toHaveLength(13);
    for (const river of catalog.rivers) expect(urls).toContain(`https://www.discovernativewaters.com/basins/${river.id}`);
    for (const species of catalog.species) expect(urls).toContain(`https://www.discovernativewaters.com/species/${species.id}`);
    expect(urls).toContain(SITE_ORIGIN);
    expect(urls.every(url => (url === SITE_ORIGIN || url.startsWith(`${SITE_ORIGIN}/`)) && !url.includes('#') && !url.includes('?'))).toBe(true);
    for (const entry of sitemap()) {
      expect(entry).not.toHaveProperty('priority');
      expect(entry).not.toHaveProperty('changeFrequency');
    }
    expect(robots().sitemap).toBe('https://www.discovernativewaters.com/sitemap.xml');
  });
  it('passes per-page robots directives through and leaves the default clear', () => {
    const gated = referenceMetadata('Illustrative underwater experience', 'A Cauvery map.', '/experience', { robots: { index: false, follow: true } });
    expect(gated.robots).toEqual({ index: false, follow: true });
    expect(referenceMetadata('Cauvery', 'Basin reference', '/basins/cauvery').robots).toBeUndefined();
  });
  it('marks all four experience pages noindex, follow', async () => {
    const pages = await Promise.all([
      import('@/app/experience/page'),
      import('@/app/experience/ganga/page'),
      import('@/app/experience/godavari/page'),
      import('@/app/experience/brahmaputra/page'),
    ]);
    expect(pages).toHaveLength(4);
    for (const page of pages) expect(page.metadata.robots).toEqual({ index: false, follow: true });
  });
});
