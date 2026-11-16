import Link from 'next/link';
import ReferenceLayout from '@/components/reference/ReferenceLayout';
import ScenePreview from '@/components/reference/ScenePreview';
import { Evidence, EvidencePolicy } from '@/components/reference/Evidence';
import { freshwaterCatalog as catalog } from '@/lib/catalog';
import { loadPipelineFixture } from '@/lib/content';
import { siblingSpecies } from '@/lib/catalogSummary';
import { getSpecies, referenceMetadata, SITE_ORIGIN, CONTENT_UPDATED_AT } from '@/lib/reference';
import { JsonLd } from '@/components/seo/JsonLd';
import { Breadcrumbs } from '@/components/reference/Breadcrumbs';
import { taxonSchema, breadcrumbSchema, articleSchema, speakableSchema } from '@/lib/structuredData';
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
  const siblings = [...new Map(species.associations.flatMap(association => siblingSpecies(association.riverId, species.id)).map(sibling => [sibling.id, sibling])).values()];
  const association = species.associations[0];
  const basinRiver = association ? catalog.rivers.find(r => r.id === association.riverId) : undefined;
  const statusWord = association?.status === 'uncertain' ? 'an uncertain native status' : association?.status === 'introduced' ? 'introduced' : 'native';
  const tldr = basinRiver
    ? `${species.commonName} (${species.scientificName}) is recorded as ${statusWord} in the ${basinRiver.name} basin, per the cited evidence.`
    : species.summary;
  const reviewed = CONTENT_UPDATED_AT.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const reviewedIso = CONTENT_UPDATED_AT.toISOString();
  return <ReferenceLayout visual={<ScenePreview fixture={loadPipelineFixture()} />}>
    <JsonLd data={[taxonSchema(species), breadcrumbSchema(crumbs), articleSchema({ title: species.commonName === species.scientificName ? species.scientificName : `${species.commonName} (${species.scientificName})`, description: species.summary, url: `${SITE_ORIGIN}/species/${species.id}`, datePublished: reviewedIso, dateModified: reviewedIso }), speakableSchema(['[data-speakable]'])]} />
    <Breadcrumbs items={crumbs} />
    <h1>{species.commonName}</h1>
    <p data-speakable style={{ fontSize: '1.05rem', lineHeight: 1.5, color: '#a9c4bd', borderLeft: '3px solid #8fb3ab', paddingLeft: '1rem', margin: '0 0 1.25rem' }}>{tldr}</p>
    {species.commonName !== species.scientificName && <p><i>{species.scientificName}</i></p>}
    {species.aliases.length > 0 && <p>Also called {species.aliases.join(', ')}.</p>}
    <p>{species.summary}</p>
    {species.associations.map(a => <Evidence key={a.riverId} association={a} />)}
    <h2>Habitat and distribution limits</h2><p>The record areas above identify the geographic context supported by the sources. They do not establish a species-specific substrate, flow preference or water-chemistry range. We leave those details unstated until species-level references are available.</p>
    {siblings.length > 0 && <section aria-labelledby='related-species'>
      <h2 id='related-species'>Other species recorded in the same basin</h2>
      <ul>{siblings.map(sibling => <li key={sibling.id}><Link href={`/species/${sibling.id}`}>{sibling.commonName}</Link>{sibling.commonName !== sibling.scientificName && <> (<i>{sibling.scientificName}</i>)</>}</li>)}</ul>
      <p>These records come from the same basin in this guide. A shared basin does not imply the same habitat, survey or current status.</p>
    </section>}
    <EvidencePolicy />
    <p style={{ fontSize: '0.8rem', color: '#5f7d78', margin: '1.5rem 0 0' }}>Last reviewed {reviewed}.</p>
  </ReferenceLayout>;
}
