import type { Metadata } from 'next';
import Link from 'next/link';
import { freshwaterCatalog as catalog } from '@/lib/catalog';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Indian river fish field guide | Native Waters',
  description: 'Explore sourced freshwater fish records from the Ganga, Brahmaputra, Cauvery, Krishna and Godavari, with basin-specific native status and survey context.',
  alternates: { canonical: 'https://native-waters.vercel.app/field-guide' },
  openGraph: {
    title: 'Indian river fish field guide | Native Waters',
    description: 'Five rivers, thirteen freshwater fishes, and the evidence behind their basin associations.',
    url: 'https://native-waters.vercel.app/field-guide', type: 'website',
  },
};

function Citations({ ids }: { ids: string[] }) {
  return <ul className={styles.citations}>{ids.map(id => {
    const source = catalog.sources.find(s => s.id === id)!;
    return <li key={id}><a href={source.url}>{source.title}</a>
      <span> {source.published ? `Published ${source.published}.` : 'Publication date not stated.'} Reviewed {source.accessed}.</span></li>;
  })}</ul>;
}

export default function FieldGuide() {
  return <main className={styles.guide}>
    <header className={styles.header}><Link href='/'>Native Waters</Link><a href='#reading-the-evidence'>How to read this guide</a></header>
    <section className={styles.intro}>
      <h1>Indian rivers,<br />one fish at a time.</h1>
      <p>Freshwater life belongs to particular waters. Explore a small, sourced selection of fishes and the river records that connect them.</p>
      <nav aria-label='Rivers in the field guide'>{catalog.rivers.map(river => <a key={river.id} href={`#${river.id}`}>{river.name}</a>)}</nav>
    </section>
    <aside id='reading-the-evidence' className={styles.method}>
      <h2>Read the river record, not just the species name</h2>
      <p><strong>Native</strong> means the cited evidence supports origin in that river system. <strong>Basin endemic</strong> means the source limits its natural range to that system. <strong>Native status uncertain</strong> means a record supports occurrence, but does not settle origin.</p>
      <p>This is a selected reference, not a complete checklist or a current population survey. Evidence dates describe the source, not a new sighting. We keep locations coarse and do not publish collection directions. Historical threat categories are omitted pending a current assessment check.</p>
      <p>The <Link href='/'>underwater experience</Link> is an illustrative visual study. These records do not identify its fish or certify its habitat.</p>
    </aside>
    {catalog.rivers.map(river => <section key={river.id} id={river.id} className={styles.river} aria-labelledby={`${river.id}-title`}>
      <div className={styles.riverIntro}>
        <h2 id={`${river.id}-title`}><Link href={`/basins/${river.id}`}>{river.name}</Link></h2>
        {river.aliases.length > 0 && <p>Also known as {river.aliases.join(', ')}</p>}
        <p>{river.summary}</p><p className={styles.scope}>{river.scope}</p>
        <Citations ids={river.sourceIds} />
      </div>
      <div className={styles.speciesList}>{catalog.species.flatMap(species => species.associations.filter(a => a.riverId === river.id).map(association =>
        <article key={species.id} id={species.id} className={styles.species}>
          <h3><Link href={`/species/${species.id}`}>{species.commonName}</Link></h3>
          {species.commonName !== species.scientificName && <p className={styles.scientific}><i>{species.scientificName}</i></p>}
          {species.aliases.length > 0 && <p>Also called {species.aliases.join(', ')}</p>}
          <p className={styles.status}>{association.status === 'uncertain' ? 'Native status uncertain' : association.status === 'introduced' ? 'Introduced' : 'Native'}{association.basinEndemic ? ' · Basin endemic' : ''}</p>
          <p>{species.summary}</p>
          <dl><dt>Record area</dt><dd>{association.locality}</dd><dt>Evidence period</dt><dd>{association.evidencePeriod}</dd></dl>
          <p>{association.note}</p><Citations ids={association.sourceIds} />
        </article>
      ))}</div>
    </section>)}
    <footer className={styles.footer}><p>Names follow the cited publications. Further taxonomic review may change names or distribution limits; this guide makes no claim to a complete current revision.</p><Link href='/'>Return to the underwater experience</Link></footer>
  </main>;
}
