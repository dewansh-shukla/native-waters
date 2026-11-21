import { describe, expect, it } from 'vitest';
import { basinRoster, basinSummarySentence, siblingSpecies } from './catalogSummary';
import { freshwaterCatalog as catalog } from './catalog';

describe('catalog summary', () => {
  it('counts one record per association and derives periods', () => {
    const roster = basinRoster('cauvery');
    expect(roster.total).toBe(16);
    expect(roster.native).toBe(15);
    expect(roster.endemic).toBe(8);
    expect(roster.uncertain).toBe(1);
    expect(roster.evidencePeriods).toEqual(['2015–2019']);
    expect(roster.species.map(s => s.id)).toContain('tor-remadevii');
  });

  it('counts Krishna basin endemics from the Sangli survey separately', () => {
    const roster = basinRoster('krishna');
    expect(roster.total).toBe(7);
    expect(roster.native).toBe(7);
    expect(roster.endemic).toBe(2);
    expect(roster.uncertain).toBe(0);
    expect(roster.evidencePeriods).toEqual(['June 2009–July 2012', '2013–2017']);
  });

  it.each([
    ['ganga', 4],
    ['brahmaputra', 3],
    ['godavari', 3],
  ])('counts new records in the %s basin', (riverId, total) => {
    expect(basinRoster(riverId).total).toBe(total);
  });

  it('writes a factual sentence from the roster', () => {
    const sentence = basinSummarySentence(catalog.rivers.find(r => r.id === 'cauvery')!, basinRoster('cauvery'));
    expect(sentence).toContain('16 sourced species records');
    expect(sentence).toContain('15 native (8 basin endemic) and 1 with uncertain native status');
    expect(sentence).not.toMatch(/undefined/i);
  });

  it('excludes the viewed species from siblings', () => {
    const siblings = siblingSpecies('cauvery', 'tor-remadevii');
    expect(siblings.map(s => s.id)).not.toContain('tor-remadevii');
    expect(siblings.length).toBe(15);
  });

  it('handles a basin with no records', () => {
    const roster = basinRoster('does-not-exist');
    expect(roster.total).toBe(0);
    expect(basinSummarySentence(catalog.rivers[0], roster)).toContain('no sourced species records');
  });
});
