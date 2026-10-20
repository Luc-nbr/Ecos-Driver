// Hoog-niveau client voor de ESU ECoS. Weet niets van React: de store
// luistert naar de events en stuurt commando's via deze klasse.
import { attr, attrNum, EcosBlock, EcosLine, EcosStreamParser, ECOS_MAX_FUNCTIONS, quote } from './protocol';
import type { Transport } from './transport';

export interface FuncDesc {
  symbol: number;
  moment: boolean;
}

export interface LocoInfo {
  id: number;
  name: string;
  addr: number;
  protocol: string;
  /** Snelheid in app-stappen 0..126 (ECoS gebruikt 0..127 waarbij 1 = noodstop). */
  speed: number;
  /** 0 = vooruit, 1 = achteruit (zoals de ECoS). */
  dir: 0 | 1;
  funcs: boolean[];
  funcDesc: (FuncDesc | null)[];
  /** km/h bij topsnelheid, als de ECoS dat kent (speedindicator). */
  speedIndicator?: number;
  /** Welk plaatje de ECoS voor deze loc gebruikt (locodesc). */
  locodesc?: LocoDesc;
  detailsLoaded: boolean;
}

/** locodesc[locotype, imagetype, imageindex] uit de ECoS. */
export interface LocoDesc {
  locoType: string;
  imageType: string;
  index: number;
}

export function parseLocodesc(args: string[] | undefined): LocoDesc | undefined {
  if (!args || args.length < 3) return undefined;
  const index = Number(args[2]);
  if (!Number.isFinite(index)) return undefined;
  return { locoType: args[0], imageType: args[1], index };
}

export interface AccessoryInfo {
  id: number;
  name: string;
  name2: string;
  addr: number;
  protocol: string;
  type: 'ACCESSORY' | 'ROUTE' | string;
  mode: string;
  state: number;
}

export interface EcosInfo {
  model: string;
  protocolVersion?: string;
  applicationVersion?: string;
  hardwareVersion?: string;
}

export type ClientEvent =
  | { type: 'status'; status: 'GO' | 'STOP' | 'SHUTDOWN' | string }
  | { type: 'info'; info: EcosInfo }
  | { type: 'locoList'; locos: Pick<LocoInfo, 'id' | 'name' | 'addr' | 'protocol' | 'locodesc'>[] }
  | { type: 'loco'; id: number; patch: Partial<LocoInfo> }
  | { type: 'func'; id: number; n: number; on: boolean }
  | { type: 'accessoryList'; list: AccessoryInfo[] }
  | { type: 'accessory'; id: number; patch: Partial<AccessoryInfo> }
  | { type: 'controlLost'; id: number }
  | { type: 'latency'; ms: number }
  | { type: 'closed'; error?: Error };

export class EcosError extends Error {
  constructor(public code: number, public text: string, public command: string) {
    super(`ECoS fout ${code} (${text}) bij ${command}`);
  }
}

export const toEcosSpeed = (ui: number) => (ui <= 0 ? 0 : Math.min(127, Math.round(ui) + 1));
export const fromEcosSpeed = (v: number) => (v <= 1 ? 0 : Math.min(126, v - 1));

