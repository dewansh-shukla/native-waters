'use client';
import Link from 'next/link';
import { useState } from 'react';
import type { ReactNode } from 'react';
import styles from './ReferenceLayout.module.css';

export default function ReferenceLayout({ visual, children }: { visual: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(true);
  return <main className={open ? styles.layout : `${styles.layout} ${styles.closed}`}>
    <div className={styles.visual} data-reference-visual>{visual}</div>
    <section id='river-reference' className={styles.panel} aria-label='River and species reference' tabIndex={0} hidden={!open}>
      <nav aria-label='Reference navigation'><Link href='/'>Native Waters</Link><Link href='/field-guide'>Field guide</Link><Link href='/experience'>Full-screen experience</Link>
        <button
          type='button'
          className={styles.close}
          aria-label='Close river reference'
          aria-expanded={open}
          aria-controls='river-reference'
          onClick={() => setOpen(false)}
        >✕</button>
      </nav>
      {children}
    </section>
    {!open && <button
      type='button'
      className={styles.reopen}
      aria-label='Open river reference'
      aria-controls='river-reference'
      onClick={() => setOpen(true)}
    >Reference</button>}
  </main>;
}
