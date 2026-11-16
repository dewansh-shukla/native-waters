'use client';
import { useState } from 'react';
import Link from 'next/link';
import type { River } from '@/lib/catalog';
import styles from './RiverSelector.module.css';

export function RiverSelector({ rivers }: { rivers: River[] }) {
  const [selected, setSelected] = useState('cauvery');
  const river = rivers.find(item => item.id === selected) ?? rivers[0];
  return <div className={styles.selector}>
    <div className={styles.choices} role="group" aria-label="Choose a river basin">
      {rivers.map(item => <button key={item.id} aria-pressed={river.id === item.id} onClick={() => setSelected(item.id)}>{item.name}<span aria-hidden="true">↗</span></button>)}
    </div>
    <div className={styles.record}>
      <div aria-live="polite" aria-atomic="true"><h3>{river.name}</h3><p>{river.summary}</p></div>
      <div className="atlas-actions"><Link className="atlas-button" href={`/basins/${river.id}#river-experience`}>Explore {river.name}</Link><Link href={`/basins/${river.id}`}>Read basin records</Link></div>
      <p className={styles.note}>The underwater scene is an illustration. The basin record explains what the evidence supports.</p>
    </div>
  </div>;
}