interface Pending {
  cmd: string;
  norm: string;
  resolve: (b: EcosBlock) => void;
  reject: (e: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

const norm = (s: string) => s.replace(/\s+/g, '');

export class EcosClient {
  private parser: EcosStreamParser;
  private pending: Pending[] = [];
  private listeners = new Set<(e: ClientEvent) => void>();
  private controlled = new Set<number>();
  private watched = new Set<number>();
  private speedQueue = new Map<number, { inflight: boolean; next: number | null }>();
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private listReloadTimer: ReturnType<typeof setTimeout> | null = null;
  private open = false;

  constructor(private transport: Transport, private commandTimeoutMs = 5000) {
    this.parser = new EcosStreamParser((b) => this.onBlock(b));
    transport.onData = (chunk) => this.parser.push(chunk);
    transport.onClose = (error) => this.handleClosed(error);
  }

  on(fn: (e: ClientEvent) => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(e: ClientEvent) {
    for (const l of this.listeners) l(e);
  }

  get isOpen() {
    return this.open;
  }

  // ---------------------------------------------------------------- verbinding

  async connect() {
    await this.transport.open();
    this.open = true;
    const infoBlock = await this.send('get(1, info)');
    this.emit({ type: 'info', info: parseInfo(infoBlock) });
    await this.refreshStatus();
    await this.send('request(1, view)');
    await this.send('request(10, view)').catch(() => {});
    await this.send('request(11, view)').catch(() => {});
    await this.loadLocoList();
    await this.loadAccessories().catch(() => this.emit({ type: 'accessoryList', list: [] }));
    this.pingTimer = setInterval(() => this.ping(), 5000);
  }

  async disconnect() {
    if (!this.open) return;
    for (const id of Array.from(this.controlled)) {
      await this.send(`release(${id}, control)`).catch(() => {});
    }
    this.transport.close();
  }

  private handleClosed(error?: Error) {
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.pingTimer = null;
    const wasOpen = this.open;
    this.open = false;
    for (const p of this.pending) {
      clearTimeout(p.timer);
      p.reject(new Error('Verbinding met de ECoS verbroken'));
    }
    this.pending = [];
    this.controlled.clear();
    this.watched.clear();
    this.parser.reset();
    if (wasOpen) this.emit({ type: 'closed', error });
  }

  private async ping() {
    const t = Date.now();
    try {
      const b = await this.send('get(1, status)');
      this.emit({ type: 'latency', ms: Date.now() - t });
      this.applyStatus(b);
    } catch (e) {
      if (!(e instanceof EcosError)) {
        // geen antwoord meer: verbinding als verbroken beschouwen
        this.transport.close();
      }
    }
  }

  // ---------------------------------------------------------------- commando's

  send(cmd: string): Promise<EcosBlock> {
    if (!this.open) return Promise.reject(new Error('Niet verbonden met de ECoS'));
    return new Promise((resolve, reject) => {
      const p: Pending = {
        cmd,
        norm: norm(cmd),
        resolve,
        reject,
        timer: setTimeout(() => {
          this.pending = this.pending.filter((x) => x !== p);
          reject(new Error(`Geen antwoord op ${cmd}`));
        }, this.commandTimeoutMs),
      };
      this.pending.push(p);
      this.transport.send(cmd + '\n');
    });
  }

  private onBlock(b: EcosBlock) {
    if (b.type === 'REPLY') {
      const key = norm(b.head);
      let idx = this.pending.findIndex((p) => p.norm === key);
      if (idx < 0) {
        // de ECoS kan het commando iets anders terugsturen: match dan op commando + object-id
        const prefix = key.split(/[,)]/)[0];
        idx = this.pending.findIndex((p) => p.norm.split(/[,)]/)[0] === prefix);
      }
      const p = this.pending[idx];
      if (!p) return; // laat antwoord op een verlopen commando
      this.pending.splice(idx, 1);
      clearTimeout(p.timer);
      if (b.errorCode !== 0) p.reject(new EcosError(b.errorCode, b.errorText, p.cmd));
      else p.resolve(b);
      return;
    }
    this.onEvent(b);
  }

  private onEvent(b: EcosBlock) {
    for (const line of b.lines) {
      const id = line.id;
      if (id === 1) {
        const s = attr(line, 'status');
        if (s) this.emit({ type: 'status', status: s[0].toUpperCase() });
        continue;
      }
      if (id === 10) {
        if (attr(line, 'msg')) this.scheduleListReload();
        continue;
      }
      if (id === 11) {
        if (attr(line, 'msg')) this.loadAccessories().catch(() => {});
        continue;
      }
      if (line.attrs.some((a) => a.key === 'appended' || a.key === 'removed')) {
        this.scheduleListReload();
        continue;
      }
      const msg = attr(line, 'msg');
      if (msg && msg[0] === 'CONTROL_LOST') {
        this.controlled.delete(id);
        this.emit({ type: 'controlLost', id });
        continue;
      }
      if (id >= 20000) {
        const st = attrNum(line, 'state');
        if (st !== undefined) this.emit({ type: 'accessory', id, patch: { state: st } });
        continue;
      }
      this.applyLocoLine(line);
    }
  }

  private applyLocoLine(line: EcosLine) {
    const id = line.id;
    const patch: Partial<LocoInfo> = {};
    for (const a of line.attrs) {
      switch (a.key) {
        case 'speed':
          patch.speed = fromEcosSpeed(Number(a.args[0]));
          break;
        case 'dir':
          patch.dir = Number(a.args[0]) ? 1 : 0;
          break;
        case 'name':
          patch.name = a.args[0];
          break;
        case 'addr':
          patch.addr = Number(a.args[0]);
          break;
        case 'protocol':
          patch.protocol = a.args[0];
          break;
        case 'locodesc':
          patch.locodesc = parseLocodesc(a.args);
          break;
        case 'func':
          this.emit({ type: 'func', id, n: Number(a.args[0]), on: Number(a.args[1]) === 1 });
          break;
      }
    }
    if (Object.keys(patch).length) this.emit({ type: 'loco', id, patch });
  }

  private scheduleListReload() {
    if (this.listReloadTimer) clearTimeout(this.listReloadTimer);
    this.listReloadTimer = setTimeout(() => {
      this.listReloadTimer = null;
      this.loadLocoList().catch(() => {});
    }, 250);
  }

  // ---------------------------------------------------------------- status

  async refreshStatus() {
    const b = await this.send('get(1, status)');
    this.applyStatus(b);
  }

  private applyStatus(b: EcosBlock) {
    for (const l of b.lines) {
      const s = attr(l, 'status') ?? attr(l, 'Status');
      if (s) this.emit({ type: 'status', status: s[0].toUpperCase() });
    }
  }

  async setPower(go: boolean) {
    await this.send(go ? 'set(1, go)' : 'set(1, stop)');
    this.emit({ type: 'status', status: go ? 'GO' : 'STOP' });
  }

  // ---------------------------------------------------------------- locs

  async loadLocoList() {
    // locodesc (welk plaatje) meevragen; oudere firmware die dat niet kent: zonder
    let b: EcosBlock;
    try {
      b = await this.send('queryObjects(10, name, addr, protocol, locodesc)');
    } catch (e) {
      if (!(e instanceof EcosError)) throw e;
      b = await this.send('queryObjects(10, name, addr, protocol)');
    }
    const locos = b.lines
      .filter((l) => l.id >= 1000)
      .map((l) => ({
        id: l.id,
        name: attr(l, 'name')?.[0] ?? `Loc ${l.id}`,
        addr: attrNum(l, 'addr') ?? 0,
        protocol: attr(l, 'protocol')?.[0] ?? '?',
        locodesc: parseLocodesc(attr(l, 'locodesc')),
      }));
    // locs die verdwenen zijn hoeven we niet meer te volgen
    const ids = new Set(locos.map((l) => l.id));
    for (const id of Array.from(this.watched)) if (!ids.has(id)) this.watched.delete(id);
    for (const id of Array.from(this.controlled)) if (!ids.has(id)) this.controlled.delete(id);
    this.emit({ type: 'locoList', locos });
  }

  /** Begin een loc te volgen (events) en laad snelheid, richting en functies. */
  async watchLoco(id: number) {
    if (this.watched.has(id) || !this.open) return;
    this.watched.add(id);
    try {
      await this.send(`request(${id}, view)`);
      const base = await this.send(`get(${id}, speed, dir)`);
      for (const l of base.lines) this.applyLocoLine(l);

      const funcs: boolean[] = new Array(ECOS_MAX_FUNCTIONS).fill(false);
      try {
        const fs = await this.send(`get(${id}, funcset)`);
        const bits = attr(fs.lines[0], 'funcset')?.[0] ?? '';
        for (let i = 0; i < Math.min(bits.length, ECOS_MAX_FUNCTIONS); i++) funcs[i] = bits[i] === '1';
      } catch {
        for (let start = 0; start < ECOS_MAX_FUNCTIONS; start += 8) {
          const parts = Array.from({ length: 8 }, (_, k) => `func[${start + k}]`).join(', ');
          const r = await this.send(`get(${id}, ${parts})`).catch(() => null);
          for (const l of r?.lines ?? []) {
            for (const a of l.attrs) if (a.key === 'func') funcs[Number(a.args[0])] = Number(a.args[1]) === 1;
          }
        }
      }

      const funcDesc: (FuncDesc | null)[] = new Array(ECOS_MAX_FUNCTIONS).fill(null);
      for (let start = 0; start < ECOS_MAX_FUNCTIONS; start += 8) {
        const parts = Array.from({ length: 8 }, (_, k) => `funcdesc[${start + k}]`).join(', ');
        const r = await this.send(`get(${id}, ${parts})`).catch(() => null);
        for (const l of r?.lines ?? []) {
          for (const a of l.attrs) {
            if (a.key !== 'funcdesc') continue;
            const n = Number(a.args[0]);
            const symbol = Number(a.args[1]);
            if (n >= 0 && n < ECOS_MAX_FUNCTIONS && symbol >= 0) {
              funcDesc[n] = { symbol, moment: a.args.slice(2).includes('moment') };
            }
          }
        }
      }

      let speedIndicator: number | undefined;
      try {
        const si = await this.send(`get(${id}, speedindicator)`);
        speedIndicator = attrNum(si.lines[0], 'speedindicator');
      } catch {
        // oudere firmware kent dit niet
      }
      this.emit({ type: 'loco', id, patch: { funcs, funcDesc, speedIndicator, detailsLoaded: true } });
    } catch (e) {
      this.watched.delete(id);
      throw e;
    }
  }

  private async ensureControl(id: number) {
    if (this.controlled.has(id)) return;
    await this.send(`request(${id}, control, force)`);
    this.controlled.add(id);
  }

  private async withControl<T>(id: number, fn: () => Promise<T>): Promise<T> {
    await this.ensureControl(id);
    try {
      return await fn();
    } catch (e) {
      if (e instanceof EcosError && e.code === 25) {
        // control kwijt: opnieuw aanvragen en nog één keer proberen
        this.controlled.delete(id);
        await this.ensureControl(id);
        return fn();
      }
      throw e;
    }
  }

  /** Snelheid zetten (0..126). Snelle wijzigingen worden samengevoegd. */
  setSpeed(id: number, speed: number) {
    let q = this.speedQueue.get(id);
    if (!q) {
      q = { inflight: false, next: null };
      this.speedQueue.set(id, q);
    }
    q.next = speed;
    if (!q.inflight) this.flushSpeed(id);
  }

  private async flushSpeed(id: number) {
    const q = this.speedQueue.get(id);
    if (!q || q.next === null) return;
    const v = q.next;
    q.next = null;
    q.inflight = true;
    try {
      await this.withControl(id, () => this.send(`set(${id}, speed[${toEcosSpeed(v)}])`));
    } catch {
      // fout wordt bij de volgende actie opnieuw geprobeerd
    } finally {
      q.inflight = false;
      if (q.next !== null) this.flushSpeed(id);
    }
  }

  /** Zet alle locs die deze app bestuurt op snelheid 0 (bij een noodstop). */
  stopAllControlled() {
    for (const id of Array.from(this.controlled)) {
      const q = this.speedQueue.get(id);
      if (q) q.next = null;
      this.send(`set(${id}, speed[0])`).catch(() => {});
    }
  }

  async setDirection(id: number, dir: 0 | 1) {
    const q = this.speedQueue.get(id);
    if (q) q.next = null;
    await this.withControl(id, () => this.send(`set(${id}, dir[${dir}], speed[0])`));
  }

  async setFunction(id: number, n: number, on: boolean) {
    await this.withControl(id, () => this.send(`set(${id}, func[${n}, ${on ? 1 : 0}])`));
  }

  async stopLoco(id: number) {
    const q = this.speedQueue.get(id);
    if (q) q.next = null;
    await this.withControl(id, () => this.send(`set(${id}, stop)`));
  }

  async createLoco(data: { name: string; addr: number; protocol: string }): Promise<number> {
    const b = await this.send(`create(10, addr[${data.addr}], name[${quote(data.name)}], protocol[${data.protocol}], append)`);
    let newId = 0;
    for (const l of b.lines) newId = attrNum(l, 'id') ?? newId;
    await this.loadLocoList();
    return newId;
  }

  async updateLoco(id: number, data: { name?: string; addr?: number; protocol?: string }) {
    await this.withControl(id, async () => {
      if (data.name !== undefined) await this.send(`set(${id}, name[${quote(data.name)}])`);
      if (data.addr !== undefined) await this.send(`set(${id}, addr[${data.addr}])`);
      if (data.protocol !== undefined) await this.send(`set(${id}, protocol[${data.protocol}])`);
    });
    await this.loadLocoList();
  }

  async deleteLoco(id: number) {
    await this.withControl(id, () => this.send(`delete(${id})`));
    this.controlled.delete(id);
    this.watched.delete(id);
    await this.loadLocoList();
  }

  // ---------------------------------------------------------------- wissels en rijwegen

  async loadAccessories() {
    let b: EcosBlock;
    let withState = true;
    try {
      b = await this.send('queryObjects(11, name1, name2, addr, protocol, type, mode, state)');
    } catch {
      withState = false;
      b = await this.send('queryObjects(11, name1, name2, addr, protocol, type, mode)');
    }
    const list: AccessoryInfo[] = b.lines
      .filter((l) => l.id >= 20000)
      .map((l) => ({
        id: l.id,
        name: attr(l, 'name1')?.[0] || `Object ${l.id}`,
        name2: attr(l, 'name2')?.[0] ?? '',
        addr: attrNum(l, 'addr') ?? 0,
        protocol: attr(l, 'protocol')?.[0] ?? '',
        type: attr(l, 'type')?.[0] ?? (l.id >= 30000 ? 'ROUTE' : 'ACCESSORY'),
        mode: attr(l, 'mode')?.[0] ?? '',
        state: attrNum(l, 'state') ?? 0,
      }));
    this.emit({ type: 'accessoryList', list });
    // per object een view voor statuswijzigingen, op de achtergrond (max. 128 objecten)
    void this.watchAccessories(list, withState);
  }

  private async watchAccessories(list: AccessoryInfo[], withState: boolean) {
    for (const a of list.slice(0, 128)) {
      if (!this.open) return;
      await this.send(`request(${a.id}, view)`).catch(() => {});
      if (!withState) {
        const r = await this.send(`get(${a.id}, state)`).catch(() => null);
        const st = r ? attrNum(r.lines[0], 'state') : undefined;
        if (st !== undefined) this.emit({ type: 'accessory', id: a.id, patch: { state: st } });
      }
    }
  }

  async switchAccessory(id: number, state: number) {
    await this.send(`request(${id}, control, force)`);
    try {
      await this.send(`set(${id}, state[${state}])`);
      this.emit({ type: 'accessory', id, patch: { state } });
    } finally {
      await this.send(`release(${id}, control)`).catch(() => {});
    }
  }
}

function parseInfo(b: EcosBlock): EcosInfo {
  const info: EcosInfo = { model: 'ECoS' };
  for (const l of b.lines) {
    for (const a of l.attrs) {
      if (!a.args.length && /^ECoS/i.test(a.key)) info.model = a.key;
      if (a.key === 'ProtocolVersion') info.protocolVersion = a.args[0];
      if (a.key === 'ApplicationVersion') info.applicationVersion = a.args[0];
      if (a.key === 'HardwareVersion') info.hardwareVersion = a.args[0];
    }
  }
  return info;
}
