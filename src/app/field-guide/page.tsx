import type { Metadata } from 'next';
import Link from 'next/link';
import { freshwaterCatalog as catalog } from '@/lib/catalog';
import { SITE_ORIGIN, CONTENT_UPDATED_AT } from '@/lib/reference';
import { JsonLd } from '@/components/seo/JsonLd';
import { articleSchema, breadcrumbSchema, datasetSchema, definedTermSetSchema, faqSchema, fieldGuideSchema } from '@/lib/structuredData';
import type { Crumb } from '@/lib/structuredData';
import styles from './page.module.css';
import { SiteHeader, SiteFooter } from '@/components/reference/SiteNavigation';
import { HomeSearch } from '@/components/home/HomeSearch';
import { SpeciesPlate } from '@/components/reference/SpeciesPlate';

export const metadata: Metadata = {
  title: 'Indian river fish field guide',
  description: 'Explore sourced freshwater fish records from the Ganga, Brahmaputra, Cauvery, Krishna and Godavari, with basin-specific native status and survey context.',
  alternates: { canonical: `${SITE_ORIGIN}/field-guide` },
  openGraph: {
    title: 'Indian river fish field guide',
    description: 'Five rivers, thirteen freshwater fishes, and the evidence behind their basin associations.',
    url: `${SITE_ORIGIN}/field-guide`, type: 'website', siteName: 'Native Waters', locale: 'en',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'Indian river fish field guide — Native Waters' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Indian river fish field guide',
    description: 'Five rivers, thirteen freshwater fishes, and the evidence behind their basin associations.',
  },
};

/** One source of truth for both the visible FAQ and its FAQPage schema. */
const FAQ: { question: string; answer: string }[] = [
  {
    question: 'What does native mean in this field guide?',
    answer: 'Native means the cited evidence supports origin in that river system. Basin endemic means the source limits the natural range to that system; native status uncertain means a record supports occurrence but does not settle origin.',
  },
  {
    question: 'Which Indian rivers does the field guide cover?',
    answer: 'The Ganga, Brahmaputra, Cauvery, Krishna and Godavari, with a sourced selection of freshwater fish records for each.',
  },
  {
    question: 'Is this a complete checklist of Indian freshwater fish?',
    answer: 'No. It is a selected reference and not a complete checklist or a current population survey. Evidence dates describe the source, not a new sighting.',
  },
  {
    question: 'Does the underwater experience show these exact species?',
    answer: 'No. The underwater experience is an illustrative visual study. The field guide records do not identify its fish or certify its habitat.',
  },
];

const BREADCRUMBS: Crumb[] = [
  { name: 'Home', path: '/' },
  { name: 'Field guide', path: '/field-guide' },
];

const DEFINED_TERMS = [
  { term: 'Native', definition: 'The cited evidence supports origin in that river system.' },
  { term: 'Basin endemic', definition: 'The source limits the natural range to that system.' },
  { term: 'Native status uncertain', definition: 'A record supports occurrence, but does not settle origin.' },
];

function Citations({ ids }: { ids: string[] }) {
  return <ul className={styles.citations}>{ids.map(id => {
    const source = catalog.sources.find(s => s.id === id)!;
    return <li key={id}><a href={source.url}>{source.title}</a>
      <span> {source.published ? `Published ${source.published}.` : 'Publication date not stated.'} Reviewed {source.accessed}.</span></li>;
  })}</ul>;
}

