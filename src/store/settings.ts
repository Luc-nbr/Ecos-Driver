import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface FuncOverride {
  label?: string;
  icon?: string;
  moment?: boolean;
  hidden?: boolean;
}

/** Extra gegevens per loc die de ECoS zelf niet bewaart (foto, topsnelheid, …). */
export interface LocoMeta {
  photo?: string;
  vmax?: number;
  kind?: string;
  subtitle?: string;
  favorite?: boolean;
  funcs?: Record<number, FuncOverride>;
  /** Twee functies als snelknop naast de rijrichting. */
  quick?: number[];
}

export type ConnMode = 'tcp' | 'demo';

interface SettingsState {
  host: string;
  port: number;
  autoConnect: boolean;
  lastMode: ConnMode | null;
  keepAwake: boolean;
  title: string;
  subtitle: string;
  /** sleutel: `${mode}:${locId}` */
  meta: Record<string, LocoMeta>;
  current: Record<ConnMode, number | null>;
  duo: Record<ConnMode, (number | null)[]>;
  multi: Record<ConnMode, (number | null)[]>;
  set: (patch: Partial<Omit<SettingsState, 'set' | 'setMeta' | 'removeMeta'>>) => void;
  setMeta: (key: string, patch: Partial<LocoMeta>) => void;
  removeMeta: (key: string) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      host: '192.168.1.50',
      port: 15471,
      autoConnect: true,
      lastMode: null,
      keepAwake: true,
      title: 'Modelspoor',
      subtitle: 'Rijden. Ontdekken. Beleven.',
      meta: {},
      current: { tcp: null, demo: null },
      duo: { tcp: [null, null], demo: [null, null] },
      multi: { tcp: new Array(10).fill(null), demo: new Array(10).fill(null) },
      set: (patch) => set(patch),
      setMeta: (key, patch) => set((s) => ({ meta: { ...s.meta, [key]: { ...s.meta[key], ...patch } } })),
      removeMeta: (key) =>
        set((s) => {
          const meta = { ...s.meta };
          delete meta[key];
          return { meta };
        }),
    }),
    {
      name: 'ecos-driver-settings',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
