import Link from 'next/link';
import ReferenceLayout from '@/components/reference/ReferenceLayout';
import ScenePreview from '@/components/reference/ScenePreview';
import { Citations, EvidencePolicy } from '@/components/reference/Evidence';
import { freshwaterCatalog as catalog } from '@/lib/catalog';
import { loadPipelineFixture } from '@/lib/content';
import { getRiver, referenceMetadata } from '@/lib/reference';
export const dynamicParams = false;
export function generateStaticParams() { return catalog.rivers.map(river => ({ slug: river.id })); }
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props) {
  const river = getRiver((await params).slug);
  return referenceMetadata(`${river.name} river basin and freshwater fishes`, river.summary, `/basins/${river.id}`);
}
export default async function BasinPage({ params }: Props) {
  const river = getRiver((await params).slug);
  const species = catalog.species.filter(s => s.associations.some(a => a.riverId === river.id));
  return <ReferenceLayout visual={<ScenePreview fixture={loadPipelineFixture()} />}>
    <h1>{river.name} river basin</h1>
    {river.aliases.length > 0 && <p>Also known as {river.aliases.join(', ')}.</p>}
    <p>{river.summary}</p><h2>Where the evidence applies</h2><p>{river.scope}</p><Citations ids={river.sourceIds} />
    <h2>Freshwater fish records</h2><p>A selected starting point, not a complete basin checklist.</p>
    <ul>{species.map(s => <li key={s.id}><Link href={`/species/${s.id}`}>{s.commonName}</Link>{s.commonName !== s.scientificName && <> (<i>{s.scientificName}</i>)</>}<p>{s.summary}</p></li>)}</ul>
    <EvidencePolicy />
    <h2>Explore other rivers</h2><ul>{catalog.rivers.filter(r => r.id !== river.id).map(r => <li key={r.id}><Link href={`/basins/${r.id}`}>{r.name}</Link></li>)}</ul>
  </ReferenceLayout>;
}
