import { useEffect, useMemo } from 'react';
import type { LocoInfo } from '../ecos/client';
import { ECOS_MAX_FUNCTIONS } from '../ecos/protocol';
import { describeSymbol } from '../ecos/symbols';
import { metaKey, watchLoco } from './actions';
import { useEcos } from './ecos';
import { LocoMeta, useSettings } from './settings';

export function useMode() {
  return useEcos((s) => s.mode) ?? 'tcp';
}

/** Een loc uit de store; begint de loc automatisch te volgen. */
export function useLoco(id: number | null | undefined): LocoInfo | null {
  const loco = useEcos((s) => (id != null ? s.locos[id] ?? null : null));
  const connected = useEcos((s) => s.conn === 'connected');
  useEffect(() => {
    if (id != null && connected) watchLoco(id);
  }, [id, connected]);
  return loco;
}

const EMPTY: LocoMeta = {};

export function useLocoMeta(id: number | null | undefined): LocoMeta {
  const mode = useMode();
  return useSettings((s) => (id != null ? s.meta[metaKey(id, mode)] ?? EMPTY : EMPTY));
}

export function vmaxOf(loco: LocoInfo | null, meta: LocoMeta) {
  return meta.vmax || (loco?.speedIndicator && loco.speedIndicator > 0 ? loco.speedIndicator : 0) || 160;
}

export const kmh = (speed: number, vmax: number) => Math.round((speed / 126) * vmax);

export interface FunctionView {
  n: number;
  label: string;
  icon: string;
  moment: boolean;
  on: boolean;
}

/** Alle bruikbare functies van een loc, met labels uit de ECoS of uit de bibliotheek. */
export function useFunctions(loco: LocoInfo | null, meta: LocoMeta): FunctionView[] {
  return useMemo(() => {
    if (!loco) return [];
    const anyDesc = loco.funcDesc.some((d) => d !== null);
    const out: FunctionView[] = [];
    for (let n = 0; n < ECOS_MAX_FUNCTIONS; n++) {
      const d = loco.funcDesc[n];
      const o = meta.funcs?.[n];
      const exists = anyDesc ? d !== null || !!o?.label : n < 16 || !!o?.label;
      if (!exists || o?.hidden) continue;
      const base = describeSymbol(d?.symbol, n);
      out.push({
        n,
        label: o?.label || base.label,
        icon: o?.icon || base.icon,
        moment: o?.moment ?? d?.moment ?? false,
        on: !!loco.funcs[n],
      });
    }
    return out;
  }, [loco, meta]);
}

export function useSlots(kind: 'duo' | 'multi'): (number | null)[] {
  const mode = useMode();
  const slots = useSettings((s) => s[kind][mode]);
  const size = kind === 'duo' ? 2 : 10;
  return useMemo(() => Array.from({ length: size }, (_, i) => slots?.[i] ?? null), [slots, size]);
}

export function useCurrentLocoId(): number | null {
  const mode = useMode();
  const cur = useSettings((s) => s.current[mode]);
  const first = useEcos((s) => s.locoIds[0] ?? null);
  const exists = useEcos((s) => (cur != null ? !!s.locos[cur] : false));
  return exists ? cur : first;
}
