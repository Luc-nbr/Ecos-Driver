// Een ECoS-simulator die hetzelfde tekstprotocol spreekt als een echte ECoS.
// Wordt gebruikt voor de demo-modus in de app en door tools/ecos-sim-server.ts
// (een TCP-server op poort 15471 om de app zonder ECoS te testen).
import { EcosAttr, parseCommand, quote } from './protocol';

interface SimLoco {
  id: number;
  name: string;
  addr: number;
  protocol: string;
  speed: number;
  dir: number;
  funcs: number[]; // 32 bits als 0/1
  funcdesc: { symbol: number; moment: boolean }[];
  speedindicator: number;
}

interface SimAccessory {
  id: number;
  name1: string;
  name2: string;
  addr: number;
  protocol: string;
  type: 'ACCESSORY' | 'ROUTE';
  mode: 'SWITCH' | 'PULSE';
  state: number;
}

type Send = (text: string) => void;

function fd(symbols: Array<number | [number, boolean]>) {
  const out: { symbol: number; moment: boolean }[] = [];
  for (let i = 0; i < 32; i++) {
    const s = symbols[i];
    if (s === undefined) out.push({ symbol: i < 16 ? 2 : -1, moment: false });
    else if (Array.isArray(s)) out.push({ symbol: s[0], moment: s[1] });
    else out.push({ symbol: s, moment: false });
  }
  return out;
}

export class EcosSimulator {
  status: 'GO' | 'STOP' = 'GO';
  locos = new Map<number, SimLoco>();
  accessories = new Map<number, SimAccessory>();
  private sessions = new Set<SimSession>();
  private nextLocoId = 1000;

  constructor() {
    const add = (name: string, addr: number, protocol: string, symbols: Array<number | [number, boolean]>, vmax: number) => {
      const id = this.nextLocoId++;
      this.locos.set(id, {
        id, name, addr, protocol, speed: 0, dir: 0,
        funcs: new Array(32).fill(0), funcdesc: fd(symbols), speedindicator: vmax,
      });
    };
    add('NS 1774', 1774, 'DCC128', [3, 5, [37, true], 40, 34, 260, 32, 9, [263, true], 7], 160);
    add('NS 186 TRAXX', 1001, 'DCC128', [3, [37, true], 260, 34, 7, 39], 160);
    add('NS ICM Koploper', 1002, 'DCC128', [3, [37, true], 39, 40, 9, 260], 140);
    add('DB BR 218', 218, 'MM28', [3, 7, [37, true], 10, 11, 32], 140);
    add('NS 2454', 2454, 'DCC28', [3, [37, true], 7, 10], 80);
    add('NS 6400', 6401, 'DCC128', [3, 7, [37, true], 10, 32, 40], 120);
    add('Arriva GTW', 369, 'DCC128', [3, [37, true], 39, 9], 140);
    add('NS 3737 stoom', 3737, 'DCC128', [3, 7, [38, true], 33, 36, 1287], 90);
    add('NS 1200', 1215, 'MM27', [3, [37, true], 7, 34], 150);
    add('Thalys PBKA', 4301, 'DCC128', [3, [37, true], 34, 7, 9], 300);
    add('NS Sprinter SLT', 2601, 'DCC128', [3, [37, true], 39, 9, 260], 160);
    add('Railion 6513', 6513, 'DCC28', [3, 7, [37, true], 10], 100);

    const acc = (name1: string, name2: string, addr: number, type: 'ACCESSORY' | 'ROUTE', state = 0) => {
      const id = type === 'ROUTE' ? 30000 + this.accessories.size : 20000 + this.accessories.size;
      this.accessories.set(id, { id, name1, name2, addr, protocol: 'DCC', type, mode: type === 'ROUTE' ? 'PULSE' : 'SWITCH', state });
    };
    acc('Wissel 1', 'Station Dorp', 1, 'ACCESSORY');
    acc('Wissel 2', 'Station Dorp', 2, 'ACCESSORY', 1);
    acc('Wissel 3', 'Bocht oost', 3, 'ACCESSORY');
    acc('Wissel 4', 'Opstelterrein', 4, 'ACCESSORY', 1);
    acc('Sein A', 'Inrit', 10, 'ACCESSORY');
    acc('Utrecht CS spoor 5', 'Rijweg', 0, 'ROUTE');
    acc('Station Dorp spoor 1', 'Rijweg', 0, 'ROUTE');
  }

  connect(send: Send): SimSession {
    const s = new SimSession(this, send);
    this.sessions.add(s);
    return s;
  }

  disconnect(s: SimSession) {
    this.sessions.delete(s);
    for (const id of s.controls) this.controlOwner.delete(id);
  }

  controlOwner = new Map<number, SimSession>();

