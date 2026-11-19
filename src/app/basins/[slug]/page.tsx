import Link from 'next/link';
import ReferenceLayout from '@/components/reference/ReferenceLayout';
import ScenePreview from '@/components/reference/ScenePreview';
import { Citations, EvidencePolicy } from '@/components/reference/Evidence';
import { freshwaterCatalog as catalog } from '@/lib/catalog';
import { loadPipelineFixture } from '@/lib/content';
import { getRiver, referenceMetadata, SITE_ORIGIN, CONTENT_UPDATED_AT } from '@/lib/reference';
import { basinRoster, basinSummarySentence } from '@/lib/catalogSummary';
import { JsonLd } from '@/components/seo/JsonLd';
import { Breadcrumbs } from '@/components/reference/Breadcrumbs';
import { bodyOfWaterSchema, breadcrumbSchema, articleSchema } from '@/lib/structuredData';
import type { Crumb } from '@/lib/structuredData';
import { RIVER_LABELS } from '@/experience/geography';
export const dynamicParams = false;
export function generateStaticParams() { return catalog.rivers.map(river => ({ slug: river.id })); }
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props) {
  const river = getRiver((await params).slug);
  return referenceMetadata(`${river.name} river basin and freshwater fishes`, river.summary, `/basins/${river.id}`, { imagePath: `/basins/${river.id}/opengraph-image`, openGraphType: 'article' });
}
export default async function BasinPage({ params }: Props) {
  const river = getRiver((await params).slug);
  const species = catalog.species.filter(s => s.associations.some(a => a.riverId === river.id));
  const crumbs: Crumb[] = [{ name: 'Home', path: '/' }, { name: 'Field guide', path: '/field-guide' }, { name: river.name, path: `/basins/${river.id}` }];
  const point = RIVER_LABELS.find(label => label.name === river.name)?.point;
  const roster = basinRoster(river.id);
  const reviewed = CONTENT_UPDATED_AT.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const reviewedIso = CONTENT_UPDATED_AT.toISOString();
  return <ReferenceLayout visual={<ScenePreview fixture={loadPipelineFixture()} river={river.id} />}>
    <JsonLd data={[bodyOfWaterSchema(river, point), breadcrumbSchema(crumbs), articleSchema({ title: `${river.name} river basin and freshwater fishes`, description: river.summary, url: `${SITE_ORIGIN}/basins/${river.id}`, dateModified: reviewedIso })]} />
    <Breadcrumbs items={crumbs} />
    <h1>{river.name} river basin</h1>
    <p className="atlas-summary">{basinSummarySentence(river, roster)}</p>
    <div className="atlas-actions"><a className="atlas-button" href="#river-experience">Explore {river.name} in 3D</a><a href="#basin-species">Discover basin species</a></div>
    {river.aliases.length > 0 && <p>Also known as {river.aliases.join(', ')}.</p>}
    <p>{river.summary}</p><h2>Where the evidence applies</h2><p>{river.scope}</p><Citations ids={river.sourceIds} />
    <section aria-labelledby='basin-roster'>
      <h2 id='basin-roster'>The basin record</h2>
      {roster.evidencePeriods.length > 0 && <p>Evidence periods in the records: {roster.evidencePeriods.join('; ')}.</p>}
      <p>The {river.name} basin record in this guide covers {roster.total} species: {roster.native} recorded as native, {roster.introduced} as introduced, {roster.uncertain} with uncertain native status, and {roster.endemic} as basin-endemic. These counts come from the cited associations; they are not a complete basin checklist.</p>
      <p>Read the <Link href={`/field-guide#${river.id}`}>full {river.name} entries in the field guide</Link>, or browse the individual records below.</p>
    </section>
    <section aria-labelledby='basin-questions'>
      <h2 id='basin-questions'>Questions this basin record raises</h2>
      <h3>Which fish are recorded as native to the {river.name}?</h3>
      <p>{roster.native === 0 ? 'No species in this record is marked native.' : `The records mark ${roster.species.filter(s => s.associations.find(a => a.riverId === river.id)?.status === 'native').map(s => s.commonName).join(', ')} as native to the ${river.name} basin.`} Native status here follows the cited sources and does not imply presence throughout the basin.</p>
      <h3>Is this a complete list of {river.name} fishes?</h3>
      <p>No. This is a selected starting point, not a complete basin checklist. Records describe particular places and dates from cited surveys; they do not establish presence throughout the basin or current abundance.</p>
      <h3>What does basin-endemic mean in this record?</h3>
      <p>A basin-endemic species is recorded as restricted to the {river.name} basin in the cited sources. {roster.endemic === 0 ? 'No species in this record is marked basin-endemic.' : `${roster.endemic} ${roster.endemic === 1 ? 'species is' : 'species are'} marked basin-endemic.`} Endemism is a separate claim from native status.</p>
    </section>
    <h2 id="basin-species">Freshwater fish records</h2><p>A selected starting point, not a complete basin checklist.</p>
    <ul>{species.map(s => <li key={s.id}><Link href={`/species/${s.id}`}>{s.commonName}</Link>{s.commonName !== s.scientificName && <> (<i>{s.scientificName}</i>)</>}<p>{s.summary}</p></li>)}</ul>
    <EvidencePolicy />
    <h2>Explore other rivers</h2><ul>{catalog.rivers.filter(r => r.id !== river.id).map(r => <li key={r.id}><Link href={`/basins/${r.id}`}>{r.name}</Link></li>)}</ul>
    <p className="atlas-reviewed">Last reviewed {reviewed}.</p>
  </ReferenceLayout>;
}
