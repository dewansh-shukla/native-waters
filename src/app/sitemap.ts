import type { MetadataRoute } from 'next';
import { freshwaterCatalog as catalog } from '@/lib/catalog';
import { SITE_ORIGIN } from '@/lib/reference';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_ORIGIN}/`, lastModified, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${SITE_ORIGIN}/field-guide`, lastModified, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_ORIGIN}/experience`, lastModified, changeFrequency: 'monthly', priority: 0.9 },
  ];
  const riverRoutes: MetadataRoute.Sitemap = catalog.rivers.map(river => ({
    url: `${SITE_ORIGIN}/basins/${river.id}`,
    lastModified,
    changeFrequency: 'monthly',
    priority: 0.7,
  }));
  const speciesRoutes: MetadataRoute.Sitemap = catalog.species.map(species => ({
    url: `${SITE_ORIGIN}/species/${species.id}`,
    lastModified,
    changeFrequency: 'monthly',
    priority: 0.7,
  }));
  return [...staticRoutes, ...riverRoutes, ...speciesRoutes];
}
