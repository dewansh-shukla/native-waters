import Experience from "@/components/Experience";
import { loadPipelineFixture } from "@/lib/content";

export default function Page() {
  return <main><Experience fixture={loadPipelineFixture()} /></main>;
}
