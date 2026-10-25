import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import FieldGuide, { metadata } from './page';
import sitemap from '../sitemap';
import robots from '../robots';
import { freshwaterCatalog as catalog } from '@/lib/catalog';

describe('crawlable freshwater guide', () => {
  it('renders every river, taxon, evidence limitation and citation as DOM text', () => {
    render(<FieldGuide />);
    for (const river of catalog.rivers) {
      expect(screen.getByRole('heading', { name: river.name })).toBeVisible();
    }
    for (const species of catalog.species) {
      const article = document.getElementById(species.id)!;
      expect(article).toHaveTextContent(species.scientificName);
      for (const a of species.associations) {
        expect(article).toHaveTextContent(a.locality);
        expect(article).toHaveTextContent(a.evidencePeriod);
        expect(article).toHaveTextContent(a.note);
        for (const id of a.sourceIds) {
          const source = catalog.sources.find(s => s.id === id)!;
          expect(within(article).getByRole('link', { name: source.title })).toHaveAttribute('href', source.url);
        }
      }
    }
    expect(document.getElementById('badis-badis')).toHaveTextContent('Native status uncertain');
  });
  it('lists only real routes in discovery metadata', () => {
    expect(metadata.alternates?.canonical).toBe('https://native-waters.vercel.app/field-guide');
    expect(sitemap()).toHaveLength(3 + catalog.rivers.length + catalog.species.length);
    expect(new Set(sitemap().map(entry => entry.url)).size).toBe(sitemap().length);
    for (const river of catalog.rivers) expect(sitemap()).toContainEqual({ url: `https://native-waters.vercel.app/basins/${river.id}` });
    for (const species of catalog.species) expect(sitemap()).toContainEqual({ url: `https://native-waters.vercel.app/species/${species.id}` });
    expect(robots().sitemap).toBe('https://native-waters.vercel.app/sitemap.xml');
  });
});
