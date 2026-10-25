import data from '../../content/catalog/freshwater.json';

export type Source = { id: string; title: string; url: string; published: string | null; accessed: string };
export type River = { id: string; name: string; aliases: string[]; summary: string; scope: string; sourceIds: string[] };
export type Association = {
  riverId: string; status: 'native' | 'introduced' | 'uncertain'; basinEndemic: boolean;
  locality: string; evidencePeriod: string; sourceIds: string[]; note: string;
};
export type Species = {
  id: string; scientificName: string; commonName: string; aliases: string[];
  summary: string; associations: Association[];
};
export type Catalog = { sources: Source[]; rivers: River[]; species: Species[] };

/** Validate the authored catalog before it can be rendered or linked. */
export function validateCatalog(catalog: Catalog): Catalog {
  const fail = (message: string): never => { throw new Error(`Freshwater catalog: ${message}`); };
  const text = (value: unknown) => typeof value === 'string' && value.trim().length > 0;
  function ids(records: { id: string }[]) {
    const seen = new Set<string>();
    for (const record of records) {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(record.id) || seen.has(record.id)) fail('invalid or duplicate ID');
      seen.add(record.id);
    }
    return seen;
  }
  const sources = ids(catalog.sources), rivers = ids(catalog.rivers);
  ids(catalog.species);
  const cited = (refs: string[]) => {
    if (!refs.length || new Set(refs).size !== refs.length || refs.some(id => !sources.has(id))) fail('missing or invalid citation');
  };
  for (const source of catalog.sources) {
    if (!text(source.title)) fail('source title required');
    const url = new URL(source.url);
    if (url.protocol !== 'https:' || url.username || url.password) fail('source must use public HTTPS');
    for (const date of [source.accessed, source.published]) {
      if (date !== null && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)))) fail('invalid source date');
    }
  }
  const names = new Set<string>();
  function aliases(primary: string, values: string[], namespace: string) {
    for (const name of [primary, ...values]) {
      const key = `${namespace}:${name.trim().toLowerCase()}`;
      if (!text(name) || names.has(key)) fail('blank or ambiguous name/alias');
      names.add(key);
    }
  }
  for (const river of catalog.rivers) {
    aliases(river.name, river.aliases, 'river');
    if (![river.summary, river.scope].every(text)) fail('river context required');
    cited(river.sourceIds);
  }
  for (const species of catalog.species) {
    aliases(species.scientificName, species.aliases, 'species');
    if (![species.commonName, species.summary].every(text) || !species.associations.length) fail('species context required');
    const associations = new Set<string>();
    for (const association of species.associations) {
      if (!rivers.has(association.riverId) || associations.has(association.riverId)) fail('invalid or duplicate river association');
      associations.add(association.riverId);
      if (!['native', 'introduced', 'uncertain'].includes(association.status)) fail('invalid native status');
      if (typeof association.basinEndemic !== 'boolean' || (association.basinEndemic && association.status !== 'native')) fail('endemic requires native status');
      if (![association.locality, association.evidencePeriod, association.note].every(text)) fail('association evidence required');
      cited(association.sourceIds);
    }
  }
  return catalog;
}

export const freshwaterCatalog = validateCatalog(data as Catalog);
