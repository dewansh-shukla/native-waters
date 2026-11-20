import type { Metadata } from 'next';
import Link from 'next/link';
import { freshwaterCatalog as catalog } from '@/lib/catalog';
import type { IucnCode, Species } from '@/lib/catalog';
import {
  conservationSummary, formatAssessed, formatLength, IUCN_DEFINITIONS, IUCN_LABELS,
  primaryBasin, threatenedSpecies,
} from '@/lib/conservation';
import { CONTENT_UPDATED_AT, SITE_ORIGIN } from '@/lib/reference';
import { JsonLd } from '@/components/seo/JsonLd';
import { Breadcrumbs } from '@/components/reference/Breadcrumbs';
import { SiteHeader, SiteFooter } from '@/components/reference/SiteNavigation';
import { articleSchema, breadcrumbSchema, faqSchema, webPageSchema } from '@/lib/structuredData';
import type { Crumb } from '@/lib/structuredData';
import styles from './page.module.css';

const PATH = '/conservation';

export const metadata: Metadata = {
  title: 'Conservation status of Indian freshwater fish',
  description: 'IUCN Red List categories, assessment dates and maximum recorded size for the thirteen Indian freshwater fishes in the Native Waters field guide, including two Critically Endangered species.',
  alternates: { canonical: `${SITE_ORIGIN}${PATH}` },
  openGraph: {
    title: 'Conservation status of Indian freshwater fish',
    description: 'Two Critically Endangered and four Endangered fishes among thirteen sourced Indian river records, with IUCN categories, assessment dates and recorded size.',
    url: `${SITE_ORIGIN}${PATH}`, type: 'article', siteName: 'Native Waters', locale: 'en',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'Conservation status of Indian freshwater fish — Native Waters' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Conservation status of Indian freshwater fish',
    description: 'Two Critically Endangered and four Endangered fishes among thirteen sourced Indian river records.',
  },
};

const DESCRIPTION = 'IUCN Red List categories, assessment dates and maximum recorded size for the thirteen Indian freshwater fishes in the Native Waters field guide.';

const CRUMBS: Crumb[] = [
  { name: 'Home', path: '/' },
  { name: 'Field guide', path: '/field-guide' },
  { name: 'Conservation', path: PATH },
];

const CHIP: Record<IucnCode, string> = {
  EX: styles.chipCR, EW: styles.chipCR, CR: styles.chipCR, EN: styles.chipEN,
  VU: styles.chipVU, NT: styles.chipNT, LC: styles.chipLC, DD: styles.chipDD, NE: styles.chipNE,
};

const SEVERITY: Record<IucnCode, number> = {
  EX: 0, EW: 1, CR: 2, EN: 3, VU: 4, NT: 5, DD: 6, LC: 7, NE: 8,
};

const bySeverity = (a: Species, b: Species) =>
  SEVERITY[a.facts.conservation.code] - SEVERITY[b.facts.conservation.code] || a.commonName.localeCompare(b.commonName);

function StatusChip({ species }: { species: Species }) {
  const { code, label } = species.facts.conservation;
  return <span className={`${styles.chip} ${CHIP[code]}`} title={`IUCN Red List: ${label}`}>{code}</span>;
}

function nameOf(species: Species) {
  return species.commonName === species.scientificName
    ? species.scientificName
    : `${species.commonName} (${species.scientificName})`;
}

function SpeciesTable({ species, caption }: { species: Species[]; caption: string }) {
  return <div className={styles.tableWrap}>
    <table className={styles.table}>
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th scope="col">Species</th>
          <th scope="col">Basin record</th>
          <th scope="col">IUCN category</th>
          <th scope="col">Assessed</th>
          <th scope="col">Max length</th>
        </tr>
      </thead>
      <tbody>
        {species.map((entry) => {
          const riverId = entry.associations[0]?.riverId;
          return <tr key={entry.id}>
            <th scope="row"><Link href={`/species/${entry.id}`}>{entry.commonName}</Link>{entry.commonName !== entry.scientificName && <><br /><i>{entry.scientificName}</i></>}</th>
            <td>{riverId ? <Link href={`/basins/${riverId}`}>{primaryBasin(entry)}</Link> : primaryBasin(entry)}</td>
            <td><StatusChip species={entry} /> {entry.facts.conservation.label}</td>
            <td className={styles.numeric}>{formatAssessed(entry.facts.conservation.assessed)}</td>
            <td className={styles.numeric}>{formatLength(entry)}</td>
          </tr>;
        })}
      </tbody>
    </table>
  </div>;
}

