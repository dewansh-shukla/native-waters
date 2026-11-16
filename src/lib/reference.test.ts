import { describe, expect, it } from 'vitest';
import { getRiver, getSpecies, referenceMetadata } from './reference';
import { freshwaterCatalog as catalog } from './catalog';
import { generateStaticParams as basinParams } from '@/app/basins/[slug]/page';
import { generateStaticParams as speciesParams } from '@/app/species/[slug]/page';
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
    expect(m.alternates?.canonical).toBe('https://discovernativewaters.com/basins/cauvery');
    expect(m.openGraph).toMatchObject({ url: 'https://discovernativewaters.com/basins/cauvery', title: 'Cauvery' });
    expect(m.title).toBe('Cauvery');
  });
});
