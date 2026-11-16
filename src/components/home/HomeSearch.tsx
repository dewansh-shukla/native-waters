'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { freshwaterCatalog } from '@/lib/catalog';
import styles from './HomeSearch.module.css';

type Result = { kind: 'species' | 'river'; id: string; title: string; subtitle: string; href: string };

const RIVER_NAMES: Record<string, string> = Object.fromEntries(
  freshwaterCatalog.rivers.map(river => [river.id, river.name])
);

const ALL: Result[] = [
  ...freshwaterCatalog.species.map(species => {
    const river = species.associations[0]?.riverId;
    return {
      kind: 'species' as const,
      id: species.id,
      title: species.commonName,
      subtitle: `${species.scientificName}${river ? ` · ${RIVER_NAMES[river] ?? river}` : ''}`,
      href: `/species/${species.id}`,
    };
  }),
  ...freshwaterCatalog.rivers.map(river => ({
    kind: 'river' as const,
    id: river.id,
    title: river.name,
    subtitle: `River basin · ${river.aliases.join(', ') || 'India'}`,
    href: `/basins/${river.id}`,
  })),
];

function matches(result: Result, source: (typeof freshwaterCatalog.species)[number] | (typeof freshwaterCatalog.rivers)[number], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  const haystack = [result.title, result.subtitle, 'aliases' in source ? source.aliases.join(' ') : ''].join(' ').toLowerCase();
  return haystack.includes(q);
}

export function HomeSearch() {
  const [query, setQuery] = useState('');
  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    return ALL.filter((result, index) => {
      const source = index < freshwaterCatalog.species.length
        ? freshwaterCatalog.species[index]
        : freshwaterCatalog.rivers[index - freshwaterCatalog.species.length];
      return matches(result, source, q);
    }).slice(0, 8);
  }, [query]);

  return <div className={styles.search}>
    <label htmlFor="home-search">Search fish, rivers or species</label>
    <input id="home-search" type="search" value={query} onChange={event => setQuery(event.target.value)}
      placeholder="Try Rohu, Ganga or a scientific name" autoComplete="off" aria-describedby="search-feedback" />
    <p id="search-feedback" role="status" className={styles.feedback}>
      {query.trim() ? results.length ? `${results.length} matching records. Tab to browse results.` : 'No matching records. Try another name or browse the field guide.' : 'Search common names, scientific names and aliases.'}
    </p>
    {results.length > 0 && <ul className={styles.results} aria-label="Search results">
      {results.map(result => <li key={`${result.kind}-${result.id}`}>
        <Link href={result.href}><strong>{result.title}</strong><span>{result.subtitle}</span></Link>
      </li>)}
    </ul>}
    <noscript><p>Search needs JavaScript. <Link href="/field-guide">Browse every species in the field guide.</Link></p></noscript>
  </div>;
}
