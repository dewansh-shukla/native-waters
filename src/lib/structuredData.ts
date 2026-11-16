import { freshwaterCatalog } from './catalog';
import type { River, Species } from './catalog';
import { SITE_NAME, SITE_ORIGIN } from './reference';

type Schema = Record<string, unknown>;
export type Crumb = { name: string; path: string };
export type LonLat = readonly [longitude: number, latitude: number];

const absolute = (path: string) => `${SITE_ORIGIN}${path}`;
const publisher = {
  '@type': 'Organization',
  name: SITE_NAME,
  url: `${SITE_ORIGIN}/`,
  logo: { '@type': 'ImageObject', url: absolute('/icon.svg') },
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
 * A river basin. `point` is an existing vertex of the mapped river line; we only
 * emit `geo` when the caller supplies a real coordinate, never an estimated one.
 */
export function bodyOfWaterSchema(river: River, point?: LonLat): Schema {
  const schema: Schema = {
    '@context': 'https://schema.org',
    '@type': 'BodyOfWater',
    name: `${river.name} river basin`,
    description: river.summary,
    url: absolute(`/basins/${river.id}`),
    containedInPlace: { '@type': 'Country', name: 'India' },
  };
  if (river.aliases.length > 0) schema.alternateName = river.aliases;
  if (point) schema.geo = { '@type': 'GeoCoordinates', longitude: point[0], latitude: point[1] };
  return schema;
}

export function taxonSchema(species: Species): Schema {
  const alternateNames = [species.commonName, ...species.aliases].filter(name => name !== species.scientificName);
  return {
    '@context': 'https://schema.org',
    '@type': 'Taxon',
    name: species.commonName,
    scientificName: species.scientificName,
    alternateName: alternateNames,
    description: species.summary,
    url: absolute(`/species/${species.id}`),
    isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: `${SITE_ORIGIN}/` },
  };
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
