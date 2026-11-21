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
import { conservationSummary, formatLength, isThreatened } from '@/lib/conservation';

export const metadata: Metadata = {
  title: 'Freshwater fish of India: field guide',
  description: 'Sourced freshwater fish records from the Ganga, Brahmaputra, Cauvery, Krishna and Godavari, with habitat, distribution, maximum recorded size, basin-specific native status and survey context.',
  alternates: { canonical: `${SITE_ORIGIN}/field-guide` },
  openGraph: {
    title: 'Freshwater fish of India: field guide',
    description: 'Five rivers, thirteen freshwater fishes, and the evidence behind their basin associations.',
    url: `${SITE_ORIGIN}/field-guide`, type: 'website', siteName: 'Native Waters', locale: 'en',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'Freshwater fish of India — Native Waters field guide' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Freshwater fish of India: field guide',
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
  {
    question: 'What does an evidence period mean?',
    answer: 'It describes the dates of the cited source — when a survey was carried out or a publication assessed the species. It is not the date of a new sighting.',
  },
  {
    question: 'Are the Red List categories current?',
    answer: `They come from FishBase’s mirror of the IUCN Red List (version ${catalog.species[0].facts.conservation.version}) and include the assessment date where one exists. Categories can change when the Red List is updated.`,
  },
  {
    question: 'How are introduced species shown?',
    answer: 'A record supported as introduced is labelled introduced and is not presented as part of the basin’s native fauna. Native status uncertain means occurrence is supported but origin is not settled.',
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
  { term: 'Introduced', definition: 'The cited evidence records the species as introduced to that river system.' },
  { term: 'Threatened', definition: 'An IUCN Red List category of Vulnerable, Endangered or Critically Endangered.' },
];

function Citations({ ids }: { ids: string[] }) {
  return <ul className={styles.citations}>{ids.map(id => {
    const source = catalog.sources.find(s => s.id === id)!;
    return <li key={id}><a href={source.url}>{source.title}</a>
      <span> {source.published ? `Published ${source.published}.` : 'Publication date not stated.'} Reviewed {source.accessed}.</span></li>;
  })}</ul>;
}

export default function FieldGuide() {
  const summary = conservationSummary();
  return <div className="public-page"><SiteHeader /><main id="main-content" className={styles.guide}>
    <JsonLd data={[fieldGuideSchema(), datasetSchema(), definedTermSetSchema(DEFINED_TERMS), faqSchema(FAQ), breadcrumbSchema(BREADCRUMBS), articleSchema({ title: 'Freshwater fish of India: field guide', description: 'Sourced freshwater fish records from the Ganga, Brahmaputra, Cauvery, Krishna and Godavari, with habitat, distribution, maximum recorded size, basin-specific native status and survey context.', url: `${SITE_ORIGIN}/field-guide`, dateModified: CONTENT_UPDATED_AT.toISOString() })]} />
    <section className={styles.intro}>
      <div>
        <h1>Freshwater<br />fish of India</h1>
        <p>Five Indian river systems. Thirteen sourced freshwater fish records. Start with a river below, or search for a species by common or scientific name. Every entry links to a full profile with record facts, conservation status and citations. {summary.threatened} of the {summary.total} are listed as threatened on the IUCN Red List — <Link href="/conservation">see their conservation status</Link>.</p>
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
      <p><strong>Native</strong> means the cited evidence supports origin in that river system. <strong>Basin endemic</strong> means the source limits its natural range to that system. <strong>Native status uncertain</strong> means a record supports occurrence, but does not settle origin. <strong>Introduced</strong> means the cited evidence records the species as introduced to that system. <strong>Threatened</strong> refers to the IUCN categories Vulnerable, Endangered and Critically Endangered.</p>
      <p>In short: a record tells you what a cited survey reported. It does not tell you how common the fish is today, or that it lives in every stretch of the river. This is a selected reference, not a complete checklist or a current population survey. Evidence dates describe the source, not a new sighting. We keep locations coarse and do not publish collection directions. Red List categories come from FishBase’s mirror of the IUCN Red List (version {catalog.species[0].facts.conservation.version}); read the <Link href="/conservation">conservation overview</Link>.</p>
      <p>The <Link href='/experience' prefetch={false}>underwater experience</Link> is an illustrative visual study. These records do not identify its fish or certify its habitat.</p>
    </aside>
    {catalog.rivers.map(river => {
      const entries = catalog.species.flatMap(species => species.associations.filter(a => a.riverId === river.id).map(association => ({ species, association })));
      const threatenedCount = entries.filter(entry => isThreatened(entry.species)).length;
      const countSentence = threatenedCount === 0
        ? `${entries.length} sourced ${entries.length === 1 ? 'record' : 'records'}; none in a threatened Red List category.`
        : `${entries.length} sourced ${entries.length === 1 ? 'record' : 'records'}; ${threatenedCount} in a threatened Red List category.`;
      return <section key={river.id} id={river.id} className={styles.river} aria-labelledby={`${river.id}-title`}>
      <div className={styles.riverIntro}>
        <h2 id={`${river.id}-title`}><Link href={`/basins/${river.id}`}>{river.name}</Link></h2>
        {river.aliases.length > 0 && <p>Also known as {river.aliases.join(', ')}</p>}
        <p>{river.summary}</p><p className={styles.scope}>{river.scope}</p>
        <p>{countSentence}</p>
        <Citations ids={river.sourceIds} />
      </div>
      <div className={styles.speciesList}>{entries.map(({ species, association }) => {
        const factsSource = catalog.sources.find(source => source.id === species.facts.sourceId);
        return <article key={species.id} id={species.associations[0].riverId === river.id ? species.id : `${river.id}-${species.id}`} className={styles.species}>
          <h3><Link href={`/species/${species.id}`}>{species.commonName}</Link></h3>
          {species.commonName !== species.scientificName && <p className={styles.scientific}><i>{species.scientificName}</i></p>}
          {species.aliases.length > 0 && <p>Also called {species.aliases.join(', ')}</p>}
          <p className={styles.status}>{association.status === 'uncertain' ? 'Native status uncertain' : association.status === 'introduced' ? 'Introduced' : 'Native'}{association.basinEndemic ? ' · Basin endemic' : ''}<span className={`${styles.iucn} ${isThreatened(species) ? styles.iucnThreat : ''}`} title={`IUCN Red List: ${species.facts.conservation.label}`}>{species.facts.conservation.code}</span></p>
          <p>{species.summary}</p>
          <p><strong>Environment:</strong> {species.facts.environment}. <strong>Distribution:</strong> {species.facts.distribution} <strong>Maximum recorded length:</strong> {formatLength(species)}{species.facts.maxWeightKg !== null ? ` (maximum published weight ${species.facts.maxWeightKg} kg)` : ''}.</p>
          {factsSource && <p><small>Environment, distribution and size from <a href={factsSource.url}>{factsSource.title}</a>, accessed {factsSource.accessed}.</small></p>}
          <details><summary>Read the evidence</summary>
            <dl><dt>Record area</dt><dd>{association.locality}</dd><dt>Evidence period</dt><dd>{association.evidencePeriod}</dd></dl>
            <p>{association.note}</p><Citations ids={association.sourceIds} />
          </details>
        </article>;
      })}</div>
    </section>;
    })}
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
