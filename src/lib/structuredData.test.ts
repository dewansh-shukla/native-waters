import { describe, expect, it } from 'vitest';
import {
  articleSchema,
  bodyOfWaterSchema,
  breadcrumbSchema,
  datasetSchema,
  definedTermSetSchema,
  faqSchema,
  fieldGuideSchema,
  taxonSchema,
  webApplicationSchema,
  websiteSchema,
} from './structuredData';
import { freshwaterCatalog as catalog } from './catalog';
import { SITE_ORIGIN } from './reference';

const river = catalog.rivers.find(r => r.id === 'ganga')!;
const species = catalog.species.find(s => s.id === 'labeo-rohita')!;

describe('structured data', () => {
  it('describes the site as a WebSite entity', () => {
    const schema = websiteSchema();
    expect(schema['@context']).toBe('https://schema.org');
    expect(schema['@type']).toBe('WebSite');
    expect(schema.url).toBe(`${SITE_ORIGIN}/`);
    expect(schema.inLanguage).toBe('en');
    expect(schema.publisher).toMatchObject({ '@type': 'Organization', name: 'Native Waters' });
  });

  it('numbers breadcrumb items from one and links them absolutely', () => {
    const schema = breadcrumbSchema([
      { name: 'Home', path: '/' },
      { name: 'Field guide', path: '/field-guide' },
      { name: 'Ganga', path: '/basins/ganga' },
    ]);
    const items = schema.itemListElement as { position: number; name: string; item: string }[];
    expect(items.map(item => item.position)).toEqual([1, 2, 3]);
    expect(items.map(item => item.name)).toEqual(['Home', 'Field guide', 'Ganga']);
    expect(items[2].item).toBe(`${SITE_ORIGIN}/basins/ganga`);
  });

  it('only emits geo coordinates when a real river point is supplied', () => {
    const withoutPoint = bodyOfWaterSchema(river);
    expect(withoutPoint['@type']).toBe('BodyOfWater');
    expect(withoutPoint.url).toBe(`${SITE_ORIGIN}/basins/${river.id}`);
    expect(withoutPoint.containedInPlace).toMatchObject({ '@type': 'Country', name: 'India' });
    expect(withoutPoint).not.toHaveProperty('geo');

    const withPoint = bodyOfWaterSchema(river, [88.1, 25.4]);
    expect(withPoint.geo).toEqual({ '@type': 'GeoCoordinates', longitude: 88.1, latitude: 25.4 });
  });

  it('carries alternate names but never repeats the scientific name', () => {
    const schema = bodyOfWaterSchema(river);
    expect(schema.alternateName).toEqual(river.aliases);

    const taxon = taxonSchema(species);
    expect(taxon['@type']).toBe('Taxon');
    expect(taxon.scientificName).toBe(species.scientificName);
    expect(taxon.url).toBe(`${SITE_ORIGIN}/species/${species.id}`);
    expect(taxon.alternateName).toEqual(expect.arrayContaining([species.commonName]));
    expect(taxon.alternateName).not.toContain(species.scientificName);
  });

  it('marks the experience as a free, browser-based educational app', () => {
    const schema = webApplicationSchema('Ganga underwater experience', 'An interactive underwater study.', '/experience/ganga');
    expect(schema['@type']).toBe('WebApplication');
    expect(schema.url).toBe(`${SITE_ORIGIN}/experience/ganga`);
    expect(schema.isAccessibleForFree).toBe(true);
    expect(schema.browserRequirements).toBe('Requires WebGL');
    expect(schema.applicationCategory).toBe('EducationalApplication');
  });

  it('mirrors every FAQ entry into Question/Answer nodes', () => {
    const entries = [
      { question: 'Is this a checklist?', answer: 'No, it is a selected reference.' },
      { question: 'Which rivers?', answer: 'Five Indian river systems.' },
    ];
    const schema = faqSchema(entries);
    expect(schema['@type']).toBe('FAQPage');
    const questions = schema.mainEntity as { name: string; acceptedAnswer: { text: string } }[];
    expect(questions).toHaveLength(2);
    expect(questions[0]).toMatchObject({
      '@type': 'Question',
      name: entries[0].question,
      acceptedAnswer: { '@type': 'Answer', text: entries[0].answer },
    });
  });

  it('lists every catalog species in the field guide collection', () => {
    const schema = fieldGuideSchema();
    expect(schema['@type']).toBe('CollectionPage');
    expect(schema.url).toBe(`${SITE_ORIGIN}/field-guide`);
    const list = schema.mainEntity as { numberOfItems: number; itemListElement: { url: string; position: number }[] };
    expect(list.numberOfItems).toBe(catalog.species.length);
    expect(list.itemListElement).toHaveLength(catalog.species.length);
    expect(list.itemListElement.map(item => item.position)).toEqual(catalog.species.map((_, index) => index + 1));
    const urls = list.itemListElement.map(item => item.url);
    for (const record of catalog.species) expect(urls).toContain(`${SITE_ORIGIN}/species/${record.id}`);
  });

  it('serialises cleanly so the payload can be embedded in a script tag', () => {
    const payload = [
      websiteSchema(),
      fieldGuideSchema(),
      faqSchema([{ question: 'Q', answer: 'A' }]),
      breadcrumbSchema([{ name: 'Home', path: '/' }]),
      taxonSchema(species),
    ];
    const json = JSON.stringify(payload);
    expect(json).not.toContain('undefined');
    expect(JSON.parse(json)).toHaveLength(5);
  });

  it('describes the catalog as a Dataset with Indian spatial coverage', () => {
    const schema = datasetSchema();
    expect(schema['@type']).toBe('Dataset');
    expect(typeof schema.license).toBe('string');
    expect(schema.spatialCoverage).toMatchObject({ '@type': 'Place', name: 'India' });
  });

  it('turns a list of terms into the matching number of DefinedTerm nodes', () => {
    const terms = [
      { term: 'Native', definition: 'Originally occurring in the basin.' },
      { term: 'Endemic', definition: 'Restricted to the basin.' },
      { term: 'Introduced', definition: 'Brought in by humans.' },
    ];
    const schema = definedTermSetSchema(terms);
    const nodes = schema.hasDefinedTerm as { '@type': string }[];
    expect(nodes).toHaveLength(terms.length);
    expect(nodes.every(node => node['@type'] === 'DefinedTerm')).toBe(true);
  });

  it('gives an Article a WebPage mainEntityOfPage and a free-access flag', () => {
    const url = `${SITE_ORIGIN}/species/labeo-rohita`;
    const schema = articleSchema({
      title: 'Rohu',
      description: 'A sourced record.',
      url,
      datePublished: '2026-01-01',
      dateModified: '2026-01-02',
    });
    const page = schema.mainEntityOfPage as { '@type': string; '@id': string };
    expect(page['@type']).toBe('WebPage');
    expect(page['@id']).toBe(url);
    expect((schema.author as { '@type': string })['@type']).toBe('Organization');
    expect(schema.isAccessibleForFree).toBe(true);
  });

  it('wires a FishBase sameAs URL onto labeo-rohita', () => {
    const taxon = taxonSchema(species);
    const sameAs = taxon.sameAs as string[];
    expect(sameAs).toContain('https://www.fishbase.se/summary/Labeo-rohita.html');
  });

  it('wires a Wikipedia sameAs URL onto ganga when externalIds declares one', () => {
    const schema = bodyOfWaterSchema(river);
    const sameAs = schema.sameAs as string[];
    expect(sameAs).toContain('https://en.wikipedia.org/wiki/Ganges');
  });
});
