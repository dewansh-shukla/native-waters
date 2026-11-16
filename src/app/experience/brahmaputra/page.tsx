import { loadPipelineFixture } from "@/lib/content";
import Experience from "@/components/Experience";
import { referenceMetadata } from '@/lib/reference';

export const metadata = referenceMetadata('Brahmaputra underwater experience', 'Enter the Brahmaputra drainage in an interactive underwater experience, where native freshwater fish and badid records hint at fauna not every tributary shares.', '/experience/brahmaputra');

export default function BrahmaputraExperiencePage() {
  return <Experience fixture={loadPipelineFixture()} river="brahmaputra" />;
}
