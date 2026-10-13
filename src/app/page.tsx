import Experience from "@/components/Experience";
import { loadPipelineFixture } from "@/lib/content";

export default function FoundationPage() {
  const fixture = loadPipelineFixture();
  return (
    <main>
      <h1>Native Waters</h1>
      <p>
        A web foundation for exploring native Indian fishes. This milestone
        verifies the animated-asset pipeline, not biological accuracy or a
        production underwater experience.
      </p>
      <Experience fixture={fixture} />
    </main>
  );
}