  /** Stuur een event naar sessies met een view, behalve naar de bron als die control heeft. */
  emit(objectId: number, lines: string[], origin?: SimSession) {
    for (const s of this.sessions) {
      if (!s.views.has(objectId)) continue;
      if (origin && s === origin && this.controlOwner.get(objectId) === s) continue;
      s.send(`<EVENT ${objectId}>\r\n${lines.map((l) => l + '\r\n').join('')}<END 0 (OK)>\r\n`);
    }
  }

  createLoco(name: string, addr: number, protocol: string): SimLoco {
    const id = Math.max(this.nextLocoId, ...Array.from(this.locos.keys()).map((k) => k + 1));
    this.nextLocoId = id + 1;
    const loco: SimLoco = {
      id, name, addr, protocol, speed: 0, dir: 0,
      funcs: new Array(32).fill(0), funcdesc: fd([3]), speedindicator: 0,
    };
    this.locos.set(id, loco);
    return loco;
  }
}

class SimError extends Error {
  constructor(public code: number, public text: string) {
    super(text);
  }
}

export class SimSession {
  views = new Set<number>();
  controls = new Set<number>();

  constructor(private sim: EcosSimulator, public send: Send) {}

  close() {
    this.sim.disconnect(this);
  }

  handle(line: string) {
    const text = line.trim();
    if (!text) return;
    let body: string[] = [];
    let code = 0;
    let msg = 'OK';
    try {
      const cmd = parseCommand(text);
      if (!cmd) throw new SimError(2, 'NERROR_UNKNOWNCMD');
      body = this.exec(cmd.name, cmd.id, cmd.options);
    } catch (e) {
      if (e instanceof SimError) {
        code = e.code;
        msg = e.text;
      } else {
        code = 1;
        msg = 'NERROR_INTERNAL';
      }
    }
    this.send(`<REPLY ${text}>\r\n${body.map((l) => l + '\r\n').join('')}<END ${code} (${msg})>\r\n`);
  }

  private requireControl(id: number) {
    if (this.sim.controlOwner.get(id) !== this) throw new SimError(25, 'NERROR_NOCONTROL');
  }

  private locoAttr(l: SimLoco, a: EcosAttr): string | null {
    switch (a.key) {
      case 'name': return `name[${quote(l.name)}]`;
      case 'addr': return `addr[${l.addr}]`;
      case 'protocol': return `protocol[${l.protocol}]`;
      case 'speed': return `speed[${l.speed}]`;
      case 'speedstep': return `speedstep[${Math.round((l.speed / 127) * 126)}]`;
      case 'dir': return `dir[${l.dir}]`;
      case 'speedindicator': return `speedindicator[${l.speedindicator}]`;
      case 'funcset': return `funcset[${l.funcs.join('')}]`;
      case 'func': {
        const n = Number(a.args[0]);
        return `func[${n}, ${l.funcs[n] ?? 0}]`;
      }
      case 'funcdesc':
      case 'funcexists': {
        const n = Number(a.args[0]);
        const d = l.funcdesc[n];
        if (!d) return `${a.key}[${n}, -2]`;
        return `${a.key}[${n}, ${d.symbol}${d.moment ? ', moment' : ''}]`;
      }
      default:
        return null;
    }
  }

  private accAttr(x: SimAccessory, a: EcosAttr): string | null {
    switch (a.key) {
      case 'name1': return `name1[${quote(x.name1)}]`;
      case 'name2': return `name2[${quote(x.name2)}]`;
      case 'name3': return `name3[""]`;
      case 'addr': return `addr[${x.addr}]`;
      case 'protocol': return `protocol[${x.protocol}]`;
      case 'type': return `type[${x.type}]`;
      case 'mode': return `mode[${x.mode}]`;
      case 'state': return `state[${x.state}]`;
      case 'switching': return `switching[0]`;
      default: return null;
    }
  }

