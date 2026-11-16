'use client';

import { useEffect, useState } from 'react';
import { GoogleAnalytics } from '@next/third-parties/google';
import styles from './ConsentGate.module.css';

const STORAGE_KEY = 'nw-analytics-consent';

type Choice = 'pending' | 'granted' | 'declined';

export function ConsentGate({ gaId }: { gaId: string }) {
  const [choice, setChoice] = useState<Choice>('pending');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      stored = null;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading persisted consent on mount
    if (stored === 'granted' || stored === 'declined') setChoice(stored);
    setReady(true);
  }, []);

  function decide(next: 'granted' | 'declined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private-mode storage can throw; keep going so the banner still works.
    }
    setChoice(next);
  }

  if (choice === 'granted') return <GoogleAnalytics gaId={gaId} />;

  // Until the client has read storage, render nothing: no banner, no analytics.
  if (!ready || choice === 'declined') return null;

  return (
    <aside className={styles.banner} role="region" aria-label="Analytics consent">
      <p className={styles.text}>
        We use Google Analytics to understand how this site is used. Analytics only loads if you accept;
        declining keeps every feature working.
      </p>
      <div className={styles.actions}>
        <button type="button" className={styles.accept} onClick={() => decide('granted')}>
          Accept analytics
        </button>
        <button type="button" className={styles.decline} onClick={() => decide('declined')}>
          Decline
        </button>
      </div>
    </aside>
  );
}
