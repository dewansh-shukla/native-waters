import { describe, expect, it } from 'vitest';
import {
  articleSchema,
  bodyOfWaterSchema,
  breadcrumbSchema,
  datasetSchema,
  definedTermSetSchema,
  faqSchema,
  fieldGuideSchema,
  organizationSchema,
  taxonSchema,
  webApplicationSchema,
  websiteSchema,
} from './structuredData';
import { freshwaterCatalog as catalog } from './catalog';
import { CONTENT_UPDATED_AT, SITE_ORIGIN } from './reference';

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
    expect(withoutPoint.name).toBe('Ganga river');
    expect(withoutPoint.mainEntityOfPage).toBe(`${SITE_ORIGIN}/basins/ganga`);
    expect(withoutPoint).not.toHaveProperty('containedInPlace');
    expect(withoutPoint).not.toHaveProperty('geo');

    const withPoint = bodyOfWaterSchema(river, [88.1, 25.4]);
    expect(withPoint.geo).toEqual({ '@type': 'GeoCoordinates', longitude: 88.1, latitude: 25.4 });
  });

  it('carries alternate names but never repeats the scientific name', () => {
    const schema = bodyOfWaterSchema(river);
    expect(schema.alternateName).toEqual(river.aliases);

    const taxon = taxonSchema(species);
    expect(taxon['@type']).toBe('Taxon');
    expect(taxon.name).toBe('Labeo rohita');
    expect(taxon).not.toHaveProperty('scientificName');
    expect(taxon).not.toHaveProperty('isPartOf');
    expect(taxon.mainEntityOfPage).toBe(`${SITE_ORIGIN}/species/labeo-rohita`);
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
    expect(schema.url).toBe(`${SITE_ORIGIN}/field-guide`);
    expect(schema).not.toHaveProperty('license');
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

  it('does not invent publication dates when only a review date is known', () => {
    const schema = articleSchema({
      title: 'Rohu',
      description: 'A sourced record.',
      url: `${SITE_ORIGIN}/species/labeo-rohita`,
      dateModified: '2026-11-16',
    });
    expect(JSON.parse(JSON.stringify(schema))).not.toHaveProperty('datePublished');
    expect(schema.dateModified).toBe('2026-11-16');
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

  it('describes the publisher as a first-class Organization with a 512px PNG logo', () => {
    const schema = organizationSchema();
    expect(schema['@type']).toBe('Organization');
    expect(schema.name).toBe('Native Waters');
    expect(schema.url).toBe(`${SITE_ORIGIN}/`);
    const logo = schema.logo as { url: string; width: number; height: number };
    expect(logo.url.endsWith('/logo-512.png')).toBe(true);
    expect(logo.width).toBe(512);
    expect(logo.height).toBe(512);
  });

  it('publishes the same Organization @id from the site node and the publisher reference', () => {
    const publisher = websiteSchema().publisher as { '@id': string };
    expect(organizationSchema()['@id']).toBe(publisher['@id']);
    expect(organizationSchema()['@id']).toBe(`${SITE_ORIGIN}/#organization`);
    expect(publisher['@id']).toBe(`${SITE_ORIGIN}/#organization`);
  });

  it('dates the Dataset from the shared content review date', () => {
    const schema = datasetSchema();
    expect(schema.dateModified).toBe(CONTENT_UPDATED_AT.toISOString());
  });

  it('exposes verified Wikidata and FishBase identifiers on the taxon', () => {
    const identifiers = taxonSchema(species).identifier as { '@type': string; propertyID: string; value: string }[];
    expect(identifiers).toEqual(
      expect.arrayContaining([
        { '@type': 'PropertyValue', propertyID: 'Wikidata', value: 'Q311727' },
      ]),
    );
  });
});
