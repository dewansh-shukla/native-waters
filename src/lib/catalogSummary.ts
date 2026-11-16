import { freshwaterCatalog as catalog } from './catalog';
import type { River, Species } from './catalog';

/**
 * Facts about one basin's species records, derived only from the cited catalog.
 * Nothing here is inferred: counts and periods come straight from associations.
 */
export type BasinRoster = {
  species: Species[];
  total: number;
  native: number;
  introduced: number;
  uncertain: number;
  endemic: number;
  evidencePeriods: string[];
};

function associationFor(species: Species, riverId: string) {
  return species.associations.find(association => association.riverId === riverId);
}

export function basinRoster(riverId: string): BasinRoster {
  const species = catalog.species.filter(species => associationFor(species, riverId));
  const associations = species.map(species => associationFor(species, riverId)!);
  return {
    species,
    total: species.length,
    native: associations.filter(a => a.status === 'native').length,
    introduced: associations.filter(a => a.status === 'introduced').length,
    uncertain: associations.filter(a => a.status === 'uncertain').length,
    endemic: associations.filter(a => a.basinEndemic).length,
    evidencePeriods: [...new Set(associations.map(a => a.evidencePeriod))],
  };
}

function listOut(parts: string[]): string {
  if (parts.length <= 1) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

/** One plain sentence stating what this guide actually holds for a basin. */
export function basinSummarySentence(river: River, roster: BasinRoster): string {
  if (roster.total === 0) return `This guide holds no sourced species records for the ${river.name} basin yet.`;
  const parts: string[] = [];
  if (roster.native > 0) {
    parts.push(roster.endemic > 0 ? `${roster.native} native (${roster.endemic} basin endemic)` : `${roster.native} native`);
  }
  if (roster.introduced > 0) parts.push(`${roster.introduced} introduced`);
  if (roster.uncertain > 0) parts.push(`${roster.uncertain} with uncertain native status`);
  const records = `${roster.total} sourced species record${roster.total === 1 ? '' : 's'}`;
  return `This guide holds ${records} for the ${river.name} basin: ${listOut(parts)}.`;
}

/** Species recorded in the same basin, excluding the one being viewed. */
export function siblingSpecies(riverId: string, excludeSpeciesId: string): Species[] {
  return catalog.species.filter(species => species.id !== excludeSpeciesId && associationFor(species, riverId));
}
