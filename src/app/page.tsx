import Link from 'next/link';
import { freshwaterCatalog as catalog } from '@/lib/catalog';
import { SITE_ORIGIN } from '@/lib/reference';
import { HomeSearch } from '@/components/home/HomeSearch';
import styles from './page.module.css';
import NextImage from 'next/image';
import { SiteHeader, SiteFooter } from '@/components/reference/SiteNavigation';
import { SpeciesPlate } from '@/components/reference/SpeciesPlate';
import { RiverSelector } from '@/components/home/RiverSelector';
import { conservationSummary } from '@/lib/conservation';

export const metadata = {
  title: "Indian Freshwater Fish, River Basins & Species Guide | Native Waters",
  description: "Discover India's native freshwater fish and river ecosystems across the Ganga, Brahmaputra, Cauvery, Krishna and Godavari, with sourced species profiles, IUCN conservation status, basin records and a crawlable field guide.",
  alternates: { canonical: SITE_ORIGIN },
  openGraph: {
    title: "Indian Freshwater Fish, River Basins & Species Guide | Native Waters",
    description: "Discover India's native freshwater fish and river ecosystems through sourced species profiles, IUCN conservation status and basin records from five Indian rivers.",
    url: SITE_ORIGIN,
    type: 'website',
    siteName: 'Native Waters',
    locale: 'en',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: "Discover India's Hidden Freshwater World — Native Waters" }],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Indian Freshwater Fish, River Basins & Species Guide | Native Waters",
    description: "Discover India's native freshwater fish and river ecosystems through sourced species profiles, IUCN conservation status and basin records.",
  },
};

const FEATURED = ['labeo-rohita', 'dawkinsia-arulius', 'labeo-calbasu'];

