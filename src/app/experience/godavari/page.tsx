import { loadPipelineFixture } from "@/lib/content";
import Experience from "@/components/Experience";

export default function GodavariExperiencePage() {
  return <Experience fixture={loadPipelineFixture()} river="godavari" />;
}
