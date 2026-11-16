'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { freshwaterCatalog } from '@/lib/catalog';

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

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: '36rem' }}>
      <label htmlFor="home-search" style={{ position: 'absolute', left: '-9999px' }}>
        Search fish, rivers or species
      </label>
      <input
        id="home-search"
        type="search"
        value={query}
        onChange={event => setQuery(event.target.value)}
        placeholder="Search fish, rivers or species"
        autoComplete="off"
        style={{
          width: '100%',
          padding: '0.85rem 1rem',
          fontSize: '1rem',
          border: '1px solid #446166',
          borderRadius: '999px',
          background: '#0e1a1c',
          color: '#e8f1ee',
          outline: 'none',
        }}
      />
      {results.length > 0 && (
        <ul
          role="listbox"
          style={{
            position: 'absolute',
            top: 'calc(100% + 0.5rem)',
            left: 0,
            right: 0,
            margin: 0,
            padding: '0.5rem',
            listStyle: 'none',
            background: '#101c1e',
            border: '1px solid #446166',
            borderRadius: '12px',
            boxShadow: '0 12px 32px rgba(0,0,0,0.35)',
            zIndex: 20,
          }}
        >
          {results.map(result => (
            <li key={`${result.kind}-${result.id}`} role="option">
              <Link
                href={result.href}
                style={{
                  display: 'block',
                  padding: '0.6rem 0.75rem',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  color: '#e8f1ee',
                }}
              >
                <span style={{ display: 'block', fontWeight: 600 }}>{result.title}</span>
                <span style={{ display: 'block', fontSize: '0.85rem', color: '#8fb3ab' }}>{result.subtitle}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
