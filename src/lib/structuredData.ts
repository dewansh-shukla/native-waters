import { freshwaterCatalog } from './catalog';
import type { River, Species } from './catalog';
import { SITE_NAME, SITE_ORIGIN } from './reference';
import { RIVER_EXTERNAL_IDS, SPECIES_EXTERNAL_IDS } from './externalIds';

type Schema = Record<string, unknown>;
export type Crumb = { name: string; path: string };
export type LonLat = readonly [longitude: number, latitude: number];

const absolute = (path: string) => `${SITE_ORIGIN}${path}`;
const publisher = {
  '@type': 'Organization',
  name: SITE_NAME,
  url: `${SITE_ORIGIN}/`,
  logo: { '@type': 'ImageObject', url: absolute('/icon.svg') },
  sameAs: 'https://github.com/dewansh-shukla/native-waters',
};

/** Site-level entity, emitted once from the root layout. */
export function websiteSchema(): Schema {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    alternateName: 'Native Waters — Indian river fish reference',
    url: `${SITE_ORIGIN}/`,
    inLanguage: 'en',
    description: 'Sourced reference records for native freshwater fishes of five Indian river systems, with an illustrative underwater experience.',
    publisher,
  };
}

export function breadcrumbSchema(items: Crumb[]): Schema {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absolute(item.path),
    })),
  };
}

/**
 * The river described by a basin page. `point` is a vertex of its mapped line; we
 * emit `geo` only when the caller supplies a real coordinate.
 */
export function bodyOfWaterSchema(river: River, point?: LonLat): Schema {
  const schema: Schema = {
    '@context': 'https://schema.org',
    '@type': 'BodyOfWater',
    name: `${river.name} river`,
    description: river.summary,
    url: absolute(`/basins/${river.id}`),
    mainEntityOfPage: absolute(`/basins/${river.id}`),
  };
  if (river.aliases.length > 0) schema.alternateName = river.aliases;
  if (point) schema.geo = { '@type': 'GeoCoordinates', longitude: point[0], latitude: point[1] };
  const ids = RIVER_EXTERNAL_IDS[river.id];
  const sameAs: string[] = [];
  if (ids) {
    if (ids.wikipedia) sameAs.push(ids.wikipedia);
    if (ids.wikidata) sameAs.push(`https://www.wikidata.org/wiki/${ids.wikidata}`);
  }
  if (sameAs.length > 0) schema.sameAs = sameAs;
  return schema;
}

export function taxonSchema(species: Species): Schema {
  const alternateNames = [species.commonName, ...species.aliases].filter(name => name !== species.scientificName);
  const schema: Schema = {
    '@context': 'https://schema.org',
    '@type': 'Taxon',
    name: species.scientificName,
    alternateName: alternateNames,
    description: species.summary,
    url: absolute(`/species/${species.id}`),
    mainEntityOfPage: absolute(`/species/${species.id}`),
  };
  const ids = SPECIES_EXTERNAL_IDS[species.id];
  const sameAs: string[] = [];
  if (ids) {
    if (ids.fishbase) sameAs.push(ids.fishbase);
    if (ids.wikipedia) sameAs.push(ids.wikipedia);
    if (ids.wikidata) sameAs.push(`https://www.wikidata.org/wiki/${ids.wikidata}`);
  }
  if (sameAs.length > 0) schema.sameAs = sameAs;
  return schema;
}

export function webApplicationSchema(title: string, description: string, path: string): Schema {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: title,
    description,
    url: absolute(path),
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any',
    browserRequirements: 'Requires WebGL',
    isAccessibleForFree: true,
    inLanguage: 'en',
    publisher,
  };
}

export function faqSchema(entries: { question: string; answer: string }[]): Schema {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: entries.map(entry => ({
      '@type': 'Question',
      name: entry.question,
      acceptedAnswer: { '@type': 'Answer', text: entry.answer },
    })),
  };
}

/** A dataset describing the site's sourced reference records. */
export function datasetSchema(): Schema {
  return {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'Native Waters freshwater fish reference dataset',
    description: 'Sourced reference records for native freshwater fishes of five Indian river systems, with basin-specific native status.',
    url: absolute('/field-guide'),
    creator: publisher,
    inLanguage: 'en',
    spatialCoverage: { '@type': 'Place', name: 'India' },
  };
}

export function definedTermSchema(term: string, definition: string): Schema {
  return {
    '@context': 'https://schema.org',
    '@type': 'DefinedTerm',
    name: term,
    description: definition,
  };
}

export function definedTermSetSchema(terms: { term: string; definition: string }[]): Schema {
  return {
    '@context': 'https://schema.org',
    '@type': 'DefinedTermSet',
    hasDefinedTerm: terms.map(item => ({
      '@type': 'DefinedTerm',
      name: item.term,
      description: item.definition,
    })),
  };
}

export function articleSchema(input: {
  title: string;
  description: string;
  url: string;
  datePublished?: string | Date;
  dateModified?: string | Date;
  author?: Schema;
}): Schema {
  const author = input.author ?? publisher;
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: input.title,
    name: input.title,
    description: input.description,
    url: input.url,
    datePublished: input.datePublished,
    dateModified: input.dateModified,
    mainEntityOfPage: { '@type': 'WebPage', '@id': input.url },
    author,
    isAccessibleForFree: true,
    publisher,
  };
}

export function webPageSchema(input: {
  title: string;
  description: string;
  url: string;
  datePublished?: string | Date;
  dateModified?: string | Date;
}): Schema {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: input.title,
    description: input.description,
    url: input.url,
    datePublished: input.datePublished,
    dateModified: input.dateModified,
  };
}

/** The field guide as a collection of species records, in catalog order. */
export function fieldGuideSchema(): Schema {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Indian river fish field guide',
    description: 'Sourced freshwater fish records from the Ganga, Brahmaputra, Cauvery, Krishna and Godavari, with basin-specific native status.',
    url: absolute('/field-guide'),
    inLanguage: 'en',
    isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: `${SITE_ORIGIN}/` },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: freshwaterCatalog.species.length,
      itemListElement: freshwaterCatalog.species.map((species, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: species.commonName,
        url: absolute(`/species/${species.id}`),
      })),
    },
  };
}
