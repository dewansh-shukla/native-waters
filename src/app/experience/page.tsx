import Link from 'next/link';
import Experience from '@/components/Experience';
import { loadPipelineFixture } from '@/lib/content';
import { referenceMetadata } from '@/lib/reference';
import styles from '../field-guide/page.module.css';
export const metadata = referenceMetadata('Illustrative underwater experience', 'A Cauvery map and polar-parrot reference study, separate from verified river and species records.', '/experience');
export default function ExperiencePage() {
  return <main><Link className={styles.entry} href='/'>Return to river references</Link><Experience fixture={loadPipelineFixture()} /></main>;
}
