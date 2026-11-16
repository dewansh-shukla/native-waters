import type { ReactNode } from 'react';
import styles from './ReferenceLayout.module.css';
import { SiteHeader, SiteFooter } from './SiteNavigation';

export default function ReferenceLayout({ visual, children }: { visual: ReactNode; children: ReactNode }) {
  return <div className="public-page">
    <SiteHeader />
    <main id="main-content" className={styles.layout}>
      <article id="river-reference" className={styles.panel} aria-label="River and species reference">{children}</article>
      <aside className={styles.visual} data-reference-visual aria-label="Optional underwater experience">{visual}</aside>
    </main>
    <SiteFooter />
  </div>;
}
