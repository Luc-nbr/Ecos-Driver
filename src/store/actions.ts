// Alle acties van de app: verbinden, rijden, functies, bibliotheek, wissels.
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { EcosClient, EcosError, LocoInfo } from '../ecos/client';
import { TcpTransport } from '../ecos/tcpTransport';
import { SimTransport } from '../ecos/transport';
import { emptyLoco, patchLoco, showToast, useEcos } from './ecos';
import { activeProfile, ConnMode, LocoMeta, useSettings } from './settings';

let client: EcosClient | null = null;
let wantConnected = false;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let brakeTimer: ReturnType<typeof setInterval> | null = null;

export const getClient = () => client;

export function metaKey(id: number, mode = useEcos.getState().mode ?? 'tcp') {
  return `${mode}:${id}`;
}

export function haptic(kind: 'light' | 'medium' | 'heavy' = 'light') {
  if (Platform.OS === 'web') return;
  const style =
    kind === 'heavy' ? Haptics.ImpactFeedbackStyle.Heavy : kind === 'medium' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light;
  Haptics.impactAsync(style).catch(() => {});
}

function report(e: unknown) {
  const msg = e instanceof EcosError ? `ECoS weigert: ${e.text || 'fout ' + e.code}` : e instanceof Error ? e.message : String(e);
  showToast(msg, 'error');
}

// ------------------------------------------------------------------ verbinding

export async function connect(mode: ConnMode) {
  await disconnect(false);
  wantConnected = true;
  const { host, port } = activeProfile();
  useSettings.getState().set({ lastMode: mode });
  useEcos.setState({
    conn: 'connecting', mode, error: null, info: null, status: '?', latency: null,
    locos: {}, locoIds: [], accessories: {}, accessoryIds: [], neutral: {}, brake: {},
  });
  const transport = mode === 'demo' ? new SimTransport() : new TcpTransport(host.trim(), port);
  const c = new EcosClient(transport);
  client = c;
  c.on((e) => {
    if (client !== c) return;
    switch (e.type) {
      case 'info':
        useEcos.setState({ info: e.info });
        break;
      case 'status':
        useEcos.setState({ status: e.status });
        break;
      case 'latency':
        useEcos.setState({ latency: e.ms });
        break;
      case 'locoList': {
        useEcos.setState((s) => {
          const locos: Record<number, LocoInfo> = {};
          for (const l of e.locos) {
            const prev = s.locos[l.id];
            locos[l.id] = prev ? { ...prev, ...l } : emptyLoco(l);
          }
          const locoIds = e.locos
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name, 'nl', { numeric: true }))
            .map((l) => l.id);
          return { locos, locoIds };
        });
        break;
      }
      case 'loco':
        patchLoco(e.id, e.patch);
        break;
      case 'func': {
        const l = useEcos.getState().locos[e.id];
        if (l) {
          const funcs = l.funcs.slice();
          funcs[e.n] = e.on;
          patchLoco(e.id, { funcs });
        }
        break;
      }
      case 'accessoryList':
        useEcos.setState({
          accessories: Object.fromEntries(e.list.map((a) => [a.id, a])),
          accessoryIds: e.list.map((a) => a.id),
        });
        break;
      case 'accessory':
        useEcos.setState((s) => {
          const cur = s.accessories[e.id];
          return cur ? { accessories: { ...s.accessories, [e.id]: { ...cur, ...e.patch } } } : {};
        });
        break;
      case 'controlLost': {
        const l = useEcos.getState().locos[e.id];
        showToast(`${l?.name ?? 'Loc'} wordt nu ergens anders bestuurd`);
        break;
      }
      case 'closed':
        client = null;
        useEcos.setState({ conn: wantConnected ? 'reconnecting' : 'disconnected', error: e.error?.message ?? null });
        if (wantConnected) scheduleReconnect(mode);
        break;
    }
  });
  try {
    await c.connect();
    if (client !== c) return;
    useEcos.setState({ conn: 'connected' });
    startBrakeLoop();
    restoreSelections(mode);
  } catch (e) {
    if (client !== c) return;
    client = null;
    const msg = e instanceof Error ? e.message : String(e);
    useEcos.setState({ conn: 'error', error: msg });
    transport.close();
  }
}

