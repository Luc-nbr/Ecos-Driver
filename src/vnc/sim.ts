// Nagebouwde VNC-server (RFB 3.8) voor de demo-modus en de tests.
// Tekent een eenvoudig ECoS-achtig scherm van 800×480; aanraken schakelt
// knoppen en schuift een balk, zodat je ziet dat bediening werkt.
import { vncAuthResponse } from './des';
import type { BinaryTransport } from './rfb';

const W = 800;
const H = 480;

interface Btn {
  x: number;
  y: number;
  w: number;
  h: number;
  on: boolean;
}

export class VncSimScreen {
  fb = new Uint8Array(W * H * 4);
  width = W;
  height = H;
  buttons: Btn[] = [];
  level = 0.3;
  private listeners = new Set<(x: number, y: number, w: number, h: number) => void>();

  constructor() {
    for (let side = 0; side < 2; side++) {
      for (let i = 0; i < 8; i++) {
        this.buttons.push({ x: 30 + side * 400 + (i % 4) * 88, y: 250 + Math.floor(i / 4) * 88, w: 76, h: 76, on: i === 0 });
      }
    }
    this.drawAll();
  }

  onChange(fn: (x: number, y: number, w: number, h: number) => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private rect(x: number, y: number, w: number, h: number, r: number, g: number, b: number) {
    for (let yy = Math.max(0, y); yy < Math.min(H, y + h); yy++) {
      let o = (yy * W + Math.max(0, x)) * 4;
      for (let xx = Math.max(0, x); xx < Math.min(W, x + w); xx++) {
        this.fb[o++] = b;
        this.fb[o++] = g;
        this.fb[o++] = r;
        this.fb[o++] = 0;
      }
    }
  }

  private drawAll() {
    this.rect(0, 0, W, H, 233, 238, 244); // achtergrond zoals het ECoS-scherm
    this.rect(0, 0, W, 40, 29, 63, 115); // titelbalk
    this.rect(12, 10, 46, 20, 33, 163, 85); // GO-label
    this.rect(399, 40, 2, H - 40, 197, 207, 219); // scheiding links/rechts
    for (let side = 0; side < 2; side++) {
      this.rect(30 + side * 400, 60, 140, 80, 60, 70, 90); // loc-afbeelding
      this.rect(30 + side * 400 + 20, 90, 100, 24, 255, 201, 23);
    }
    this.drawLevel();
    for (const b of this.buttons) this.drawButton(b);
  }

  private drawLevel() {
    for (let side = 0; side < 2; side++) {
      const x = 190 + side * 400;
      this.rect(x, 160, 180, 24, 201, 211, 224);
      this.rect(x, 160, Math.round(180 * this.level), 24, 46, 158, 91);
    }
  }

  private drawButton(b: Btn) {
    this.rect(b.x, b.y, b.w, b.h, 197, 207, 219);
    if (b.on) this.rect(b.x + 2, b.y + 2, b.w - 4, b.h - 4, 255, 201, 23);
    else this.rect(b.x + 2, b.y + 2, b.w - 4, b.h - 4, 255, 255, 255);
    this.rect(b.x + b.w / 2 - 10, b.y + b.h / 2 - 10, 20, 20, 19, 35, 63);
  }

  private changed(x: number, y: number, w: number, h: number) {
    for (const l of this.listeners) l(x, y, w, h);
  }

  /** Aanraking van een client. */
  pointer(x: number, y: number, down: boolean, wasDown: boolean) {
    if (down && !wasDown) {
      const b = this.buttons.find((k) => x >= k.x && x < k.x + k.w && y >= k.y && y < k.y + k.h);
      if (b) {
        b.on = !b.on;
        this.drawButton(b);
        this.changed(b.x, b.y, b.w, b.h);
        return;
      }
    }
    if (down && y >= 150 && y < 195 && ((x >= 190 && x < 370) || (x >= 590 && x < 770))) {
      const base = x >= 590 ? 590 : 190;
      this.level = Math.max(0, Math.min(1, (x - base) / 180));
      this.drawLevel();
      this.changed(190, 160, 580, 24);
    }
  }
}

let shared: VncSimScreen | null = null;
export const sharedSimScreen = () => (shared ??= new VncSimScreen());

/** Eén verbinding met de nagebouwde VNC-server. */
export class VncSimSession {
  private buf: number[] = [];
  private phase: 'version' | 'security' | 'auth' | 'init' | 'msg' = 'version';
  private challenge = new Uint8Array(16);
  private pending: { incremental: boolean } | null = null;
  private dirty: [number, number, number, number] | null = null;
  private wasDown = false;
  private unsub: () => void;

  constructor(private screen: VncSimScreen, private out: (d: Uint8Array) => void, private password = '') {
    this.unsub = screen.onChange((x, y, w, h) => {
      this.addDirty(x, y, w, h);
      this.flush();
    });
    this.out(Uint8Array.from('RFB 003.008\n', (c) => c.charCodeAt(0)));
  }

  close() {
    this.unsub();
  }

  private addDirty(x: number, y: number, w: number, h: number) {
    if (!this.dirty) {
      this.dirty = [x, y, x + w, y + h];
      return;
    }
    const d = this.dirty;
    this.dirty = [Math.min(d[0], x), Math.min(d[1], y), Math.max(d[2], x + w), Math.max(d[3], y + h)];
  }

