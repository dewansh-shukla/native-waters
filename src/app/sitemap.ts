import type { MetadataRoute } from 'next';
import { freshwaterCatalog as catalog } from '@/lib/catalog';
import { SITE_ORIGIN, CONTENT_UPDATED_AT } from '@/lib/reference';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = CONTENT_UPDATED_AT;
  // Next emits the home canonical without a trailing slash; keep the sitemap identical.
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_ORIGIN, lastModified },
    { url: `${SITE_ORIGIN}/field-guide`, lastModified },
    { url: `${SITE_ORIGIN}/method`, lastModified },
    { url: `${SITE_ORIGIN}/privacy`, lastModified },
  ];
  const riverRoutes: MetadataRoute.Sitemap = catalog.rivers.map(river => ({
    url: `${SITE_ORIGIN}/basins/${river.id}`,
    lastModified,
    images: [`${SITE_ORIGIN}/basins/${river.id}/opengraph-image`],
  }));
  const speciesRoutes: MetadataRoute.Sitemap = catalog.species.map(species => ({
    url: `${SITE_ORIGIN}/species/${species.id}`,
    lastModified,
    images: [`${SITE_ORIGIN}/species/${species.id}/opengraph-image`],
  }));
  return [...staticRoutes, ...riverRoutes, ...speciesRoutes];
}
