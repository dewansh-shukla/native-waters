import { freshwaterCatalog as catalog } from './catalog';
import type { IucnCode, Species } from './catalog';

/**
 * Conservation helpers. Every value here is derived from the catalog facts that
 * were transcribed from FishBase's mirror of the IUCN Red List (version 2025-2).
 * Nothing in this file estimates a status.
 */

/** Red List categories ordered from most to least severe. */
export const IUCN_ORDER: readonly IucnCode[] = ['EX', 'EW', 'CR', 'EN', 'VU', 'NT', 'DD', 'LC', 'NE'];

/** IUCN "threatened" categories. Vulnerable is threatened, Near Threatened is not. */
export const THREATENED_CODES: readonly IucnCode[] = ['CR', 'EN', 'VU'];

export const IUCN_LABELS: Record<IucnCode, string> = {
  EX: 'Extinct',
  EW: 'Extinct in the Wild',
  CR: 'Critically Endangered',
  EN: 'Endangered',
  VU: 'Vulnerable',
  NT: 'Near Threatened',
  LC: 'Least Concern',
  DD: 'Data Deficient',
  NE: 'Not Evaluated',
};

export const IUCN_DEFINITIONS: readonly { code: IucnCode; definition: string }[] = [
  { code: 'CR', definition: 'Faces an extremely high risk of extinction in the wild.' },
  { code: 'EN', definition: 'Faces a very high risk of extinction in the wild.' },
  { code: 'VU', definition: 'Faces a high risk of extinction in the wild.' },
  { code: 'NT', definition: 'Close to qualifying for a threatened category.' },
  { code: 'LC', definition: 'Does not currently qualify as threatened.' },
  { code: 'DD', definition: 'Too little information to assess extinction risk.' },
  { code: 'NE', definition: 'Has not been assessed against the Red List criteria.' },
];

const rank = (species: Species) => IUCN_ORDER.indexOf(species.facts.conservation.code);

export function isThreatened(species: Species): boolean {
  return THREATENED_CODES.includes(species.facts.conservation.code);
}

/** Species in threatened categories, most severe first, then by common name. */
export function threatenedSpecies(): Species[] {
  return catalog.species
    .filter(isThreatened)
    .sort((a, b) => rank(a) - rank(b) || a.commonName.localeCompare(b.commonName));
}

export function speciesByStatus(code: IucnCode): Species[] {
  return catalog.species
    .filter(species => species.facts.conservation.code === code)
    .sort((a, b) => a.commonName.localeCompare(b.commonName));
}

export type ConservationSummary = {
  total: number;
  criticallyEndangered: number;
  endangered: number;
  vulnerable: number;
  threatened: number;
  nearThreatened: number;
  leastConcern: number;
  dataDeficient: number;
  notEvaluated: number;
};

export function conservationSummary(): ConservationSummary {
  const count = (code: IucnCode) => speciesByStatus(code).length;
  const criticallyEndangered = count('CR');
  const endangered = count('EN');
  const vulnerable = count('VU');
  return {
    total: catalog.species.length,
    criticallyEndangered,
    endangered,
    vulnerable,
    threatened: criticallyEndangered + endangered + vulnerable,
    nearThreatened: count('NT'),
    leastConcern: count('LC'),
    dataDeficient: count('DD'),
    notEvaluated: count('NE'),
  };
}

/** The basin a species is catalogued against, for compact tables. */
export function primaryBasin(species: Species): string {
  const riverId = species.associations[0]?.riverId;
  return catalog.rivers.find(river => river.id === riverId)?.name ?? 'India';
}

export function formatAssessed(assessed: string | null): string {
  if (!assessed) return 'Not assessed';
  return new Date(`${assessed}T00:00:00.000Z`).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  });
}

/** "200 cm total length" — the abbreviation is spelled out for readers. */
export function formatLength(species: Species): string {
  const { maxLengthCm, lengthType } = species.facts;
  const name = lengthType === 'TL' ? 'total length' : lengthType === 'FL' ? 'fork length' : 'standard length';
  return `${maxLengthCm} cm ${name}`;
}

/** One sentence stating the Red List category and, when assessed, its date. */
export function conservationSentence(species: Species): string {
  const { code, label, assessed } = species.facts.conservation;
  if (code === 'NE') return `${species.commonName} has not been assessed on the IUCN Red List.`;
  return `${species.commonName} is listed as ${label} on the IUCN Red List (assessed ${formatAssessed(assessed)}).`;
}

/** One sentence stating the maximum recorded size. */
export function sizeSentence(species: Species): string {
  const weight = species.facts.maxWeightKg;
  const base = `FishBase records a maximum length of ${formatLength(species)}`;
  return weight === null ? `${base}.` : `${base} and a maximum published weight of ${weight} kg.`;
}
