import Link from 'next/link';
import { freshwaterCatalog as catalog, type Association } from '@/lib/catalog';
import styles from './ReferenceLayout.module.css';
export function Citations({ ids }: { ids: string[] }) {
  return <ul className={styles.citations}>{ids.map(id => {
    const source = catalog.sources.find(s => s.id === id)!;
    return <li key={id}><a href={source.url}>{source.title}</a><span>{source.published ? `Published ${source.published}. ` : 'Publication date not stated. '}Reviewed {source.accessed}.</span></li>;
  })}</ul>;
}
export function Evidence({ association }: { association: Association }) {
  const river = catalog.rivers.find(r => r.id === association.riverId)!;
  return <section className={styles.record}>
    <h2><Link href={`/basins/${river.id}`}>{river.name} basin record</Link></h2>
    <p className={styles.status}>{association.status === 'uncertain' ? 'Native status uncertain' : association.status === 'introduced' ? 'Introduced' : 'Native'}{association.basinEndemic ? ' · Basin endemic' : ''}</p>
    <dl><dt>Record area</dt><dd>{association.locality}</dd><dt>Evidence period</dt><dd>{association.evidencePeriod}</dd></dl>
    <p>{association.note}</p><Citations ids={association.sourceIds} />
  </section>;
}
export function EvidencePolicy() {
  return <section><h2>Understanding the evidence</h2><p>Occurrence records describe particular places and dates. They do not establish presence throughout a basin, present abundance or aquarium care requirements. Native status and basin endemism are separate claims.</p><p>Names follow the cited publications. Historical threat categories are not presented as current assessments. Locations remain coarse; this guide provides no collection directions.</p></section>;
}
