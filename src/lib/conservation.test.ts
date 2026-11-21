import { describe, expect, it } from 'vitest';
import { freshwaterCatalog as catalog } from './catalog';
import {
  conservationSentence, conservationSummary, formatAssessed, formatLength, isThreatened,
  IUCN_LABELS, IUCN_ORDER, primaryBasin, sizeSentence, speciesByStatus, threatenedSpecies,
} from './conservation';

describe('conservation facts', () => {
  it('gives every catalog species a cited FishBase record', () => {
    for (const species of catalog.species) {
      const source = catalog.sources.find(entry => entry.id === species.facts.sourceId);
      expect(source, species.id).toBeDefined();
      expect(source!.id).toBe(`fishbase-${species.id}`);
      expect(source!.url).toBe(`https://www.fishbase.se/summary/${species.scientificName.replace(' ', '-')}.html`);
      expect(source!.url.startsWith('https://')).toBe(true);
    }
  });

  it('keeps every Red List code consistent with its label and assessment date', () => {
    for (const species of catalog.species) {
      const { code, label, assessed } = species.facts.conservation;
      expect(IUCN_LABELS[code], species.id).toBe(label);
      expect(IUCN_ORDER).toContain(code);
      if (code === 'NE') expect(assessed, species.id).toBeNull();
      else expect(assessed, species.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('records positive, typed maximum lengths', () => {
    for (const species of catalog.species) {
      expect(species.facts.maxLengthCm, species.id).toBeGreaterThan(0);
      expect(['TL', 'FL', 'SL'], species.id).toContain(species.facts.lengthType);
      expect(species.facts.distribution.trim().length, species.id).toBeGreaterThan(0);
    }
  });

  it('marks exactly the catalogued species as Critically Endangered', () => {
    expect(speciesByStatus('CR').map(species => species.id)).toEqual(['hemibagrus-punctatus', 'tor-remadevii']);
  });

  it('summarises the catalog without drift', () => {
    const summary = conservationSummary();
    expect(summary.total).toBe(catalog.species.length);
    expect(summary.threatened).toBe(summary.criticallyEndangered + summary.endangered + summary.vulnerable);
    expect(summary.threatened + summary.nearThreatened + summary.leastConcern + summary.dataDeficient + summary.notEvaluated).toBe(summary.total);
    expect(summary.criticallyEndangered).toBe(2);
    expect(summary.endangered).toBe(5);
    expect(summary.vulnerable).toBe(2);
    expect(summary.notEvaluated).toBe(3);
    expect(summary.threatened).toBe(9);
  });

  it('orders threatened species by severity, then name', () => {
    const threatened = threatenedSpecies();
    expect(threatened.every(isThreatened)).toBe(true);
    expect(threatened.map(species => species.facts.conservation.code)).toEqual([
      'CR', 'CR', 'EN', 'EN', 'EN', 'EN', 'EN', 'VU', 'VU',
    ]);
  });

  it('labels Not Evaluated as unassessed rather than safe', () => {
    const unassessed = speciesByStatus('NE');
    expect(unassessed.map(species => species.id)).toEqual([
      'dawkinsia-rubrotinctus', 'macrognathus-malabaricus', 'channa-pseudomarulius',
    ]);
    expect(conservationSentence(unassessed[0])).toContain('has not been assessed');
    expect(formatAssessed(unassessed[0].facts.conservation.assessed)).toBe('Not assessed');
  });

  it('spells out length types and sizes', () => {
    const rohu = catalog.species.find(species => species.id === 'labeo-rohita')!;
    expect(formatLength(rohu)).toBe('200 cm total length');
    expect(sizeSentence(rohu)).toContain('45 kg');
    const mahseer = catalog.species.find(species => species.id === 'tor-remadevii')!;
    expect(formatLength(mahseer)).toBe('175 cm fork length');
  });

  it('formats assessment dates and names the recorded basin', () => {
    expect(formatAssessed('2018-04-19')).toBe('19 April 2018');
    const mahseer = catalog.species.find(species => species.id === 'tor-remadevii')!;
    expect(primaryBasin(mahseer)).toBe('Cauvery');
    expect(conservationSentence(mahseer)).toContain('Critically Endangered');
  });
});
