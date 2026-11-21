import { describe, expect, it } from 'vitest';
import { freshwaterCatalog, validateCatalog, type Catalog } from './catalog';
const copy = (): Catalog => structuredClone(freshwaterCatalog);

describe('freshwater catalog evidence', () => {
  it('publishes five rivers and thirty-three species separately from illustrative fixtures', () => {
    expect(freshwaterCatalog.rivers).toHaveLength(5);
    expect(freshwaterCatalog.species).toHaveLength(33);
    expect(freshwaterCatalog.species.some(s => s.id.includes('parrot'))).toBe(false);
  });
  it('includes eight newly surveyed Cauvery taxa with cited basin associations', () => {
    const expectedIds = [
      'silonia-childreni',
      'hyporhamphus-xanthopterus',
      'wallago-attu',
      'opsarius-gatensis',
      'channa-pseudomarulius',
      'labeo-dyocheilus',
      'macrognathus-malabaricus',
      'oryzias-carnaticus',
    ];
    const additions = freshwaterCatalog.species.filter(s => expectedIds.includes(s.id));
    expect(additions.map(s => s.id).sort()).toEqual([...expectedIds].sort());
    for (const species of additions) {
      const association = species.associations.find(entry => entry.riverId === 'cauvery');
      expect(association).toEqual(expect.objectContaining({
        riverId: 'cauvery',
        status: species.id === 'oryzias-carnaticus' ? 'uncertain' : 'native',
        basinEndemic: false,
        sourceIds: ['cauvery-survey'],
      }));
    }
  });
  it('includes six Sangli survey taxa and keeps Western Ghats endemism distinct from basin endemism', () => {
    const expected = {
      'botia-striata': true,
      'schismatorhynchos-nukta': false,
      'hypselobarbus-mussullah': false,
      'labeo-potail': false,
      'parapsilorhynchus-discophorus': false,
      'garra-bicornuta': true,
    };
    const additions = freshwaterCatalog.species.filter(s => Object.hasOwn(expected, s.id));
    expect(additions.map(s => s.id).sort()).toEqual(Object.keys(expected).sort());
    for (const species of additions) {
      expect(species.associations).toContainEqual(expect.objectContaining({
        riverId: 'krishna',
        status: 'native',
        basinEndemic: expected[species.id as keyof typeof expected],
        sourceIds: ['krishna-fish-survey'],
      }));
    }
    expect(freshwaterCatalog.species.find(s => s.id === 'schismatorhynchos-nukta')?.aliases).toContain('Bangana nukta');
  });
  it('includes the six planned Ganga, Brahmaputra and Godavari records with basin-specific evidence', () => {
    const expected = {
      'tor-putitora': { riverId: 'ganga', status: 'native', sourceIds: ['ganga-fish-review'] },
      'clupisoma-garua': { riverId: 'ganga', status: 'native', sourceIds: ['ganga-fish-review'] },
      'garra-arupi': { riverId: 'brahmaputra', status: 'native', sourceIds: ['brahmaputra-fish-survey', 'fishbase-garra-arupi'] },
      'mastacembelus-armatus': { riverId: 'brahmaputra', status: 'native', sourceIds: ['brahmaputra-fish-survey', 'fishbase-mastacembelus-armatus'] },
      'rita-bakalu': { riverId: 'godavari', status: 'native', sourceIds: ['godavari-rita-description'] },
      'corica-soborna': { riverId: 'godavari', status: 'uncertain', sourceIds: ['godavari-corica-record'] },
    } as const;
    const additions = freshwaterCatalog.species.filter(s => Object.hasOwn(expected, s.id));
    expect(additions.map(s => s.id).sort()).toEqual(Object.keys(expected).sort());
    for (const species of additions) {
      expect(species.associations).toContainEqual(expect.objectContaining({
        riverId: expected[species.id as keyof typeof expected].riverId,
        status: expected[species.id as keyof typeof expected].status,
        basinEndemic: false,
        sourceIds: expected[species.id as keyof typeof expected].sourceIds,
      }));
      if (expected[species.id as keyof typeof expected].riverId === 'brahmaputra') {
        const association = species.associations.find(entry => entry.riverId === 'brahmaputra')!;
        expect(association.locality).toContain('species-level stream not specified');
      }
    }
  });
  it('updates basin summaries and scope for the newly cited reaches', () => {
    const ganga = freshwaterCatalog.rivers.find(r => r.id === 'ganga')!;
    const brahmaputra = freshwaterCatalog.rivers.find(r => r.id === 'brahmaputra')!;
    const krishna = freshwaterCatalog.rivers.find(r => r.id === 'krishna')!;
    const godavari = freshwaterCatalog.rivers.find(r => r.id === 'godavari')!;
    expect(ganga.summary).toContain('upper, middle and lower Ganga zones');
    expect(ganga.scope).toContain('literature review');
    expect(ganga.sourceIds).toContain('ganga-fish-review');
    expect(brahmaputra.scope).toContain('Siang and Dibang');
    expect(brahmaputra.scope).toContain('five sampled localities');
    expect(brahmaputra.sourceIds).toContain('brahmaputra-fish-survey');
    expect(krishna.scope).toContain('2013–2017');
    expect(krishna.sourceIds).toContain('krishna-fish-survey');
    expect(godavari.summary).toContain('Pranahita');
    expect(godavari.scope).toContain('Talai Village');
    expect(godavari.sourceIds).toEqual(expect.arrayContaining(['godavari-rita-description', 'godavari-corica-record']));
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
    ['missing species facts', (c: Catalog) => { delete (c.species[0] as { facts?: unknown }).facts; }],
    ['unknown facts citation', (c: Catalog) => { c.species[0].facts.sourceId = 'missing'; }],
    ['invalid maximum length', (c: Catalog) => { c.species[0].facts.maxLengthCm = 0; }],
    ['invalid length type', (c: Catalog) => { (c.species[0].facts as { lengthType: string }).lengthType = 'XX'; }],
    ['invalid conservation code', (c: Catalog) => { (c.species[0].facts.conservation as { code: string }).code = 'XX'; }],
    ['assessed code without a date', (c: Catalog) => { c.species[0].facts.conservation.assessed = null; }],
    ['unassessed code with a date', (c: Catalog) => { c.species[9].facts.conservation.assessed = '2010-03-26'; }],
    ['impossible assessment date', (c: Catalog) => { c.species[0].facts.conservation.assessed = '2010-13-40'; }],
  ] as const)('rejects %s', (_, mutate) => {
    const catalog = copy(); mutate(catalog);
    expect(() => validateCatalog(catalog)).toThrow();
  });
});
