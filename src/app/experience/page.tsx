import Link from 'next/link';
import Experience from '@/components/Experience';
import { loadPipelineFixture } from '@/lib/content';
import { referenceMetadata } from '@/lib/reference';
import { DEFAULT_SPECIES } from '@/experience/species';
import { JsonLd } from '@/components/seo/JsonLd';
import { webApplicationSchema } from '@/lib/structuredData';
import styles from '../field-guide/page.module.css';
export const metadata = referenceMetadata('Illustrative underwater experience', 'An interactive, illustrative underwater experience of the Cauvery basin, paired with sourced freshwater fish records from the Native Waters reference.', '/experience');
export default function ExperiencePage() {
  return <main>
    <JsonLd data={webApplicationSchema('Illustrative underwater experience', 'An interactive, illustrative underwater experience of the Cauvery basin, paired with sourced freshwater fish records from the Native Waters reference.', '/experience')} />
    <h1>Illustrative underwater experience</h1>
    <p>This page hosts an interactive, illustrative underwater scene of the Cauvery basin. The 3D habitat is an artistic reconstruction, not a verified survey: it exists to help you picture the setting behind the sourced fish records on this site.</p>
    <p>The species shown in the scene are drawn from the <Link href='/basins/cauvery'>Cauvery basin record</Link>. Each record lists its status (native, introduced, or uncertain), the surveyed area, the evidence period, and the cited sources. Browse the full set in the <Link href='/field-guide'>field guide</Link>, or open a basin to read its evidence:</p>
    <ul>
      <li><Link href='/basins/ganga'>Ganga basin</Link></li>
      <li><Link href='/basins/brahmaputra'>Brahmaputra basin</Link></li>
      <li><Link href='/basins/cauvery'>Cauvery basin</Link></li>
      <li><Link href='/basins/krishna'>Krishna basin</Link></li>
      <li><Link href='/basins/godavari'>Godavari basin</Link></li>
    </ul>
    <p>Species featured in the scene include <Link href='/species/labeo-rohita'>Rohu</Link>, <Link href='/species/dawkinsia-arulius'>Arulius barb</Link>, and <Link href='/species/labeo-calbasu'>Calbasu</Link>. Every record on this site is sourced and evidence-limited; see the <Link href='/method'>method and evidence policy</Link> for how native status and coarse locations are interpreted.</p>
    <Link className={styles.entry} href='/'>Return to river references</Link>
    <Experience fixture={loadPipelineFixture()} species={DEFAULT_SPECIES} />
  </main>;
}
