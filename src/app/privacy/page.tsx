import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE_ORIGIN } from '@/lib/reference';

export const metadata: Metadata = {
  title: 'Privacy',
  description: 'How Native Waters handles analytics, consent and the data it collects.',
  alternates: { canonical: `${SITE_ORIGIN}/privacy` },
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: '72ch', margin: '0 auto', padding: '2rem 1.5rem 4rem' }}>
      <nav aria-label="Breadcrumb" style={{ fontSize: '0.85rem', marginBottom: '1.5rem' }}>
        <Link href="/">Home</Link> / Privacy
      </nav>
      <h1>Privacy</h1>
      <p><em>Last reviewed: 16 November 2026.</em></p>

      <h2>What this site is</h2>
      <p>Native Waters is an open, sourced reference for native freshwater fishes of five Indian river systems, with an illustrative underwater experience. It is a static site with no accounts, no sign-in and no user-generated content.</p>

      <h2>Analytics</h2>
      <p>With your explicit consent, Google Analytics 4 (GA4) loads and records page views and a small set of interaction events (entering the underwater experience, selecting a fish, changing visual quality, viewing a species or basin). GA4 receives your approximate location derived from your IP address, your browser and device type, and the pages you visit. This site does not send GA4 any account, email or form data, because it collects none.</p>
      <p>Google processes that data under its own terms. See <a href="https://policies.google.com/privacy">Google&apos;s privacy policy</a>.</p>

      <h2>Consent</h2>
      <p>No analytics loads until you choose &quot;Accept analytics&quot; in the consent banner. Choosing &quot;Decline&quot; keeps every feature of the site working and sends nothing. Your choice is stored in your browser&apos;s local storage under <code>nw-analytics-consent</code> and can be changed by clearing that storage.</p>

      <h2>Vercel Analytics</h2>
      <p>Vercel Analytics is also enabled. It is cookieless and aggregate: it measures page views and performance without identifying individual visitors and does not require consent under most interpretations.</p>

      <h2>Cookies and storage</h2>
      <p>This site sets no first-party cookies. It writes one local-storage entry for your analytics consent choice (see above). Third parties such as Google may set their own cookies when analytics is enabled.</p>

      <h2>External links</h2>
      <p>The field guide links to external publications and biodiversity databases. Leaving this site means those sites&apos; own privacy policies apply.</p>

      <h2>Children</h2>
      <p>The site is an educational reference and is not directed at children under 13. It does not knowingly collect personal data from children.</p>

      <h2>Contact</h2>
      <p>Questions about this page or the data handling can be raised as an issue on the project&apos;s <a href="https://github.com/dewansh-shukla/native-waters">GitHub repository</a>. This policy is reviewed when the site&apos;s data practices change.</p>

      <p style={{ marginTop: '2rem' }}><Link href="/">Return to Native Waters</Link></p>
    </main>
  );
}
