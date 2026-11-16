import Link from 'next/link';
import type { Crumb } from '@/lib/structuredData';
import styles from './Breadcrumbs.module.css';

/** Visible page trail that mirrors the BreadcrumbList structured data. */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return <nav className={styles.crumbs} aria-label='Breadcrumb'>
    <ol>{items.map((item, index) => {
      const current = index === items.length - 1;
      return <li key={item.path}>
        {current ? <span aria-current='page'>{item.name}</span> : <Link href={item.path}>{item.name}</Link>}
      </li>;
    })}</ol>
  </nav>;
}
