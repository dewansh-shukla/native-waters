import { loadPipelineFixture } from "@/lib/content";
import Experience from "@/components/Experience";
import { referenceMetadata } from '@/lib/reference';
import { JsonLd } from '@/components/seo/JsonLd';
import { webApplicationSchema } from '@/lib/structuredData';

export const metadata = referenceMetadata('Godavari underwater experience', 'Explore the Godavari and its tributary streams in an interactive underwater experience, with native freshwater fish records from Manjeera and Wardha sub-basins.', '/experience/godavari', { robots: { index: false, follow: true } });

export default function GodavariExperiencePage() {
  return <><JsonLd data={webApplicationSchema('Godavari underwater experience', 'Explore the Godavari and its tributary streams in an interactive underwater experience, with native freshwater fish records from Manjeera and Wardha sub-basins.', '/experience/godavari')} /><Experience fixture={loadPipelineFixture()} river="godavari" /></>;
}
