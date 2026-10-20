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
  /** Twee functies als snelknop (oude versie; blijft bewaard). */
  quick?: number[];
}

export type ConnMode = 'tcp' | 'demo';

/** Een ECoS-centrale (bijv. thuisbaan of clubbaan). */
export interface Profile {
  id: string;
  name: string;
  host: string;
  port: number;
}

interface SettingsState {
  profiles: Profile[];
  activeProfileId: string;
  autoConnect: boolean;
  lastMode: ConnMode | null;
  keepAwake: boolean;
  /** sleutel: `${mode}:${locId}` */
  meta: Record<string, LocoMeta>;
  current: Record<ConnMode, number | null>;
  duo: Record<ConnMode, (number | null)[]>;
  multi: Record<ConnMode, (number | null)[]>;
  /** Laatst bestuurde locs, nieuwste eerst. */
  recent: Record<ConnMode, number[]>;
  set: (patch: Partial<Omit<SettingsState, 'set' | 'setMeta' | 'removeMeta'>>) => void;
  setMeta: (key: string, patch: Partial<LocoMeta>) => void;
  removeMeta: (key: string) => void;
}

const DEFAULT_PROFILE: Profile = { id: 'thuis', name: 'Thuisbaan', host: '192.168.1.50', port: 15471 };

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      profiles: [DEFAULT_PROFILE],
      activeProfileId: DEFAULT_PROFILE.id,
      autoConnect: true,
      lastMode: null,
      keepAwake: true,
      meta: {},
      current: { tcp: null, demo: null },
      duo: { tcp: [null, null], demo: [null, null] },
      multi: { tcp: new Array(10).fill(null), demo: new Array(10).fill(null) },
      recent: { tcp: [], demo: [] },
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
      version: 2,
      storage: createJSONStorage(() => AsyncStorage),
      // versie 1 had één host/poort: omzetten naar een profiel
      migrate: (old: unknown, version) => {
        const s = (old ?? {}) as Record<string, unknown>;
        if (version < 2) {
          const host = typeof s.host === 'string' ? s.host : DEFAULT_PROFILE.host;
          const port = typeof s.port === 'number' ? s.port : DEFAULT_PROFILE.port;
          s.profiles = [{ ...DEFAULT_PROFILE, host, port }];
          s.activeProfileId = DEFAULT_PROFILE.id;
          delete s.host;
          delete s.port;
          delete s.title;
          delete s.subtitle;
        }
        return s as unknown as SettingsState;
      },
    },
  ),
);

export function activeProfile(): Profile {
  const s = useSettings.getState();
  return s.profiles.find((p) => p.id === s.activeProfileId) ?? s.profiles[0] ?? DEFAULT_PROFILE;
}

export function useActiveProfile(): Profile {
  return useSettings((s) => s.profiles.find((p) => p.id === s.activeProfileId) ?? s.profiles[0] ?? DEFAULT_PROFILE);
}
