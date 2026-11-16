import Experience from '@/components/Experience';
import { loadPipelineFixture } from '@/lib/content';
import { referenceMetadata } from '@/lib/reference';
import { JsonLd } from '@/components/seo/JsonLd';
import { webApplicationSchema } from '@/lib/structuredData';

export const metadata = referenceMetadata('Ganga underwater experience', 'Swim the Ganga in an interactive underwater experience built on native freshwater fish records and indigenous carps from ICAR-CIFRI riverine germplasm work.', '/experience/ganga');

export default function ExperienceGangaPage() {
  return <main><JsonLd data={webApplicationSchema('Ganga underwater experience', 'Swim the Ganga in an interactive underwater experience built on native freshwater fish records and indigenous carps from ICAR-CIFRI riverine germplasm work.', '/experience/ganga')} /><Experience fixture={loadPipelineFixture()} river="ganga" /></main>;
}