function scheduleReconnect(mode: ConnMode) {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;
    if (!wantConnected) return;
    await connect(mode);
    if (useEcos.getState().conn !== 'connected' && wantConnected) {
      useEcos.setState({ conn: 'reconnecting' });
      scheduleReconnect(mode);
    }
  }, 3000);
}

/** iOS verbreekt TCP vaak in de achtergrond: bij terugkomen meteen opnieuw verbinden. */
export function onAppActive() {
  const { conn, mode } = useEcos.getState();
  if (wantConnected && mode && conn !== 'connected' && conn !== 'connecting') {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = null;
    connect(mode);
  }
}

export async function disconnect(userInitiated = true) {
  if (userInitiated) wantConnected = false;
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = null;
  const c = client;
  client = null;
  if (c) await c.disconnect().catch(() => {});
  if (userInitiated) useEcos.setState({ conn: 'disconnected', error: null });
}

function restoreSelections(mode: ConnMode) {
  const s = useSettings.getState();
  const ids = new Set(useEcos.getState().locoIds);
  const valid = (id: number | null) => (id !== null && ids.has(id) ? id : null);
  const current = valid(s.current[mode]) ?? useEcos.getState().locoIds[0] ?? null;
  s.set({
    current: { ...s.current, [mode]: current },
    duo: { ...s.duo, [mode]: (s.duo[mode] ?? [null, null]).map(valid) },
    multi: { ...s.multi, [mode]: (s.multi[mode] ?? new Array(10).fill(null)).map(valid) },
  });
}

export function watchLoco(id: number) {
  client?.watchLoco(id).catch(() => {});
}

// ------------------------------------------------------------------ rijden

export function setSpeed(id: number, speed: number) {
  const s = useEcos.getState();
  if (s.neutral[id]) return;
  const v = Math.max(0, Math.min(126, Math.round(speed)));
  if (s.locos[id]?.speed === v) return;
  patchLoco(id, { speed: v });
  const mode = s.mode ?? 'tcp';
  if (v > 0 && useSettings.getState().recent?.[mode]?.[0] !== id) pushRecent(id);
  client?.setSpeed(id, v);
}

export function setDirection(id: number, dir: 0 | 1) {
  haptic('medium');
  useEcos.setState((s) => ({ neutral: { ...s.neutral, [id]: false } }));
  patchLoco(id, { dir, speed: 0 });
  client?.setDirection(id, dir).catch(report);
}

export function setNeutral(id: number) {
  haptic('medium');
  useEcos.setState((s) => ({ neutral: { ...s.neutral, [id]: true }, brake: { ...s.brake, [id]: 0 } }));
  patchLoco(id, { speed: 0 });
  client?.setSpeed(id, 0);
}

export function setFunction(id: number, n: number, on: boolean) {
  const l = useEcos.getState().locos[id];
  if (!l) return;
  haptic('light');
  const funcs = l.funcs.slice();
  funcs[n] = on;
  patchLoco(id, { funcs });
  client?.setFunction(id, n, on).catch(report);
}

export function toggleFunction(id: number, n: number) {
  const l = useEcos.getState().locos[id];
  if (l) setFunction(id, n, !l.funcs[n]);
}

export function stopLoco(id: number) {
  haptic('heavy');
  useEcos.setState((s) => ({ brake: { ...s.brake, [id]: 0 } }));
  patchLoco(id, { speed: 0 });
  client?.stopLoco(id).catch(report);
}

export function setBrake(id: number, value: number) {
  useEcos.setState((s) => ({ brake: { ...s.brake, [id]: Math.max(0, Math.min(100, value)) } }));
}

/** De rem laat een rijdende loc geleidelijk afremmen, harder naarmate de rem verder staat. */
function startBrakeLoop() {
  if (brakeTimer) return;
  brakeTimer = setInterval(() => {
    const s = useEcos.getState();
    for (const [key, value] of Object.entries(s.brake)) {
      const id = Number(key);
      const l = s.locos[id];
      if (!value || !l || l.speed <= 0) continue;
      const step = Math.max(1, Math.round((value / 100) * 8));
      setSpeed(id, l.speed - step);
    }
  }, 160);
}

