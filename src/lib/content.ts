import fixture from "../../content/fixtures/pipeline-test.json";
import type { PipelineFixture } from "@/types/fixture";

export function parsePipelineFixture(input: unknown): PipelineFixture {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Pipeline fixture must be an object.");
  }

  const fields = input as Record<string, unknown>;
  for (const field of ["id", "label", "disclaimer", "modelUrl"] as const) {
    if (typeof fields[field] !== "string" || !fields[field].trim()) {
      throw new Error(`Pipeline fixture ${field} must be a nonblank string.`);
    }
  }

  const { id, label, disclaimer, modelUrl } = fields as PipelineFixture;
  const localGlbPath = /^\/models\/(?:[A-Za-z0-9_-][A-Za-z0-9._-]*\/)*[A-Za-z0-9_-][A-Za-z0-9._-]*\.glb$/;
  if (!localGlbPath.test(modelUrl) || !modelUrl.endsWith(".glb")) {
    throw new Error("Pipeline fixture modelUrl must be a safe local /models/ path ending in .glb.");
  }

  return { id, label, disclaimer, modelUrl };
}

export function loadPipelineFixture(): PipelineFixture {
  return parsePipelineFixture(fixture);
}
