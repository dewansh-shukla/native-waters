import Image from 'next/image';
import { atlasImage, imageKindLabel } from '@/lib/atlasImages';
import styles from './SpeciesPlate.module.css';

export function SpeciesPlate({ id, compact = false }: { id: string; compact?: boolean }) {
  const plate = atlasImage(id);
  if (!plate) return null;
  const kindClass = plate.kind === 'photograph' ? styles.photograph : '';
  return <figure className={`${styles.plate} ${kindClass} ${compact ? styles.compact : ''}`.trim()}>
    <Image src={plate.file} alt={plate.alt} width={plate.width} height={plate.height} loading={compact ? 'lazy' : 'eager'} fetchPriority={compact ? undefined : 'high'} sizes={compact ? '(max-width: 700px) 90vw, 33vw' : '(max-width: 900px) 90vw, 60vw'} />
    <figcaption>
      <span className={styles.caption}>{plate.caption}</span>
      <span className={styles.credit}>
        {imageKindLabel(plate)}: {plate.creator ?? 'creator not recorded'}, {plate.dateLabel}.{' '}
        <a href={plate.licenseUrl} rel="license">{plate.license}</a>{' '}
        <a href={plate.page}>Source file</a>.
      </span>
    </figcaption>
  </figure>;
}
