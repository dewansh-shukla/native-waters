import Link from 'next/link';
import ReferenceLayout from '@/components/reference/ReferenceLayout';
import ScenePreview from '@/components/reference/ScenePreview';
import { Citations, EvidencePolicy } from '@/components/reference/Evidence';
import { freshwaterCatalog as catalog } from '@/lib/catalog';
import { loadPipelineFixture } from '@/lib/content';
import { getRiver, referenceMetadata } from '@/lib/reference';
import { basinRoster, basinSummarySentence } from '@/lib/catalogSummary';
import { JsonLd } from '@/components/seo/JsonLd';
import { Breadcrumbs } from '@/components/reference/Breadcrumbs';
import { bodyOfWaterSchema, breadcrumbSchema } from '@/lib/structuredData';
import type { Crumb } from '@/lib/structuredData';
import { RIVER_LABELS } from '@/experience/geography';
export const dynamicParams = false;
export function generateStaticParams() { return catalog.rivers.map(river => ({ slug: river.id })); }
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props) {
  const river = getRiver((await params).slug);
  return referenceMetadata(`${river.name} river basin and freshwater fishes`, river.summary, `/basins/${river.id}`, { imagePath: `/basins/${river.id}/opengraph-image` });
}
export default async function BasinPage({ params }: Props) {
  const river = getRiver((await params).slug);
  const species = catalog.species.filter(s => s.associations.some(a => a.riverId === river.id));
  const crumbs: Crumb[] = [{ name: 'Home', path: '/' }, { name: 'Field guide', path: '/field-guide' }, { name: river.name, path: `/basins/${river.id}` }];
  const point = RIVER_LABELS.find(label => label.name === river.name)?.point;
  const roster = basinRoster(river.id);
  return <ReferenceLayout visual={<ScenePreview fixture={loadPipelineFixture()} river={river.id} />}>
    <JsonLd data={[bodyOfWaterSchema(river, point), breadcrumbSchema(crumbs)]} />
    <Breadcrumbs items={crumbs} />
    <h1>{river.name} river basin</h1>
    {river.aliases.length > 0 && <p>Also known as {river.aliases.join(', ')}.</p>}
    <p>{river.summary}</p><h2>Where the evidence applies</h2><p>{river.scope}</p><Citations ids={river.sourceIds} />
    <section aria-labelledby='basin-roster'>
      <h2 id='basin-roster'>What this guide holds for the {river.name}</h2>
      <p>{basinSummarySentence(river, roster)}</p>
      {roster.evidencePeriods.length > 0 && <p>Evidence periods in the records: {roster.evidencePeriods.join('; ')}.</p>}
      <p>Read the <Link href={`/field-guide#${river.id}`}>full {river.name} entries in the field guide</Link>, or browse the individual records below.</p>
    </section>
    <h2>Freshwater fish records</h2><p>A selected starting point, not a complete basin checklist.</p>
    <ul>{species.map(s => <li key={s.id}><Link href={`/species/${s.id}`}>{s.commonName}</Link>{s.commonName !== s.scientificName && <> (<i>{s.scientificName}</i>)</>}<p>{s.summary}</p></li>)}</ul>
    <EvidencePolicy />
    <h2>Explore other rivers</h2><ul>{catalog.rivers.filter(r => r.id !== river.id).map(r => <li key={r.id}><Link href={`/basins/${r.id}`}>{r.name}</Link></li>)}</ul>
  </ReferenceLayout>;
}
