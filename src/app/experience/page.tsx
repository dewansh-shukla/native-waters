import Link from 'next/link';
import Experience from '@/components/Experience';
import { loadPipelineFixture } from '@/lib/content';
import { referenceMetadata } from '@/lib/reference';
import { DEFAULT_SPECIES } from '@/experience/species';
import styles from '../field-guide/page.module.css';
export const metadata = referenceMetadata('Illustrative underwater experience', 'A Cauvery map and an illustrative underwater experience with sourced southern-river species studies.', '/experience');
export default function ExperiencePage() {
  return <main><Link className={styles.entry} href='/'>Return to river references</Link><Experience fixture={loadPipelineFixture()} species={DEFAULT_SPECIES} /></main>;
}
