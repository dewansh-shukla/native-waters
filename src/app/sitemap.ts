import type { MetadataRoute } from 'next';
import { freshwaterCatalog as catalog } from '@/lib/catalog';
import { SITE_ORIGIN } from '@/lib/reference';
export default function sitemap(): MetadataRoute.Sitemap {
  return ['/', '/field-guide', '/experience', ...catalog.rivers.map(r => `/basins/${r.id}`), ...catalog.species.map(s => `/species/${s.id}`)]
    .map(path => ({ url: `${SITE_ORIGIN}${path}` }));
}
