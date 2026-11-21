import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE_ORIGIN } from '@/lib/reference';
import { JsonLd } from '@/components/seo/JsonLd';
import { articleSchema } from '@/lib/structuredData';
import { SiteHeader, SiteFooter } from '@/components/reference/SiteNavigation';

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
    <div className="public-page"><SiteHeader /><main id="main-content" className="atlas-prose">
      <JsonLd data={articleSchema({ title: 'Method and evidence policy', description: DESCRIPTION, url: `${SITE_ORIGIN}/method`, dateModified: '2026-11-20' })} />
      <nav aria-label="Breadcrumb" style={{ fontSize: '0.85rem', marginBottom: '1.5rem' }}>
        <Link href="/">Home</Link> / Method
      </nav>
      <h1>Method and evidence policy</h1>
      <p><em>Last reviewed: 20 November 2026.</em></p>
      <p>In plain terms: this page explains how Native Waters chooses its records, what &quot;native&quot; and &quot;introduced&quot; mean here, how to read dates and locations, where the conservation categories come from, and how images are credited. The technical policy follows each section.</p>

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

      <h2>Conservation categories</h2>
      <p>Red List categories come from the IUCN Red List as mirrored by FishBase (version 2025-2) and are cited on each species page. A category is a global extinction-risk assessment: it is not a local population count, and Not Evaluated is not a finding of safety.</p>

      <h2>Images</h2>
      <p>Species images come from Wikimedia Commons and are either photographs of live fish or nineteenth-century plates. Each caption names the creator, the date and the licence, and links to the source file; the footer and the <a href="/atlas/credits.json">machine-readable credit record</a> list every image used. Where no suitably licensed image exists, a record shows none rather than a stand-in. Some originals carry a photographer’s watermark, which we keep rather than edit.</p>

      <h2>How river associations are verified</h2>
      <p>A river association is recorded only when a cited publication supports it. Native means the source supports origin in that river system. Basin endemic means the source limits the natural range to that system. Native status uncertain means a record supports occurrence but does not settle origin. Introduced means the source records the species as introduced. An association in one basin is never assumed to extend to another.</p>

      <h2>Historical records and current observations</h2>
      <p>Evidence dates describe the source, not a new sighting. They indicate when a survey was carried out or a publication assessed the species. A historical record is not proof of current presence, and a species may be locally absent from a reach even where it was once recorded.</p>

      <h2>Scientific names</h2>
      <p>Names follow the cited publications. Further taxonomic review may change names or distribution limits, and this guide makes no claim to a complete current revision. Where a source uses a synonym, the record keeps the name it cites.</p>

      <h2>IUCN sourcing and updates</h2>
      <p>Red List categories come from the IUCN Red List as mirrored by FishBase (version 2025-2), with the assessment date shown where one exists. A category is a global extinction-risk assessment; it is not a local population count, and Not Evaluated is not a finding of safety. Categories can change when the Red List is updated, so each species page carries its assessment date.</p>

      <h2>Submitting corrections</h2>
      <p>Corrections are accepted when they cite a published source. To report an error, identify the page and the affected claim, and provide the supporting citation. Records are updated when a cited source supports a change; unsupported claims are not added.</p>

      <h2>Citations and review</h2>
      <p>Names follow the cited publications; further taxonomic review may change names or distribution limits.</p>
    </main><SiteFooter /></div>
  );
}
