import { loadPipelineFixture } from "@/lib/content";
import Experience from "@/components/Experience";

export default function BrahmaputraExperiencePage() {
  return <Experience fixture={loadPipelineFixture()} river="brahmaputra" />;
}