export default function HomePage() {
  const featured = FEATURED.map(id => catalog.species.find(species => species.id === id)!);
  const conservation = conservationSummary();
  const basinNames = (speciesId: string) => {
    const species = catalog.species.find(entry => entry.id === speciesId);
    if (!species) return '';
    return species.associations
      .map(association => catalog.rivers.find(river => river.id === association.riverId)?.name)
      .filter((name): name is string => Boolean(name))
      .join(', ');
  };
  return <div className={`public-page ${styles.page}`}>
    <SiteHeader />
    <main id="main-content">
      <section className={styles.hero} aria-labelledby="hero-title">
        <div className={styles.heroSheet}>
          <h1 id="hero-title">India, beneath<br />the surface</h1>
          <p>Discover India’s freshwater fish and river ecosystems: five major river basins, thirteen sourced species profiles, IUCN conservation records and an illustrative 3D exploration of the waters they depend on.</p>
          <div className={`atlas-actions ${styles.actions}`}>
            <Link href="/experience" prefetch={false} className="atlas-button">Explore in 3D <span aria-hidden="true">↗</span></Link>
            <Link href="/field-guide">Discover species</Link>
          </div>
          <div className={styles.heroNote}>Five rivers. Thirteen fish records.<br />Native, endemic and introduced species kept distinct.<br />A different way to know our waters.</div>
        </div>
        <figure className={styles.heroMedia}>
          <NextImage src="/hero/indian-freshwater-fish.png" alt="Illustrative underwater artwork with freshwater fish, rocks and sunlit water" fill loading="eager" fetchPriority="high" sizes="(max-width: 700px) calc(100vw - 40px), 55vw" />
          <figcaption>Enter an illustrative underwater world</figcaption>
        </figure>
      </section>

      <section className={styles.rivers} id="rivers" aria-labelledby="rivers-title">
        <div className={styles.sectionIntro}>
          <h2 id="rivers-title">India’s major river basins</h2>
          <p>India’s rivers hold a wide range of freshwater habitats, from Himalayan headwaters to peninsular rivers. The Ganga, Brahmaputra, Cauvery, Krishna and Godavari differ in geography, flow and habitat, and so do the species documented in each. Choose a basin to see its recorded freshwater fish, the evidence behind every river association and the sources each record rests on.</p>
        </div>
        <RiverSelector rivers={catalog.rivers} />
        <nav className={styles.basinLinks} aria-label="All basin guides">
          {catalog.rivers.map(river => <Link key={river.id} href={`/basins/${river.id}`}>{river.name} guide</Link>)}
        </nav>
      </section>

      <section className={styles.species} aria-labelledby="species-title">
        <div className={styles.sectionIntro}>
          <h2 id="species-title">India’s freshwater fish species</h2>
          <div><p>Each profile gives the common and scientific name, the river basin where the species is documented, its IUCN Red List category and the sources behind the record. A record does not by itself prove native status, so the field guide states whether a species is native, basin-endemic, introduced or of uncertain status.</p><Link href="/field-guide">Browse all {catalog.species.length} species</Link></div>
        </div>
        <div className={styles.speciesShelf}>
          {featured.map(species => <article key={species.id}>
            <SpeciesPlate id={species.id} compact />
            <h3><Link href={`/species/${species.id}`}>{species.commonName}</Link></h3>
            <p><i>{species.scientificName}</i></p>
            <p>{basinNames(species.id)} · {species.facts.conservation.label}</p>
            <p>{species.summary}</p>
          </article>)}
        </div>
      </section>

      <section className={styles.conservation} aria-labelledby="conservation-title">
        <div>
          <h2 id="conservation-title">{conservation.threatened} of {conservation.total} are threatened</h2>
          <p>{conservation.criticallyEndangered} Critically Endangered and {conservation.endangered} Endangered species share these rivers with {conservation.leastConcern} assessed as Least Concern. Every record carries its Red List category and assessment date. {conservation.notEvaluated} {conservation.notEvaluated === 1 ? 'species is' : 'species are'} Not Evaluated, which means {conservation.notEvaluated === 1 ? 'it has' : 'they have'} not been assessed against the Red List criteria — not that {conservation.notEvaluated === 1 ? 'it is' : 'they are'} safe.</p>
          <Link href="/conservation" className="atlas-button">See conservation status <span aria-hidden="true">→</span></Link>
        </div>
        <dl className={styles.conservationStats}>
          <div className={styles.conservationStat}><strong>{conservation.criticallyEndangered}</strong><span>Critically Endangered</span></div>
          <div className={styles.conservationStat}><strong>{conservation.endangered}</strong><span>Endangered</span></div>
          <div className={styles.conservationStat}><strong>{conservation.notEvaluated}</strong><span>Not Evaluated</span></div>
        </dl>
      </section>

      <section className={styles.search} aria-labelledby="search-title">
        <h2 id="search-title">Find a fish or river</h2>
        <HomeSearch />
      </section>

      <section className={styles.evidence} aria-labelledby="evidence-title">
        <figure>
          <NextImage src="/atlas/rapids-kaveri-doddegaudana-koppalu-mandya-aug24-a7cr.jpg" alt="Water flowing over rocks in the Kaveri at Mandya, photographed in August 2024" width={1920} height={1080} sizes="(max-width: 700px) 100vw, 50vw" />
          <figcaption>Kaveri rapids, Mandya. Photograph by Timothy A. Gonsalves.</figcaption>
        </figure>
        <div>
          <h2 id="evidence-title">Curiosity, with evidence</h2>
          <p>A fish recorded in a river is not always native to it. A historical survey is not a new sighting. Every record keeps that context attached.</p>
          <p>A <strong>native</strong> species occurs in a basin without human introduction. An <strong>endemic</strong> species is native to one area and found nowhere else — several Cauvery records in this guide are basin-endemic. An <strong>introduced</strong> species was brought into a basin, deliberately or not, and may compete with native fish. A <strong>threatened</strong> species is one the IUCN Red List assesses as Vulnerable, Endangered or Critically Endangered.</p>
          <p>Our underwater worlds invite exploration. The <Link href="/field-guide">field guide</Link> records what the cited evidence supports for each species, and the <Link href="/conservation">conservation overview</Link> explains every Red List category.</p>
          <Link href="/method" className="atlas-button">Read our method</Link>
        </div>
      </section>
    </main>
    <SiteFooter />
  </div>;
}
