import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import FieldGuide, { metadata } from './page';
import sitemap from '../sitemap';
import robots from '../robots';
import { freshwaterCatalog as catalog } from '@/lib/catalog';
import { SITE_ORIGIN } from '@/lib/reference';

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
    expect(metadata.alternates?.canonical).toBe(`${SITE_ORIGIN}/field-guide`);
    // three static routes (/, /field-guide, /experience) + three per-river experience routes
    expect(sitemap()).toHaveLength(3 + 3 + catalog.rivers.length + catalog.species.length);
    const urls = sitemap().map(entry => entry.url);
    expect(new Set(urls).size).toBe(urls.length);
    for (const river of catalog.rivers) expect(urls).toContain(`${SITE_ORIGIN}/basins/${river.id}`);
    for (const species of catalog.species) expect(urls).toContain(`${SITE_ORIGIN}/species/${species.id}`);
    expect(robots().sitemap).toBe(`${SITE_ORIGIN}/sitemap.xml`);
  });
});
