import ReferenceLayout from '@/components/reference/ReferenceLayout';
import ScenePreview from '@/components/reference/ScenePreview';
import { Evidence, EvidencePolicy } from '@/components/reference/Evidence';
import { freshwaterCatalog as catalog } from '@/lib/catalog';
import { loadPipelineFixture } from '@/lib/content';
import { getSpecies, referenceMetadata } from '@/lib/reference';
import { JsonLd } from '@/components/seo/JsonLd';
import { Breadcrumbs } from '@/components/reference/Breadcrumbs';
import { taxonSchema, breadcrumbSchema } from '@/lib/structuredData';
import type { Crumb } from '@/lib/structuredData';
export const dynamicParams = false;
export function generateStaticParams() { return catalog.species.map(species => ({ slug: species.id })); }
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props) {
  const species = getSpecies((await params).slug);
  return referenceMetadata(species.commonName === species.scientificName ? species.scientificName : `${species.commonName} (${species.scientificName})`, species.summary, `/species/${species.id}`, { imagePath: `/species/${species.id}/opengraph-image` });
}
export default async function SpeciesPage({ params }: Props) {
  const species = getSpecies((await params).slug);
  const crumbs: Crumb[] = [{ name: 'Home', path: '/' }, { name: 'Field guide', path: '/field-guide' }, { name: species.commonName, path: `/species/${species.id}` }];
  return <ReferenceLayout visual={<ScenePreview fixture={loadPipelineFixture()} />}>
    <JsonLd data={[taxonSchema(species), breadcrumbSchema(crumbs)]} />
    <Breadcrumbs items={crumbs} />
    <h1>{species.commonName}</h1>
    {species.commonName !== species.scientificName && <p><i>{species.scientificName}</i></p>}
    {species.aliases.length > 0 && <p>Also called {species.aliases.join(', ')}.</p>}
    <p>{species.summary}</p>
    {species.associations.map(a => <Evidence key={a.riverId} association={a} />)}
    <h2>Habitat and distribution limits</h2><p>The record areas above identify the geographic context supported by the sources. They do not establish a species-specific substrate, flow preference or water-chemistry range. We leave those details unstated until species-level references are available.</p>
    <EvidencePolicy />
  </ReferenceLayout>;
}
