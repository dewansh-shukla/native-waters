'use client';
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { PipelineFixture } from '@/types/fixture';
import styles from './ReferenceLayout.module.css';
const Experience = dynamic(() => import('@/components/Experience'), {
  loading: () => <p role='status'>Loading the illustrative experience…</p>, ssr: false,
});
export default function ScenePreview({ fixture, river = 'cauvery' }: { fixture: PipelineFixture; river?: string }) {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const riverName = river.charAt(0).toUpperCase() + river.slice(1);
  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal();
  }, [open]);
  return <div id="river-experience">
    <div className={styles.fallback}>
      <Image src="/hero/indian-freshwater-fish.png" alt="Illustrative underwater artwork, not a verified basin reconstruction" width={640} height={400} sizes="(max-width: 600px) 90vw, 35vw" />
      <div className={styles.fallbackBody}>
        <h2>Explore {riverName} in 3D</h2>
        <p>Move from the map into an underwater habitat. Choose a fish, follow its movement and explore at your own pace.</p>
        <button className="atlas-button" onClick={() => setOpen(true)}>Open illustrative 3D preview</button>
        <small>Models and habitats are illustrative. They do not verify the species or distributions in this record.</small>
        <noscript><p>The optional 3D preview needs JavaScript. All sourced records on this page remain available.</p></noscript>
      </div>
    </div>
    <dialog ref={dialog} className={styles.sceneDialog} aria-label={`${riverName} underwater experience`} onClose={event => { if (event.target === event.currentTarget) setOpen(false); }}>
      <div className={styles.sceneToolbar}>
        <Link href={`/basins/${river}`}>{riverName} basin records</Link>
        <button type="button" onClick={() => dialog.current?.close()}>Close experience</button>
      </div>
      {open && <Experience fixture={fixture} river={river} />}
    </dialog>
  </div>;
}