  handle(data: Uint8Array) {
    for (const b of data) this.buf.push(b);
    let progress = true;
    while (progress) progress = this.step();
  }

  private take(n: number) {
    return this.buf.splice(0, n);
  }

  private step(): boolean {
    switch (this.phase) {
      case 'version':
        if (this.buf.length < 12) return false;
        this.take(12);
        this.out(this.password ? Uint8Array.from([1, 2]) : Uint8Array.from([1, 1]));
        this.phase = 'security';
        return true;
      case 'security': {
        if (this.buf.length < 1) return false;
        const [t] = this.take(1);
        if (t === 2 && this.password) {
          for (let i = 0; i < 16; i++) this.challenge[i] = Math.floor(Math.random() * 256);
          this.out(this.challenge);
          this.phase = 'auth';
        } else if (t === 1 && !this.password) {
          this.out(Uint8Array.from([0, 0, 0, 0]));
          this.phase = 'init';
        } else {
          this.out(Uint8Array.from([0, 0, 0, 1, 0, 0, 0, 0]));
          this.phase = 'msg';
        }
        return true;
      }
      case 'auth': {
        if (this.buf.length < 16) return false;
        const resp = this.take(16);
        const expect = vncAuthResponse(this.password, this.challenge);
        const ok = resp.every((b, i) => b === expect[i]);
        if (!ok) {
          const reason = Array.from('Wachtwoord onjuist', (c) => c.charCodeAt(0));
          this.out(Uint8Array.from([0, 0, 0, 1, 0, 0, 0, reason.length, ...reason]));
          this.phase = 'msg';
          this.buf = [];
          return false;
        }
        this.out(Uint8Array.from([0, 0, 0, 0]));
        this.phase = 'init';
        return true;
      }
      case 'init': {
        if (this.buf.length < 1) return false;
        this.take(1);
        const name = Array.from('ECoS 50210 (demo)', (c) => c.charCodeAt(0));
        const s = this.screen;
        this.out(
          Uint8Array.from([
            s.width >> 8, s.width & 255, s.height >> 8, s.height & 255,
            32, 24, 0, 1, 0, 255, 0, 255, 0, 255, 16, 8, 0, 0, 0, 0,
            0, 0, 0, name.length, ...name,
          ]),
        );
        this.phase = 'msg';
        return true;
      }
      case 'msg': {
        if (this.buf.length < 1) return false;
        const type = this.buf[0];
        const sizes: Record<number, number> = { 0: 20, 3: 10, 4: 8, 5: 6 };
        if (type === 2) {
          if (this.buf.length < 4) return false;
          const n = (this.buf[2] << 8) | this.buf[3];
          if (this.buf.length < 4 + n * 4) return false;
          this.take(4 + n * 4);
          return true;
        }
        if (type === 6) {
          if (this.buf.length < 8) return false;
          const len = (this.buf[4] << 24) | (this.buf[5] << 16) | (this.buf[6] << 8) | this.buf[7];
          if (this.buf.length < 8 + len) return false;
          this.take(8 + len);
          return true;
        }
        const size = sizes[type];
        if (!size) {
          this.buf = [];
          return false;
        }
        if (this.buf.length < size) return false;
        const m = this.take(size);
        if (type === 3) {
          const incremental = m[1] === 1;
          if (!incremental) this.addDirty(0, 0, this.screen.width, this.screen.height);
          this.pending = { incremental };
          this.flush();
        } else if (type === 5) {
          const down = (m[1] & 1) === 1;
          const x = (m[2] << 8) | m[3];
          const y = (m[4] << 8) | m[5];
          this.screen.pointer(x, y, down, this.wasDown);
          this.wasDown = down;
        }
        return true;
      }
    }
  }

  private flush() {
    if (!this.pending || !this.dirty) return;
    const [x0, y0, x1, y1] = this.dirty;
    this.dirty = null;
    this.pending = null;
    const w = x1 - x0;
    const h = y1 - y0;
    const msg = new Uint8Array(4 + 12 + w * h * 4);
    msg.set([0, 0, 0, 1, x0 >> 8, x0 & 255, y0 >> 8, y0 & 255, w >> 8, w & 255, h >> 8, h & 255, 0, 0, 0, 0]);
    const W4 = this.screen.width * 4;
    for (let row = 0; row < h; row++) {
      const src = (y0 + row) * W4 + x0 * 4;
      msg.set(this.screen.fb.subarray(src, src + w * 4), 16 + row * w * 4);
    }
    this.out(msg);
  }
}

/** Transport naar de nagebouwde VNC-server (zonder netwerk). */
export class SimVncTransport implements BinaryTransport {
  onData: (d: Uint8Array) => void = () => {};
  onClose: (e?: Error) => void = () => {};
  private session: VncSimSession | null = null;

  constructor(private password = '') {}

  async open() {
    this.session = new VncSimSession(sharedSimScreen(), (d) => setTimeout(() => this.onData(d), 2), this.password);
  }

  send(d: Uint8Array) {
    const s = this.session;
    const copy = d.slice();
    setTimeout(() => s?.handle(copy), 2);
  }

  close() {
    this.session?.close();
    this.session = null;
    this.onClose();
  }
}