export default function FieldGuide() {
  return <div className="public-page"><SiteHeader /><main id="main-content" className={styles.guide}>
    <JsonLd data={[fieldGuideSchema(), datasetSchema(), definedTermSetSchema(DEFINED_TERMS), faqSchema(FAQ), breadcrumbSchema(BREADCRUMBS), articleSchema({ title: 'Indian river fish field guide', description: 'Explore sourced freshwater fish records from the Ganga, Brahmaputra, Cauvery, Krishna and Godavari, with basin-specific native status and survey context.', url: `${SITE_ORIGIN}/field-guide`, dateModified: CONTENT_UPDATED_AT.toISOString() })]} />
    <section className={styles.intro}>
      <div>
        <h1>Freshwater<br />field guide</h1>
        <p>Five Indian river systems. Thirteen sourced fish records. Follow the connections between a species and its waters.</p>
        <nav aria-label='Rivers in the field guide'>{catalog.rivers.map(river => <a key={river.id} href={`#${river.id}`}>{river.name}</a>)}</nav>
        <a href="#reading-the-evidence">How to read this guide</a>
      </div>
      <SpeciesPlate id="dawkinsia-arulius" />
    </section>
    <section className={styles.index} aria-labelledby="species-index">
      <div><h2 id="species-index">Find your species</h2><HomeSearch /></div>
      <nav aria-label="Species index">{[...catalog.species].sort((a, b) => a.commonName.localeCompare(b.commonName)).map(species => <Link key={species.id} href={`/species/${species.id}`}>{species.commonName}</Link>)}</nav>
    </section>
    <aside id='reading-the-evidence' className={styles.method}>
      <h2>Reading the evidence</h2>
      <p><strong>Native</strong> means the cited evidence supports origin in that river system. <strong>Basin endemic</strong> means the source limits its natural range to that system. <strong>Native status uncertain</strong> means a record supports occurrence, but does not settle origin.</p>
      <p>This is a selected reference, not a complete checklist or a current population survey. Evidence dates describe the source, not a new sighting. We keep locations coarse and do not publish collection directions. Historical threat categories are omitted pending a current assessment check.</p>
      <p>The <Link href='/experience' prefetch={false}>underwater experience</Link> is an illustrative visual study. These records do not identify its fish or certify its habitat.</p>
    </aside>
    {catalog.rivers.map(river => <section key={river.id} id={river.id} className={styles.river} aria-labelledby={`${river.id}-title`}>
      <div className={styles.riverIntro}>
        <h2 id={`${river.id}-title`}><Link href={`/basins/${river.id}`}>{river.name}</Link></h2>
        {river.aliases.length > 0 && <p>Also known as {river.aliases.join(', ')}</p>}
        <p>{river.summary}</p><p className={styles.scope}>{river.scope}</p>
        <Citations ids={river.sourceIds} />
      </div>
      <div className={styles.speciesList}>{catalog.species.flatMap(species => species.associations.filter(a => a.riverId === river.id).map(association =>
        <article key={species.id} id={species.associations[0].riverId === river.id ? species.id : `${river.id}-${species.id}`} className={styles.species}>
          <h3><Link href={`/species/${species.id}`}>{species.commonName}</Link></h3>
          {species.commonName !== species.scientificName && <p className={styles.scientific}><i>{species.scientificName}</i></p>}
          {species.aliases.length > 0 && <p>Also called {species.aliases.join(', ')}</p>}
          <p className={styles.status}>{association.status === 'uncertain' ? 'Native status uncertain' : association.status === 'introduced' ? 'Introduced' : 'Native'}{association.basinEndemic ? ' · Basin endemic' : ''}</p>
          <p>{species.summary}</p>
          <details><summary>Read the evidence</summary>
            <dl><dt>Record area</dt><dd>{association.locality}</dd><dt>Evidence period</dt><dd>{association.evidencePeriod}</dd></dl>
            <p>{association.note}</p><Citations ids={association.sourceIds} />
          </details>
        </article>
      ))}</div>
    </section>)}
    <section className={styles.faq} aria-labelledby='faq-title'>
      <h2 id='faq-title'>About the records</h2>
      <dl>{FAQ.map(entry => <div key={entry.question}>
        <dt>{entry.question}</dt>
        <dd>{entry.answer}</dd>
      </div>)}</dl>
    </section>
    <p className="atlas-reviewed">Last reviewed {CONTENT_UPDATED_AT.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.</p>
    <p>Names follow the cited publications. Further taxonomic review may change names or distribution limits; this guide makes no claim to a complete current revision.</p>
  </main><SiteFooter /></div>;
}
