import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE_ORIGIN } from '@/lib/reference';
import { JsonLd } from '@/components/seo/JsonLd';
import { articleSchema } from '@/lib/structuredData';

export const metadata: Metadata = {
  title: 'Method and evidence policy',
  description: 'How Native Waters selects, reads and presents its sourced freshwater fish records, and how to interpret native status, evidence periods and coarse locations.',
  alternates: { canonical: `${SITE_ORIGIN}/method` },
  openGraph: {
    title: 'Method and evidence policy',
    description: 'How Native Waters selects, reads and presents its sourced freshwater fish records, and how to interpret native status, evidence periods and coarse locations.',
    url: `${SITE_ORIGIN}/method`, type: 'website', siteName: 'Native Waters', locale: 'en',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'Method and evidence policy — Native Waters' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Method and evidence policy',
    description: 'How Native Waters selects, reads and presents its sourced freshwater fish records, and how to interpret native status, evidence periods and coarse locations.',
  },
};

const DESCRIPTION = 'How Native Waters selects, reads and presents its sourced freshwater fish records, and how to interpret native status, evidence periods and coarse locations.';

export default function MethodPage() {
  return (
    <main style={{ maxWidth: '72ch', margin: '0 auto', padding: '2rem 1.5rem 4rem' }}>
      <JsonLd data={articleSchema({ title: 'Method and evidence policy', description: DESCRIPTION, url: `${SITE_ORIGIN}/method`, datePublished: '2026-11-16', dateModified: '2026-11-16' })} />
      <nav aria-label="Breadcrumb" style={{ fontSize: '0.85rem', marginBottom: '1.5rem' }}>
        <Link href="/">Home</Link> / Method
      </nav>
      <h1>Method and evidence policy</h1>
      <p><em>Last reviewed: 16 November 2026.</em></p>

      <h2>How records are selected</h2>
      <p>Records are drawn from cited publications; each river and species page lists its sources. This is a selected reference, not a complete checklist or a current population survey, and occurrence records describe places and dates rather than new sightings.</p>

      <h2>What native means</h2>
      <p>Native means the cited evidence supports origin in that river system. Basin endemic means the source limits the natural range to that system. Native status uncertain means a record supports occurrence but does not settle origin.</p>

      <h2>How to read an evidence period</h2>
      <p>Evidence dates describe the source, not a new sighting. They indicate when the cited publication recorded or assessed the species, rather than a fresh observation.</p>

      <h2>Why locations stay coarse</h2>
      <p>Record areas are kept coarse and locations are not published at collection precision. This avoids enabling targeted collection of restricted or threatened populations.</p>

      <h2>No collection directions</h2>
      <p>We do not publish collection directions or guidance for locating, capturing or handling fish.</p>

      <h2>Citations and review</h2>
      <p>Names follow the cited publications; further taxonomic review may change names or distribution limits. Historical threat categories are omitted pending a current assessment check.</p>
    </main>
  );
}