export default function ConservationPage() {
  const summary = conservationSummary();
  const threatened = threatenedSpecies();
  const all = [...catalog.species].sort(bySeverity);
  const assessed = catalog.species
    .map(species => species.facts.conservation.assessed)
    .filter((value): value is string => value !== null)
    .sort();
  const firstAssessment = assessed[0];
  const lastAssessment = assessed[assessed.length - 1];
  const cauveryThreatened = threatened.filter(species => species.associations.some(a => a.riverId === 'cauvery')).length;
  const version = catalog.species[0].facts.conservation.version;
  const reviewed = CONTENT_UPDATED_AT.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  const headline = `${summary.threatened} of the ${summary.total} species recorded in this field guide are listed as threatened on the IUCN Red List: ${summary.criticallyEndangered} Critically Endangered and ${summary.endangered} Endangered. ${cauveryThreatened} of the ${summary.threatened} are Cauvery basin records.`;

  const FAQ: { question: string; answer: string }[] = [
    {
      question: 'Which Indian freshwater fish in this guide are Critically Endangered?',
      answer: `${speciesByCode('CR')} are listed as Critically Endangered on the IUCN Red List. Both are Cauvery basin records in this field guide.`,
    },
    {
      question: 'How many species here are threatened?',
      answer: `${summary.threatened} of ${summary.total} recorded species are listed in a threatened category (Critically Endangered, Endangered or Vulnerable). ${summary.leastConcern} are Least Concern and ${summary.notEvaluated} has not been assessed.`,
    },
    {
      question: 'What does Not Evaluated mean?',
      answer: `Not Evaluated means the taxon has not been assessed against the IUCN Red List criteria. It is not a finding that the species is safe; it means no category exists yet. ${speciesByCode('NE')} is in this position in this guide.`,
    },
    {
      question: 'Does Least Concern mean a fish is safe in every river?',
      answer: 'No. Least Concern is a global extinction-risk category, not a local abundance or water-quality measure. A species can be Least Concern worldwide and still be scarce, declining or locally absent in a particular river.',
    },
    {
      question: 'How current are these assessments?',
      answer: `Categories were read from FishBase's mirror of the IUCN Red List, version ${version}, on 20 November 2026. The underlying assessments date from ${formatAssessed(firstAssessment)} to ${formatAssessed(lastAssessment)}.`,
    },
    {
      question: 'Does a basin record mean the species is threatened in that river?',
      answer: 'No. The basin association describes where the species is recorded in the cited survey. The Red List category is a global assessment of extinction risk and is not measured per river.',
    },
  ];

  function speciesByCode(code: IucnCode) {
    const matches = catalog.species.filter(species => species.facts.conservation.code === code);
    if (matches.length === 0) return 'No species in this guide';
    return matches.map(species => `${species.commonName} (${species.scientificName})`).join(' and ');
  }

  return <div className="public-page">
    <SiteHeader />
    <main id="main-content" className="atlas-prose">
      <JsonLd data={[
        webPageSchema({ title: 'Conservation status of Indian freshwater fish', description: DESCRIPTION, url: `${SITE_ORIGIN}${PATH}`, dateModified: CONTENT_UPDATED_AT.toISOString() }),
        breadcrumbSchema(CRUMBS),
        articleSchema({ title: 'Conservation status of Indian freshwater fish', description: DESCRIPTION, url: `${SITE_ORIGIN}${PATH}`, dateModified: CONTENT_UPDATED_AT.toISOString() }),
        faqSchema(FAQ),
      ]} />
      <Breadcrumbs items={CRUMBS} />
      <h1>Conservation status of Indian freshwater fish</h1>
      <p className="atlas-summary" data-speakable>{headline}</p>

      <div className={styles.stats}>
        <div className={styles.stat}><span className={styles.statValue}>{summary.criticallyEndangered}</span><span className={styles.statLabel}>Critically Endangered</span></div>
        <div className={styles.stat}><span className={styles.statValue}>{summary.endangered}</span><span className={styles.statLabel}>Endangered</span></div>
        <div className={styles.stat}><span className={styles.statValue}>{summary.leastConcern}</span><span className={styles.statLabel}>Least Concern</span></div>
        <div className={styles.stat}><span className={styles.statValue}>{summary.notEvaluated}</span><span className={styles.statLabel}>Not Evaluated</span></div>
      </div>
      <p className={styles.note}>Counts cover the {summary.total} species records in this field guide, not all Indian freshwater fish.</p>

      <h2>Threatened species</h2>
      <p>These records fall in the IUCN threatened categories. Each category is a global extinction-risk assessment; the basin shown is where this guide records the species, not the extent of the assessment.</p>
      <ul className={styles.threatList}>
        {threatened.map((species) => <li key={species.id} className={styles.threatItem}>
          <h3 className={styles.threatName}><Link href={`/species/${species.id}`}>{nameOf(species)}</Link></h3>
          <p><StatusChip species={species} /> <strong>{species.facts.conservation.label}</strong> · assessed {formatAssessed(species.facts.conservation.assessed)}</p>
          <p>{primaryBasin(species)} basin · maximum recorded length {formatLength(species)}{species.facts.maxWeightKg === null ? '' : ` · maximum published weight ${species.facts.maxWeightKg} kg`}</p>
          <p>{species.summary}</p>
        </li>)}
      </ul>

      <h2>Every species in this guide</h2>
      <p>Ordered from most to least severe Red List category. A missing assessment is shown as Not Evaluated rather than treated as safe.</p>
      <SpeciesTable species={all} caption={`Sources: FishBase species summaries, IUCN Red List version ${version} (Global). Accessed 20 November 2026.`} />

      <h2>What the categories mean</h2>
      <dl>
        {IUCN_DEFINITIONS.map(entry => <div key={entry.code}>
          <dt><strong>{entry.code}</strong> — {IUCN_LABELS[entry.code]}</dt>
          <dd>{entry.definition}</dd>
        </div>)}
      </dl>

      <h2>How to read these assessments</h2>
      <p>Categories come from the IUCN Red List as mirrored by FishBase, version {version}. The assessment date belongs to each species; older assessments may not reflect recent survey work, and a category is not a substitute for a local population count.</p>
      <p>A Red List category describes global extinction risk. It does not describe abundance in a particular reach, water quality, or the legality of catching a species. Basin associations on this site come from separate published surveys and are cited on each river page.</p>
      <p>Where a taxon has no published assessment, this page says so. Absence of a category is not evidence of stability.</p>
      <p>Read the <Link href="/method">method and evidence policy</Link>, or the <Link href="/field-guide">full field guide</Link>.</p>

      <h2>Questions</h2>
      <dl>{FAQ.map(entry => <div key={entry.question}>
        <dt>{entry.question}</dt>
        <dd>{entry.answer}</dd>
      </div>)}</dl>

      <p className="atlas-reviewed">Last reviewed {reviewed}.</p>
    </main>
    <SiteFooter />
  </div>;
}
