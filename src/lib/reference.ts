import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { freshwaterCatalog } from './catalog';
export const SITE_ORIGIN = 'https://native-waters.vercel.app';
export function getRiver(slug: string) {
  return freshwaterCatalog.rivers.find(river => river.id === slug) ?? notFound();
}
export function getSpecies(slug: string) {
  return freshwaterCatalog.species.find(species => species.id === slug) ?? notFound();
}
export function referenceMetadata(title: string, description: string, path: string): Metadata {
  return { title: `${title} | Native Waters`, description,
    alternates: { canonical: `${SITE_ORIGIN}${path}` },
    openGraph: { title: `${title} | Native Waters`, description, url: `${SITE_ORIGIN}${path}`, type: 'website' },
  };
}
