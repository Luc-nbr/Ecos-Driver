import { useRef } from 'react';
import { create } from 'zustand';

// Tijdens het bedienen van een wiel, schuif of het VNC-scherm mag de pagina
// niet meescrollen: zolang er een slot is, staat scrollen uit.
export const useUi = create<{ scrollLocks: number }>()(() => ({ scrollLocks: 0 }));

const lock = () => useUi.setState((s) => ({ scrollLocks: s.scrollLocks + 1 }));
const unlock = () => useUi.setState((s) => ({ scrollLocks: Math.max(0, s.scrollLocks - 1) }));

/** Touch-handlers die het scrollen blokkeren zolang een vinger op het element staat. */
export function useScrollLock() {
  const held = useRef(false);
  const start = () => {
    if (held.current) return;
    held.current = true;
    lock();
  };
  const end = () => {
    if (!held.current) return;
    held.current = false;
    unlock();
  };
  return { onTouchStart: start, onTouchEnd: end, onTouchCancel: end, release: end };
}

export function useScrollEnabled() {
  return useUi((s) => s.scrollLocks === 0);
}
