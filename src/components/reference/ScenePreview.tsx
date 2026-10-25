'use client';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import type { PipelineFixture } from '@/types/fixture';
import styles from './ReferenceLayout.module.css';
const Experience = dynamic(() => import('@/components/Experience'), {
  loading: () => <p role='status'>Loading the illustrative experience…</p>, ssr: false,
});
export default function ScenePreview({ fixture }: { fixture: PipelineFixture }) {
  const [open, setOpen] = useState(false);
  if (open) return <Experience fixture={fixture} />;
  return <div className={styles.fallback}>
    <svg viewBox='0 0 600 800' preserveAspectRatio='none' aria-hidden='true'><g fill='none' stroke='#75b9c0' strokeWidth='2'>
      <path d='M0 130 Q250 20 300 300 T600 600'/><path d='M0 160 Q230 50 280 320 T600 630'/><path d='M0 190 Q210 80 260 340 T600 660'/><path d='M0 220 Q190 110 240 360 T600 690'/>
    </g></svg>
    <h2>Life beyond the canvas.</h2>
    <p>Read the sourced river and species records alongside this visual placeholder. A model for this profile is not available yet.</p>
    <p>The optional 3D preview shows an illustrative Cauvery scene with a polar-parrot reference study. It does not depict the species or habitat described here.</p>
    <button onClick={() => setOpen(true)}>Open illustrative 3D preview</button>
    <noscript><p>The field guide is fully readable without JavaScript. The optional 3D preview requires it.</p></noscript>
  </div>;
}
