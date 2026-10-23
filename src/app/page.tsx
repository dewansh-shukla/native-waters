import Experience from "@/components/Experience";
import { loadPipelineFixture } from "@/lib/content";

export default function Page() {
  return <main><Experience fixture={loadPipelineFixture()} species={[
    { modelUrl: "/models/polar-parrot-study-v1-animated.glb", fishIds: ["fish-0","fish-1","fish-2","fish-3","fish-4"], label: "Polar parrot - reference study" },
    { modelUrl: "/models/zebra-danio.glb", fishIds: ["fish-5"], label: "Zebra Danio" },
    { modelUrl: "/models/zebra-danio-glofish-green.glb", fishIds: ["fish-6"], label: "GloFish Green" },
    { modelUrl: "/models/zebra-danio-golden.glb", fishIds: ["fish-7"], label: "Golden Zebra Danio" },
    { modelUrl: "/models/zebra-danio-wild.glb", fishIds: ["fish-8"], label: "Wild Zebra Danio" },
    { modelUrl: "/models/zebra-danio-albino.glb", fishIds: ["fish-9"], label: "Albino Zebra Danio" },
    { modelUrl: "/models/arulius-barb.glb", fishIds: ["fish-10","fish-11","fish-12"], label: "Arulius Barb" },
  ]} /></main>;
}