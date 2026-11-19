import Link from 'next/link';
import Experience from '@/components/Experience';
import { loadPipelineFixture } from '@/lib/content';
import { referenceMetadata } from '@/lib/reference';
import { DEFAULT_SPECIES } from '@/experience/species';
import { JsonLd } from '@/components/seo/JsonLd';
import { webApplicationSchema } from '@/lib/structuredData';
import styles from '../field-guide/page.module.css';
export const metadata = referenceMetadata('Illustrative underwater experience', 'A Cauvery map and an illustrative underwater experience with sourced southern-river species studies.', '/experience', { robots: { index: false, follow: true } });
export default function ExperiencePage() {
  return <main><JsonLd data={webApplicationSchema('Illustrative underwater experience', 'A Cauvery map and an illustrative underwater experience with sourced southern-river species studies.', '/experience')} /><Link className={styles.entry} href='/'>Return to river references</Link><Experience fixture={loadPipelineFixture()} species={DEFAULT_SPECIES} /></main>;
}
