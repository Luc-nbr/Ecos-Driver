import { create } from 'zustand';
import type { AccessoryInfo, EcosInfo, LocoInfo } from '../ecos/client';
import { ECOS_MAX_FUNCTIONS } from '../ecos/protocol';
import type { ConnMode } from './settings';

export type ConnState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

export interface Toast {
  id: number;
  text: string;
  kind: 'info' | 'error';
}

interface EcosState {
  conn: ConnState;
  mode: ConnMode | null;
  error: string | null;
  info: EcosInfo | null;
  status: string;
  latency: number | null;
  locos: Record<number, LocoInfo>;
  locoIds: number[];
  accessories: Record<number, AccessoryInfo>;
  accessoryIds: number[];
  /** App-toestand per loc (niet op de ECoS). */
  neutral: Record<number, boolean>;
  brake: Record<number, number>;
  toast: Toast | null;
}

export const useEcos = create<EcosState>()(() => ({
  conn: 'disconnected',
  mode: null,
  error: null,
  info: null,
  status: '?',
  latency: null,
  locos: {},
  locoIds: [],
  accessories: {},
  accessoryIds: [],
  neutral: {},
  brake: {},
  toast: null,
}));

export function emptyLoco(base: Pick<LocoInfo, 'id' | 'name' | 'addr' | 'protocol'>): LocoInfo {
  return {
    ...base,
    speed: 0,
    dir: 0,
    funcs: new Array(ECOS_MAX_FUNCTIONS).fill(false),
    funcDesc: new Array(ECOS_MAX_FUNCTIONS).fill(null),
    detailsLoaded: false,
  };
}

export function patchLoco(id: number, patch: Partial<LocoInfo>) {
  useEcos.setState((s) => {
    const cur = s.locos[id];
    if (!cur) return {};
    return { locos: { ...s.locos, [id]: { ...cur, ...patch } } };
  });
}

let toastId = 0;
export function showToast(text: string, kind: Toast['kind'] = 'info') {
  const id = ++toastId;
  useEcos.setState({ toast: { id, text, kind } });
  setTimeout(() => {
    if (useEcos.getState().toast?.id === id) useEcos.setState({ toast: null });
  }, 3500);
}
