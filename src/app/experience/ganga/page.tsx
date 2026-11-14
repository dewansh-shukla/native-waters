import Experience from '@/components/Experience';
import { loadPipelineFixture } from '@/lib/content';

export default function ExperienceGangaPage() {
  return <main><Experience fixture={loadPipelineFixture()} river="ganga" /></main>;
}