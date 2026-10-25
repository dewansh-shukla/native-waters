import ReferenceLayout from '@/components/reference/ReferenceLayout';
import ScenePreview from '@/components/reference/ScenePreview';
import { Evidence, EvidencePolicy } from '@/components/reference/Evidence';
import { freshwaterCatalog as catalog } from '@/lib/catalog';
import { loadPipelineFixture } from '@/lib/content';
import { getSpecies, referenceMetadata } from '@/lib/reference';
export const dynamicParams = false;
export function generateStaticParams() { return catalog.species.map(species => ({ slug: species.id })); }
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props) {
  const species = getSpecies((await params).slug);
  return referenceMetadata(species.commonName === species.scientificName ? species.scientificName : `${species.commonName} (${species.scientificName})`, species.summary, `/species/${species.id}`);
}
export default async function SpeciesPage({ params }: Props) {
  const species = getSpecies((await params).slug);
  return <ReferenceLayout visual={<ScenePreview fixture={loadPipelineFixture()} />}>
    <h1>{species.commonName}</h1>
    {species.commonName !== species.scientificName && <p><i>{species.scientificName}</i></p>}
    {species.aliases.length > 0 && <p>Also called {species.aliases.join(', ')}.</p>}
    <p>{species.summary}</p>
    {species.associations.map(a => <Evidence key={a.riverId} association={a} />)}
    <h2>Habitat and distribution limits</h2><p>The record areas above identify the geographic context supported by the sources. They do not establish a species-specific substrate, flow preference or water-chemistry range. We leave those details unstated until species-level references are available.</p>
    <EvidencePolicy />
  </ReferenceLayout>;
}
