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
import { taxonSchema, breadcrumbSchema, articleSchema } from '@/lib/structuredData';
import type { Crumb } from '@/lib/structuredData';
import { SpeciesPlate } from '@/components/reference/SpeciesPlate';
export const dynamicParams = false;
export function generateStaticParams() { return catalog.species.map(species => ({ slug: species.id })); }
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props) {
  const species = getSpecies((await params).slug);
  return referenceMetadata(species.commonName === species.scientificName ? species.scientificName : `${species.commonName} (${species.scientificName})`, species.summary, `/species/${species.id}`, { imagePath: `/species/${species.id}/opengraph-image`, openGraphType: 'article' });
}
export default async function SpeciesPage({ params }: Props) {
  const species = getSpecies((await params).slug);
  const crumbs: Crumb[] = [{ name: 'Home', path: '/' }, { name: 'Field guide', path: '/field-guide' }, { name: species.commonName, path: `/species/${species.id}` }];
  const siblings = [...new Map(species.associations.flatMap(association => siblingSpecies(association.riverId, species.id)).map(sibling => [sibling.id, sibling])).values()];
  const association = species.associations[0];
  const basinRiver = association ? catalog.rivers.find(r => r.id === association.riverId) : undefined;
  const statusWord = association?.status === 'uncertain' ? 'with uncertain native status' : association?.status === 'introduced' ? 'as introduced' : 'as native';
  const tldr = basinRiver
    ? `${species.commonName} is recorded ${statusWord} in the ${basinRiver.name} basin, per the cited evidence.`
    : species.summary;
  const reviewed = CONTENT_UPDATED_AT.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const reviewedIso = CONTENT_UPDATED_AT.toISOString();
  return <ReferenceLayout visual={<ScenePreview fixture={loadPipelineFixture()} river={basinRiver?.id} />}>
    <JsonLd data={[taxonSchema(species), breadcrumbSchema(crumbs), articleSchema({ title: species.commonName === species.scientificName ? species.scientificName : `${species.commonName} (${species.scientificName})`, description: species.summary, url: `${SITE_ORIGIN}/species/${species.id}`, dateModified: reviewedIso })]} />
    <Breadcrumbs items={crumbs} />
    <h1>{species.commonName}</h1>
    <p className="atlas-summary">{tldr}</p>
    {species.commonName !== species.scientificName && <p><i>{species.scientificName}</i></p>}
    {species.aliases.length > 0 && <p>Also called {species.aliases.join(', ')}.</p>}
    {basinRiver && <div className="atlas-actions"><Link className="atlas-button" href={`/basins/${basinRiver.id}`}>Explore the {basinRiver.name}</Link><a href="#river-experience">Open the 3D exhibit</a></div>}
    <SpeciesPlate id={species.id} />
    <p>{species.summary}</p>
    <section aria-labelledby="record-facts">
      <h2 id="record-facts">Record facts</h2>
      <dl>
        <dt>Scientific name</dt><dd><i>{species.scientificName}</i></dd>
        <dt>Common name</dt><dd>{species.commonName}</dd>
        {species.aliases.length > 0 && <><dt>Also called</dt><dd>{species.aliases.join(', ')}</dd></>}
        {species.associations.map(a => {
          const r = catalog.rivers.find(river => river.id === a.riverId);
          return r ? <><dt>{r.name} basin status</dt><dd>{a.status === 'uncertain' ? 'Native status uncertain' : a.status === 'introduced' ? 'Introduced' : 'Native'}{a.basinEndemic ? ' (basin endemic)' : ''}</dd><dt>Record area</dt><dd>{a.locality}</dd><dt>Evidence period</dt><dd>{a.evidencePeriod}</dd></> : null;
        })}
      </dl>
    </section>
    {species.associations.map(a => <Evidence key={a.riverId} association={a} />)}
    <h2>Habitat &amp; range limits</h2><p>The record areas above identify the geographic context supported by the sources. They do not establish a species-specific substrate, flow preference or water-chemistry range. We leave those details unstated until species-level references are available.</p>
    {siblings.length > 0 && <section aria-labelledby='related-species'>
      <h2 id='related-species'>From the same basin</h2>
      <ul>{siblings.map(sibling => <li key={sibling.id}><Link href={`/species/${sibling.id}`}>{sibling.commonName}</Link>{sibling.commonName !== sibling.scientificName && <> (<i>{sibling.scientificName}</i>)</>}</li>)}</ul>
      <p>These records come from the same basin in this guide. A shared basin does not imply the same habitat, survey or current status.</p>
    </section>}
    <section aria-labelledby="record-questions">
      <h2 id="record-questions">Questions this record raises</h2>
      {species.associations.map(a => {
        const r = catalog.rivers.find(river => river.id === a.riverId);
        if (!r) return null;
        const statusAnswer = a.status === 'uncertain'
          ? `${species.commonName} is recorded in the ${r.name} basin, but its native status there is uncertain.`
          : a.status === 'introduced'
          ? `${species.commonName} is recorded as introduced in the ${r.name} basin.`
          : `${species.commonName} is recorded as native to the ${r.name} basin.`;
        return <div key={a.riverId}>
          <h3>Is {species.commonName} native to the {r.name} basin?</h3>
          <p>{statusAnswer} {a.note}</p>
          <h3>What evidence supports this record?</h3>
          <p>The record rests on {a.sourceIds.length === 1 ? 'one cited source' : `${a.sourceIds.length} cited sources`}: {a.sourceIds.map(id => catalog.sources.find(s => s.id === id)?.title).filter(Boolean).join('; ')}. The evidence period is {a.evidencePeriod} and the record area is {a.locality}.</p>
          <h3>What does this record not establish?</h3>
          <p>It does not establish presence throughout the {r.name} basin, abundance, habitat preference, or aquarium care requirements. Native status and basin endemism remain separate claims. See the evidence policy below.</p>
        </div>;
      })}
    </section>
    <EvidencePolicy />
    <p className="atlas-reviewed">Last reviewed {reviewed}.</p>
  </ReferenceLayout>;
}
