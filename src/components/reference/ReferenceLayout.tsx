import Link from 'next/link';
import type { ReactNode } from 'react';
import styles from './ReferenceLayout.module.css';

export default function ReferenceLayout({ visual, children }: { visual: ReactNode; children: ReactNode }) {
  return <main className={styles.layout}>
    <div className={styles.visual} data-reference-visual>{visual}</div>
    <section className={styles.panel} aria-label='River and species reference' tabIndex={0}>
      <nav aria-label='Reference navigation'><Link href='/'>Native Waters</Link><Link href='/field-guide'>Field guide</Link><Link href='/experience'>Full-screen experience</Link></nav>
      {children}
    </section>
  </main>;
}
