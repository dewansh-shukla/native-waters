import Link from 'next/link';
import { freshwaterCatalog as catalog } from '@/lib/catalog';
import { SITE_ORIGIN } from '@/lib/reference';
import { HomeSearch } from '@/components/home/HomeSearch';
import styles from './page.module.css';

export const metadata = {
  title: "Discover India's Hidden Freshwater World",
  description: "Explore India's rivers, discover extraordinary native fish species, and learn about the biodiversity beneath our waters.",
  alternates: { canonical: '/' },
  openGraph: {
    title: "Discover India's Hidden Freshwater World",
    description: "Explore India's rivers, discover extraordinary native fish species, and learn about the biodiversity beneath our waters.",
    url: SITE_ORIGIN,
    type: 'website',
    siteName: 'Native Waters',
    locale: 'en',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: "Discover India's Hidden Freshwater World — Native Waters" }],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Discover India's Hidden Freshwater World",
    description: "Explore India's rivers, discover extraordinary native fish species, and learn about the biodiversity beneath our waters.",
  },
};

const FEATURED = [
  { id: 'labeo-rohita', basin: 'ganga' },
  { id: 'tor-remadevii', basin: 'cauvery' },
  { id: 'dawkinsia-arulius', basin: 'cauvery' },
  { id: 'badis-blosyrus', basin: 'brahmaputra' },
];

const STATUS_LABEL: Record<string, string> = {
  native: 'Native',
  introduced: 'Introduced',
  uncertain: 'Native status uncertain',
};

export default function HomePage() {
  const featured = FEATURED.map(({ id }) => catalog.species.find(s => s.id === id)).filter(Boolean) as typeof catalog.species;
  const rivers = catalog.rivers;

  return (
    <div className={styles.page}>
      <section className={styles.hero} aria-labelledby="hero-title">
        <div
          className={styles.heroImage}
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              "linear-gradient(180deg, rgba(16,28,30,0.35) 0%, rgba(16,28,30,0.85) 70%, #101c1e 100%), url(/hero/indian-freshwater-fish.jpg)",
            backgroundSize: 'cover',
            backgroundPosition: 'center 30%',
          }}
          role="img"
          aria-label="An Indian freshwater fish in clear river water"
        />
        <div className={styles.overlay} aria-hidden="true" />
        <div className={styles.heroInner}>
          <span className={styles.eyebrow}>Native Waters</span>
          <h1 id="hero-title" className={styles.heroTitle}>
            Discover India&apos;s Hidden Freshwater World
          </h1>
          <p className={styles.heroSub}>
            Explore India&apos;s rivers, discover extraordinary native fish species, and learn about the biodiversity beneath our waters.
          </p>
          <div className={styles.ctaRow}>
            <Link href="/field-guide" className={styles.ctaPrimary}>
              Explore Rivers
            </Link>
            <Link href="/field-guide" className={styles.ctaSecondary}>
              Discover Fish
            </Link>
          </div>
          <Link href="/experience" className={styles.experienceLink}>
            Try the immersive experience &rarr;
          </Link>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="search-title">
        <h2 id="search-title" className={styles.sectionTitle}>
          Search fish, rivers or species
        </h2>
        <p className={styles.sectionIntro}>
          Jump straight to a species or river record.
        </p>
        <div className={styles.searchWrap}>
          <HomeSearch />
        </div>
      </section>

      <section className={styles.section} aria-labelledby="featured-title">
        <h2 id="featured-title" className={styles.sectionTitle}>
          Featured fish
        </h2>
        <p className={styles.sectionIntro}>
          A small selection of native species from the sourced field guide.
        </p>
        <div className={styles.cardGrid}>
          {featured.map(species => {
            const association = species.associations[0];
            const river = association ? catalog.rivers.find(r => r.id === association.riverId) : undefined;
            return (
              <Link key={species.id} href={`/species/${species.id}`} className={styles.card}>
                <h3 className={styles.cardName}>{species.commonName}</h3>
                {species.commonName !== species.scientificName && (
                  <p className={styles.cardSci}>{species.scientificName}</p>
                )}
                <p className={styles.cardMeta}>
                  {river ? river.name : 'Indian river'} basin
                </p>
                {association && (
                  <span className={styles.cardStatus}>
                    {STATUS_LABEL[association.status] ?? association.status}
                    {association.basinEndemic ? ' · Basin endemic' : ''}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
        <p style={{ marginTop: '1.5rem' }}>
          <Link href="/field-guide" style={{ color: '#8fb3ab', textDecoration: 'none', borderBottom: '1px solid currentColor' }}>
            View all species in the field guide &rarr;
          </Link>
        </p>
      </section>

      <section className={styles.section} aria-labelledby="rivers-title">
        <h2 id="rivers-title" className={styles.sectionTitle}>
          Popular river guides
        </h2>
        <p className={styles.sectionIntro}>
          Sourced records for five Indian river systems.
        </p>
        <div className={styles.cardGrid}>
          {rivers.map(river => (
            <Link key={river.id} href={`/basins/${river.id}`} className={styles.riverCard}>
              <h3 className={styles.riverName}>{river.name}</h3>
              <p className={styles.riverSummary}>{river.summary}</p>
            </Link>
          ))}
        </div>
      </section>

      <footer className={styles.footer}>
        <Link href="/field-guide">Field guide</Link>
        <Link href="/method">Method</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/experience">Immersive experience</Link>
      </footer>
    </div>
  );
}
