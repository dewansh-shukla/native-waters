import Link from 'next/link';
import { freshwaterCatalog as catalog } from '@/lib/catalog';
import { SITE_ORIGIN } from '@/lib/reference';
import { HomeSearch } from '@/components/home/HomeSearch';
import styles from './page.module.css';
import NextImage from 'next/image';
import { SiteHeader, SiteFooter } from '@/components/reference/SiteNavigation';
import { SpeciesPlate } from '@/components/reference/SpeciesPlate';
import { RiverSelector } from '@/components/home/RiverSelector';

export const metadata = {
  title: "Indian Freshwater Fishes & River Exploration | Native Waters",
  description: "Explore five Indian river basins in 3D and discover native freshwater fishes through sourced species profiles, distribution records and a crawlable field guide.",
  alternates: { canonical: SITE_ORIGIN },
  openGraph: {
    title: "Indian Freshwater Fishes & River Exploration | Native Waters",
    description: "Explore five Indian river basins in 3D and discover native freshwater fishes through sourced species profiles, distribution records and a field guide.",
    url: SITE_ORIGIN,
    type: 'website',
    siteName: 'Native Waters',
    locale: 'en',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: "Discover India's Hidden Freshwater World — Native Waters" }],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Indian Freshwater Fishes & River Exploration | Native Waters",
    description: "Explore five Indian river basins in 3D and discover native freshwater fishes through sourced species profiles and a field guide.",
  },
};

const FEATURED = ['labeo-rohita', 'dawkinsia-arulius', 'labeo-calbasu'];

export default function HomePage() {
  const featured = FEATURED.map(id => catalog.species.find(species => species.id === id)!);
  return <div className={`public-page ${styles.page}`}>
    <SiteHeader />
    <main id="main-content">
      <section className={styles.hero} aria-labelledby="hero-title">
        <div className={styles.heroSheet}>
          <h1 id="hero-title">India, beneath<br />the surface</h1>
          <p>Explore five river basins in 3D, then meet their freshwater fishes through sourced records.</p>
          <div className={`atlas-actions ${styles.actions}`}>
            <Link href="/experience" prefetch={false} className="atlas-button">Explore in 3D <span aria-hidden="true">↗</span></Link>
            <Link href="/field-guide">Discover species</Link>
          </div>
          <div className={styles.heroNote}>Five rivers. Thirteen fish records.<br />A different way to know our waters.</div>
        </div>
        <figure className={styles.heroMedia}>
          <NextImage src="/hero/indian-freshwater-fish.png" alt="Illustrative underwater artwork with freshwater fish, rocks and sunlit water" fill loading="eager" fetchPriority="high" sizes="(max-width: 700px) calc(100vw - 40px), 55vw" />
          <figcaption>Enter an illustrative underwater world</figcaption>
        </figure>
      </section>

      <section className={styles.rivers} id="rivers" aria-labelledby="rivers-title">
        <div className={styles.sectionIntro}>
          <h2 id="rivers-title">Choose your river</h2>
          <p>From the Ganga to the Cauvery, each basin opens a different chapter of freshwater life.</p>
        </div>
        <RiverSelector rivers={catalog.rivers} />
        <nav className={styles.basinLinks} aria-label="All basin guides">
          {catalog.rivers.map(river => <Link key={river.id} href={`/basins/${river.id}`}>{river.name} guide</Link>)}
        </nav>
      </section>

      <section className={styles.species} aria-labelledby="species-title">
        <div className={styles.sectionIntro}>
          <h2 id="species-title">Meet the river’s residents</h2>
          <div><p>Names, river associations and the sources behind them. Start with these records, then open the full field guide.</p><Link href="/field-guide">Browse all {catalog.species.length} species</Link></div>
        </div>
        <div className={styles.speciesShelf}>
          {featured.map(species => <article key={species.id}>
            <SpeciesPlate id={species.id} compact />
            <h3><Link href={`/species/${species.id}`}>{species.commonName}</Link></h3>
            <p><i>{species.scientificName}</i></p>
            <p>{species.summary}</p>
          </article>)}
        </div>
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
          <p>Our underwater worlds invite exploration. The field guide tells you what the cited evidence actually supports.</p>
          <Link href="/method" className="atlas-button">Read our method</Link>
        </div>
      </section>
    </main>
    <SiteFooter />
  </div>;
}
