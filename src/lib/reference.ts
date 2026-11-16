import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { freshwaterCatalog } from './catalog';
export const SITE_ORIGIN = 'https://discovernativewaters.com';
export const SITE_NAME = 'Native Waters';
export const CONTENT_UPDATED_AT = new Date('2026-11-16T00:00:00.000Z');
const DEFAULT_SHARE_IMAGE = '/opengraph-image';
export function getRiver(slug: string) {
  return freshwaterCatalog.rivers.find(river => river.id === slug) ?? notFound();
}
export function getSpecies(slug: string) {
  return freshwaterCatalog.species.find(species => species.id === slug) ?? notFound();
}
/**
 * Shared page metadata. Titles stay bare because the root layout title template
 * appends " | Native Waters"; the home page (same segment as the layout) opts out
 * with `absoluteTitle` and spells the brand out itself.
 */
export function referenceMetadata(
  title: string,
  description: string,
  path: string,
  options: { imagePath?: string; absoluteTitle?: boolean } = {},
): Metadata {
  const url = `${SITE_ORIGIN}${path}`;
  const image = options.imagePath ?? DEFAULT_SHARE_IMAGE;
  return {
    title: options.absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title, description, url, type: 'website', siteName: SITE_NAME, locale: 'en',
      images: [{ url: image, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}