  private exec(name: string, id: number, opts: EcosAttr[]): string[] {
    const sim = this.sim;
    const has = (k: string) => opts.some((o) => o.key === k);
    switch (name) {
      case 'get': {
        if (id === 1) {
          const out: string[] = [];
          for (const o of opts) {
            if (o.key === 'status') out.push(`1 status[${sim.status}]`);
            if (o.key === 'info') {
              out.push('1 ECoS2', '1 ProtocolVersion[0.5]', '1 ApplicationVersion[4.2.9 (simulator)]', '1 HardwareVersion[2.1]');
            }
          }
          return out;
        }
        const l = sim.locos.get(id);
        if (l) {
          return opts.map((o) => this.locoAttr(l, o)).filter(Boolean).map((s) => `${id} ${s}`);
        }
        const x = sim.accessories.get(id);
        if (x) return opts.map((o) => this.accAttr(x, o)).filter(Boolean).map((s) => `${id} ${s}`);
        throw new SimError(15, 'NERROR_UNKNOWNID');
      }
      case 'queryObjects': {
        if (id === 10) {
          return Array.from(sim.locos.values()).map((l) => {
            const parts = opts.map((o) => this.locoAttr(l, o)).filter(Boolean);
            return [String(l.id), ...parts].join(' ');
          });
        }
        if (id === 11) {
          return Array.from(sim.accessories.values()).map((x) => {
            const parts = opts.map((o) => this.accAttr(x, o)).filter(Boolean);
            return [String(x.id), ...parts].join(' ');
          });
        }
        if (id === 26) return [];
        throw new SimError(15, 'NERROR_UNKNOWNID');
      }
      case 'request': {
        if (id !== 1 && id !== 10 && id !== 11 && !sim.locos.has(id) && !sim.accessories.has(id)) {
          throw new SimError(15, 'NERROR_UNKNOWNID');
        }
        if (has('view')) this.views.add(id);
        if (has('control')) {
          const owner = sim.controlOwner.get(id);
          if (owner && owner !== this) {
            if (!has('force')) throw new SimError(25, 'NERROR_NOCONTROL');
            owner.controls.delete(id);
            if (owner.views.has(id)) owner.send(`<EVENT ${id}>\r\n${id} msg[CONTROL_LOST]\r\n<END 0 (OK)>\r\n`);
          }
          sim.controlOwner.set(id, this);
          this.controls.add(id);
        }
        return [];
      }
      case 'release': {
        if (has('view')) this.views.delete(id);
        if (has('control') && sim.controlOwner.get(id) === this) {
          sim.controlOwner.delete(id);
          this.controls.delete(id);
        }
        return [];
      }
      case 'set': {
        if (id === 1) {
          if (has('go')) sim.status = 'GO';
          if (has('stop')) sim.status = 'STOP';
          sim.emit(1, [`1 status[${sim.status}]`]);
          return [];
        }
        if (id === 11) return [];
        const l = sim.locos.get(id);
        if (l) {
          this.requireControl(id);
          const changed: string[] = [];
          for (const o of opts) {
            if (o.key === 'speed') {
              l.speed = Math.max(0, Math.min(127, Number(o.args[0])));
              if (l.speed === 1) l.speed = 0; // 1 = noodstop
              changed.push(`speed[${l.speed}]`);
            } else if (o.key === 'dir') {
              l.dir = Number(o.args[0]) ? 1 : 0;
              changed.push(`dir[${l.dir}]`);
            } else if (o.key === 'stop') {
              l.speed = 0;
              changed.push('speed[0]');
            } else if (o.key === 'func') {
              const n = Number(o.args[0]);
              l.funcs[n] = Number(o.args[1]) ? 1 : 0;
              changed.push(`func[${n}, ${l.funcs[n]}]`);
            } else if (o.key === 'name') {
              l.name = o.args[0];
              changed.push(`name[${quote(l.name)}]`);
            } else if (o.key === 'addr') {
              l.addr = Number(o.args[0]);
              changed.push(`addr[${l.addr}]`);
            } else if (o.key === 'protocol') {
              l.protocol = o.args[0];
              changed.push(`protocol[${l.protocol}]`);
            }
          }
          if (changed.length) sim.emit(id, changed.map((c) => `${id} ${c}`), this);
          return [];
        }
        const x = sim.accessories.get(id);
        if (x) {
          this.requireControl(id);
          const st = opts.find((o) => o.key === 'state');
          if (st) {
            x.state = Number(st.args[0]);
            sim.emit(id, [`${id} state[${x.state}]`], this);
            if (x.type === 'ROUTE') x.state = 0;
          }
          return [];
        }
        throw new SimError(15, 'NERROR_UNKNOWNID');
      }
      case 'create': {
        if (id !== 10) throw new SimError(15, 'NERROR_UNKNOWNID');
        const get = (k: string) => opts.find((o) => o.key === k)?.args[0];
        const loco = sim.createLoco(get('name') ?? 'Nieuwe loc', Number(get('addr') ?? 3), get('protocol') ?? 'DCC128');
        sim.emit(10, ['10 msg[LIST_CHANGED]', `${loco.id} appended`, `10 size[${sim.locos.size}]`]);
        return [`10 id[${loco.id}]`];
      }
      case 'delete': {
        if (!sim.locos.has(id)) throw new SimError(15, 'NERROR_UNKNOWNID');
        this.requireControl(id);
        sim.locos.delete(id);
        sim.controlOwner.delete(id);
        this.controls.delete(id);
        sim.emit(10, ['10 msg[LIST_CHANGED]', `${id} removed`, `10 size[${sim.locos.size}]`]);
        return [];
      }
      default:
        throw new SimError(2, 'NERROR_UNKNOWNCMD');
    }
  }
}
