import Image from 'next/image';
import styles from './SpeciesPlate.module.css';

const PLATES: Record<string, { file: string; alt: string; caption: string; width: number; height: number }> = {
  'labeo-rohita': { file: 'labeo-rohita-1807-1822-print-iconographia-zoologica.jpg', alt: 'Historical drawing catalogued as Labeo rohita in Iconographia Zoologica', caption: 'Rohu, an archival drawing from 1807–1822. Not a modern identification photograph.', width: 1920, height: 1467 },
  'labeo-calbasu': { file: 'labeo-calbasu-day-mintern-126.jpg', alt: 'Historical plate labelled Labeo calbasu by Day and Mintern', caption: 'Labeo calbasu, an 1878 plate. Original naming retained; identity needs taxonomic review.', width: 1726, height: 973 },
  'dawkinsia-arulius': { file: 'barbus-arulius-mintern-142.jpg', alt: 'Historical plate labelled Barbus arulius, showing the fish in profile', caption: 'Barbus arulius, an 1878 plate. Original naming retained; identity needs taxonomic review.', width: 1455, height: 789 },
};

export function SpeciesPlate({ id, compact = false }: { id: string; compact?: boolean }) {
  const plate = PLATES[id];
  if (!plate) return null;
  return <figure className={`${styles.plate} ${compact ? styles.compact : ''}`}>
    <Image src={`/atlas/${plate.file}`} alt={plate.alt} width={plate.width} height={plate.height} loading={compact ? 'lazy' : 'eager'} fetchPriority={compact ? undefined : 'high'} sizes={compact ? '(max-width: 700px) 90vw, 33vw' : '(max-width: 900px) 90vw, 60vw'} />
    <figcaption>{plate.caption}</figcaption>
  </figure>;
}
