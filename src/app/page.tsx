import Link from 'next/link';
import Experience from '@/components/Experience';
import ReferenceLayout from '@/components/reference/ReferenceLayout';
import { freshwaterCatalog as catalog } from '@/lib/catalog';
import { loadPipelineFixture } from '@/lib/content';
import { referenceMetadata } from '@/lib/reference';
export const metadata = referenceMetadata('Indian rivers and native freshwater fishes', 'Explore sourced fish records from five Indian river systems, alongside an illustrative underwater experience.', '/');
export default function Page() {
  return <ReferenceLayout visual={<Experience fixture={loadPipelineFixture()} />}>
    <h1>Indian rivers, living records.</h1><p>Follow a river into its freshwater fish records. Each profile connects a name with the evidence for its basin association.</p>
    <h2>Choose a river basin</h2><ul>{catalog.rivers.map(r => <li key={r.id}><Link href={`/basins/${r.id}`}>{r.name}</Link><p>{r.summary}</p></li>)}</ul>
    <p><Link href='/field-guide'>Indian river fish field guide</Link></p>
    <h2>About the 3D preview</h2><p>The Cauvery map uses sourced geographic data. Its underwater scene and polar-parrot reference study are illustrative, not a verified native-species ecosystem. New species models will follow separately.</p>
  </ReferenceLayout>;
}
