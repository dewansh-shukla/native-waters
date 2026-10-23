import { describe, expect, it } from 'vitest';
import { freshwaterCatalog, validateCatalog, type Catalog } from './catalog';
const copy = (): Catalog => structuredClone(freshwaterCatalog);

describe('freshwater catalog evidence', () => {
  it('publishes five rivers and thirteen species separately from illustrative fixtures', () => {
    expect(freshwaterCatalog.rivers).toHaveLength(5);
    expect(freshwaterCatalog.species).toHaveLength(13);
    expect(freshwaterCatalog.species.some(s => s.id.includes('parrot'))).toBe(false);
  });
  it('does not treat Indian-native as native to every basin', () => {
    const rohu = freshwaterCatalog.species.find(s => s.id === 'labeo-rohita')!;
    expect(rohu.associations.map(a => a.riverId)).toEqual(['ganga']);
    const badis = freshwaterCatalog.species.find(s => s.id === 'badis-badis')!;
    expect(badis.associations[0].status).toBe('uncertain');
    expect(badis.associations[0].basinEndemic).toBe(false);
  });
  it('preserves alternate river and common names without duplicate taxa', () => {
    expect(freshwaterCatalog.rivers.find(r => r.id === 'cauvery')?.aliases).toContain('Kaveri');
    expect(freshwaterCatalog.rivers.find(r => r.id === 'ganga')?.aliases).toContain('Ganges');
    expect(freshwaterCatalog.species.find(s => s.id === 'badis-badis')?.aliases).toContain('Chameleon fish');
  });
  it.each([
    ['duplicate IDs', (c: Catalog) => { c.rivers.push(c.rivers[0]); }],
    ['missing rivers', (c: Catalog) => { c.species[0].associations[0].riverId = 'imaginary'; }],
    ['duplicate associations', (c: Catalog) => { c.species[0].associations.push(c.species[0].associations[0]); }],
    ['unknown citations', (c: Catalog) => { c.species[0].associations[0].sourceIds = ['missing']; }],
    ['empty citations', (c: Catalog) => { c.rivers[0].sourceIds = []; }],
    ['insecure citations', (c: Catalog) => { c.sources[0].url = 'http://example.org'; }],
    ['ambiguous aliases', (c: Catalog) => { c.rivers[1].aliases.push('Ganges'); }],
    ['duplicate taxon aliases', (c: Catalog) => { c.species[1].aliases.push(c.species[0].scientificName); }],
    ['unsupported endemism', (c: Catalog) => { c.species[7].associations[0].basinEndemic = true; }],
    ['missing context', (c: Catalog) => { c.species[0].associations[0].locality = ''; }],
  ] as const)('rejects %s', (_, mutate) => {
    const catalog = copy(); mutate(catalog);
    expect(() => validateCatalog(catalog)).toThrow();
  });
});