export async function emergencyStop() {
  haptic('heavy');
  const s = useEcos.getState();
  const locos = { ...s.locos };
  for (const id of Object.keys(locos)) locos[Number(id)] = { ...locos[Number(id)], speed: 0 };
  useEcos.setState({ locos, status: 'STOP', brake: {} });
  try {
    await client?.setPower(false);
  } catch (e) {
    report(e);
  }
  // daarna snelheid 0, zodat locs na GO niet ineens wegrijden
  client?.stopAllControlled();
}

export async function setPower(go: boolean) {
  haptic('medium');
  try {
    await client?.setPower(go);
  } catch (e) {
    report(e);
  }
}

// ------------------------------------------------------------------ selectie

/** Onthoud een loc als recent bestuurd (voor snel wisselen). */
function pushRecent(id: number) {
  const mode = useEcos.getState().mode ?? 'tcp';
  const s = useSettings.getState();
  const list = [id, ...(s.recent?.[mode] ?? []).filter((x) => x !== id)].slice(0, 12);
  s.set({ recent: { ...(s.recent ?? { tcp: [], demo: [] }), [mode]: list } });
}

export function selectLoco(id: number) {
  const mode = useEcos.getState().mode ?? 'tcp';
  const s = useSettings.getState();
  s.set({ current: { ...s.current, [mode]: id } });
  pushRecent(id);
}

export function setSlot(kind: 'duo' | 'multi', index: number, id: number | null) {
  const mode = useEcos.getState().mode ?? 'tcp';
  const s = useSettings.getState();
  const slots = (s[kind][mode] ?? []).slice();
  slots[index] = id;
  s.set({ [kind]: { ...s[kind], [mode]: slots } } as Partial<typeof s>);
  if (id != null) pushRecent(id);
}

// ------------------------------------------------------------------ bibliotheek

export interface LocoForm {
  name: string;
  addr: number;
  protocol: string;
  meta: LocoMeta;
}

export async function createLoco(form: LocoForm): Promise<number | null> {
  if (!client) {
    showToast('Niet verbonden met de ECoS', 'error');
    return null;
  }
  try {
    const id = await client.createLoco({ name: form.name, addr: form.addr, protocol: form.protocol });
    useSettings.getState().setMeta(metaKey(id), form.meta);
    showToast(`${form.name} toegevoegd aan de ECoS`);
    return id;
  } catch (e) {
    report(e);
    return null;
  }
}

export async function updateLoco(id: number, form: LocoForm): Promise<boolean> {
  const cur = useEcos.getState().locos[id];
  if (!client || !cur) {
    showToast('Niet verbonden met de ECoS', 'error');
    return false;
  }
  try {
    const patch: { name?: string; addr?: number; protocol?: string } = {};
    if (form.name !== cur.name) patch.name = form.name;
    if (form.addr !== cur.addr) patch.addr = form.addr;
    if (form.protocol !== cur.protocol) patch.protocol = form.protocol;
    if (Object.keys(patch).length) await client.updateLoco(id, patch);
    useSettings.getState().setMeta(metaKey(id), form.meta);
    showToast('Loc opgeslagen');
    return true;
  } catch (e) {
    report(e);
    return false;
  }
}

export async function deleteLoco(id: number): Promise<boolean> {
  if (!client) {
    showToast('Niet verbonden met de ECoS', 'error');
    return false;
  }
  try {
    await client.deleteLoco(id);
    useSettings.getState().removeMeta(metaKey(id));
    const mode = useEcos.getState().mode ?? 'tcp';
    const s = useSettings.getState();
    const clear = (arr: (number | null)[]) => arr.map((x) => (x === id ? null : x));
    s.set({
      current: { ...s.current, [mode]: s.current[mode] === id ? useEcos.getState().locoIds[0] ?? null : s.current[mode] },
      duo: { ...s.duo, [mode]: clear(s.duo[mode]) },
      multi: { ...s.multi, [mode]: clear(s.multi[mode]) },
      recent: { ...s.recent, [mode]: (s.recent?.[mode] ?? []).filter((x) => x !== id) },
    });
    showToast('Loc verwijderd van de ECoS');
    return true;
  } catch (e) {
    report(e);
    return false;
  }
}

// ------------------------------------------------------------------ wissels

export function switchAccessory(id: number) {
  const a = useEcos.getState().accessories[id];
  if (!a || !client) return;
  haptic('light');
  const next = a.type === 'ROUTE' ? 1 : a.state ? 0 : 1;
  client.switchAccessory(id, next).catch(report);
}
