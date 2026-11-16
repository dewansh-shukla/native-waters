import { loadPipelineFixture } from "@/lib/content";
import Experience from "@/components/Experience";
import { referenceMetadata } from '@/lib/reference';

export const metadata = referenceMetadata('Godavari underwater experience', 'Explore the Godavari and its tributary streams in an interactive underwater experience, with native freshwater fish records from Manjeera and Wardha sub-basins.', '/experience/godavari');

export default function GodavariExperiencePage() {
  return <Experience fixture={loadPipelineFixture()} river="godavari" />;
}
