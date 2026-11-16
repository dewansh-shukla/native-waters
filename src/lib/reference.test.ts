import { describe, expect, it } from 'vitest';
import { getRiver, getSpecies, referenceMetadata } from './reference';
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
    expect(urls).toHaveLength(26);
    expect(urls.filter(url => url.includes('/basins/'))).toHaveLength(5);
    expect(urls.filter(url => url.includes('/species/'))).toHaveLength(13);
    for (const river of catalog.rivers) expect(urls).toContain(`https://www.discovernativewaters.com/basins/${river.id}`);
    for (const species of catalog.species) expect(urls).toContain(`https://www.discovernativewaters.com/species/${species.id}`);
    expect(urls.every(url => url.startsWith('https://www.discovernativewaters.com/') && !url.includes('#') && !url.includes('?'))).toBe(true);
    expect(robots().sitemap).toBe('https://www.discovernativewaters.com/sitemap.xml');
  });
});
