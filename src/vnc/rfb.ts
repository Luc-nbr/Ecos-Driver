// VNC-client (RFB-protocol 3.3/3.7/3.8) zonder afhankelijkheden.
// Ondersteunt geen wachtwoord of het klassieke VNC-wachtwoord, de coderingen
// Raw en CopyRect, en schermformaatwijzigingen. Pixels: 32 bit, B,G,R,X in geheugen.
import { vncAuthResponse } from './des';

export interface BinaryTransport {
  open(): Promise<void>;
  send(data: Uint8Array): void;
  close(): void;
  onData: (data: Uint8Array) => void;
  onClose: (error?: Error) => void;
}

export type RfbStatus = 'connecting' | 'connected' | 'closed' | 'error';

type Phase = 'version' | 'secTypes' | 'sec33' | 'challenge' | 'secResult' | 'serverInit' | 'msg' | 'rect' | 'done';

const ENC_RAW = 0;
const ENC_COPYRECT = 1;
const ENC_DESKTOPSIZE = -223;

export class RfbClient {
  width = 0;
  height = 0;
  name = '';
  /** Framebuffer, 4 bytes per pixel: B, G, R, (ongebruikt). */
  fb = new Uint8Array(0);
  status: RfbStatus = 'connecting';
  error: string | null = null;

  onStatus: (s: RfbStatus) => void = () => {};
  onResize: (w: number, h: number) => void = () => {};
  onUpdate: () => void = () => {};

  private buf = new Uint8Array(64 * 1024);
  private start = 0;
  private end = 0;
  private phase: Phase = 'version';
  private minor = 8;
  private rectsLeft = 0;
  private buttons = 0;

  constructor(private transport: BinaryTransport, private password = '') {
    transport.onData = (d) => this.receive(d);
    transport.onClose = (e) => {
      if (this.status === 'error') return;
      this.setStatus('closed', e?.message);
    };
  }

  async connect() {
    this.setStatus('connecting');
    try {
      await this.transport.open();
    } catch (e) {
      this.setStatus('error', (e as Error).message);
    }
  }

  close() {
    this.phase = 'done';
    this.transport.close();
  }

  /** Aanraking/muis: knop 1 ingedrukt of los op pixel (x, y). */
  pointer(x: number, y: number, down: boolean) {
    if (this.status !== 'connected') return;
    this.buttons = down ? 1 : 0;
    const px = Math.max(0, Math.min(this.width - 1, Math.round(x)));
    const py = Math.max(0, Math.min(this.height - 1, Math.round(y)));
    this.transport.send(new Uint8Array([5, this.buttons, px >> 8, px & 255, py >> 8, py & 255]));
  }

  private setStatus(s: RfbStatus, error?: string) {
    this.status = s;
    if (error !== undefined) this.error = error;
    this.onStatus(s);
  }

  private fail(msg: string) {
    this.phase = 'done';
    this.setStatus('error', msg);
    this.transport.close();
  }

  // ---------------------------------------------------------------- bytes

  private receive(d: Uint8Array) {
    const need = this.end - this.start + d.length;
    if (this.end + d.length > this.buf.length) {
      const next = new Uint8Array(Math.max(need * 2, this.buf.length));
      next.set(this.buf.subarray(this.start, this.end));
      this.buf = next;
      this.end -= this.start;
      this.start = 0;
    }
    this.buf.set(d, this.end);
    this.end += d.length;
    try {
      while (this.phase !== 'done' && this.step()) {
        // verder verwerken zolang er genoeg data is
      }
    } catch (e) {
      this.fail((e as Error).message);
    }
    if (this.start === this.end) {
      this.start = 0;
      this.end = 0;
    }
  }

  private avail() {
    return this.end - this.start;
  }
  private u8(o = 0) {
    return this.buf[this.start + o];
  }
  private u16(o = 0) {
    return (this.buf[this.start + o] << 8) | this.buf[this.start + o + 1];
  }
  private u32(o = 0) {
    return ((this.buf[this.start + o] << 24) >>> 0) + (this.buf[this.start + o + 1] << 16) + (this.buf[this.start + o + 2] << 8) + this.buf[this.start + o + 3];
  }
  private s32(o = 0) {
    return this.u32(o) | 0;
  }
  private skip(n: number) {
    this.start += n;
  }
  private text(o: number, n: number) {
    let s = '';
    for (let i = 0; i < n; i++) s += String.fromCharCode(this.buf[this.start + o + i]);
    return s;
  }
  private send(bytes: number[] | Uint8Array) {
    this.transport.send(bytes instanceof Uint8Array ? bytes : Uint8Array.from(bytes));
  }

  // ---------------------------------------------------------------- protocol

  private step(): boolean {
    switch (this.phase) {
      case 'version': {
        if (this.avail() < 12) return false;
        const v = this.text(0, 12);
        this.skip(12);
        const m = /^RFB (\d{3})\.(\d{3})\n$/.exec(v);
        if (!m) throw new Error('Dit is geen VNC-server');
        const minor = Number(m[2]);
        this.minor = Number(m[1]) > 3 || minor >= 8 ? 8 : minor >= 7 ? 7 : 3;
        this.send(Array.from(`RFB 003.00${this.minor}\n`, (c) => c.charCodeAt(0)));
        this.phase = this.minor === 3 ? 'sec33' : 'secTypes';
        return true;
      }
      case 'secTypes': {
        if (this.avail() < 1) return false;
        const n = this.u8();
        if (n === 0) {
          if (this.avail() < 5) return false;
          const len = this.u32(1);
          if (this.avail() < 5 + len) return false;
          throw new Error(`VNC geweigerd: ${this.text(5, len)}`);
        }
        if (this.avail() < 1 + n) return false;
        const types: number[] = [];
        for (let i = 0; i < n; i++) types.push(this.u8(1 + i));
        this.skip(1 + n);
        if (types.includes(1) && !this.password) {
          this.send([1]);
          this.phase = this.minor >= 8 ? 'secResult' : 'serverInit';
          if (this.minor < 8) this.clientInit();
        } else if (types.includes(2)) {
          this.send([2]);
          this.phase = 'challenge';
        } else if (types.includes(1)) {
          this.send([1]);
          this.phase = this.minor >= 8 ? 'secResult' : 'serverInit';
          if (this.minor < 8) this.clientInit();
        } else {
          throw new Error('Deze VNC-beveiliging wordt niet ondersteund');
        }
        return true;
      }
      case 'sec33': {
        if (this.avail() < 4) return false;
        const t = this.u32();
        if (t === 0) {
          if (this.avail() < 8) return false;
          const len = this.u32(4);
          if (this.avail() < 8 + len) return false;
          throw new Error(`VNC geweigerd: ${this.text(8, len)}`);
        }
        this.skip(4);
        if (t === 1) {
          this.clientInit();
        } else if (t === 2) {
          this.phase = 'challenge';
        } else {
          throw new Error('Deze VNC-beveiliging wordt niet ondersteund');
        }
        return true;
      }
      case 'challenge': {
        if (this.avail() < 16) return false;
        const challenge = this.buf.slice(this.start, this.start + 16);
        this.skip(16);
        this.send(vncAuthResponse(this.password, challenge));
        this.phase = 'secResult';
        return true;
      }
      case 'secResult': {
        if (this.avail() < 4) return false;
        const r = this.u32();
        if (r !== 0) {
          if (this.minor >= 8) {
            if (this.avail() < 8) return false;
            const len = this.u32(4);
            if (this.avail() < 8 + len) return false;
          }
          throw new Error('VNC-wachtwoord onjuist');
        }
        this.skip(4);
        this.clientInit();
        return true;
      }
      case 'serverInit': {
        if (this.avail() < 24) return false;
        const nameLen = this.u32(20);
        if (this.avail() < 24 + nameLen) return false;
        this.width = this.u16(0);
        this.height = this.u16(2);
        this.name = this.text(24, nameLen);
        this.skip(24 + nameLen);
        this.fb = new Uint8Array(this.width * this.height * 4);
        // 32 bit true colour, little endian, rood<<16 groen<<8 blauw: in geheugen B,G,R,X
        this.send([0, 0, 0, 0, 32, 24, 0, 1, 0, 255, 0, 255, 0, 255, 16, 8, 0, 0, 0, 0]);
        const encs = [ENC_COPYRECT, ENC_RAW, ENC_DESKTOPSIZE];
        const msg = [2, 0, 0, encs.length];
        for (const e of encs) msg.push((e >>> 24) & 255, (e >>> 16) & 255, (e >>> 8) & 255, e & 255);
        this.send(msg);
        this.requestUpdate(false);
        this.phase = 'msg';
        this.onResize(this.width, this.height);
        this.setStatus('connected');
        return true;
      }
      case 'msg': {
        if (this.avail() < 1) return false;
        const type = this.u8();
        if (type === 0) {
          if (this.avail() < 4) return false;
          this.rectsLeft = this.u16(2);
          this.skip(4);
          this.phase = 'rect';
          if (this.rectsLeft === 0) this.finishUpdate();
          return true;
        }
        if (type === 1) {
          if (this.avail() < 6) return false;
          const n = this.u16(4);
          if (this.avail() < 6 + n * 6) return false;
          this.skip(6 + n * 6);
          return true;
        }
        if (type === 2) {
          this.skip(1);
          return true;
        }
        if (type === 3) {
          if (this.avail() < 8) return false;
          const len = this.u32(4);
          if (this.avail() < 8 + len) return false;
          this.skip(8 + len);
          return true;
        }
        throw new Error(`Onbekend VNC-bericht ${type}`);
      }
      case 'rect': {
        if (this.avail() < 12) return false;
        const x = this.u16(0);
        const y = this.u16(2);
        const w = this.u16(4);
        const h = this.u16(6);
        const enc = this.s32(8);
        if (enc === ENC_RAW) {
          const size = w * h * 4;
          if (this.avail() < 12 + size) return false;
          const src = this.start + 12;
          for (let row = 0; row < h; row++) {
            const dst = ((y + row) * this.width + x) * 4;
            if (y + row >= this.height) break;
            this.fb.set(this.buf.subarray(src + row * w * 4, src + row * w * 4 + Math.min(w, this.width - x) * 4), dst);
          }
          this.skip(12 + size);
        } else if (enc === ENC_COPYRECT) {
          if (this.avail() < 16) return false;
          const sx = this.u16(12);
          const sy = this.u16(14);
          this.skip(16);
          const copy = new Uint8Array(w * h * 4);
          for (let row = 0; row < h; row++) copy.set(this.fb.subarray(((sy + row) * this.width + sx) * 4, ((sy + row) * this.width + sx + w) * 4), row * w * 4);
          for (let row = 0; row < h; row++) this.fb.set(copy.subarray(row * w * 4, (row + 1) * w * 4), ((y + row) * this.width + x) * 4);
        } else if (enc === ENC_DESKTOPSIZE) {
          this.skip(12);
          this.width = w;
          this.height = h;
          this.fb = new Uint8Array(w * h * 4);
          this.onResize(w, h);
        } else {
          throw new Error(`VNC-codering ${enc} wordt niet ondersteund`);
        }
        this.rectsLeft--;
        if (this.rectsLeft <= 0) this.finishUpdate();
        return true;
      }
      default:
        return false;
    }
  }

  private clientInit() {
    this.send([1]); // gedeeld: de ECoS blijft ook zelf bedienbaar
    this.phase = 'serverInit';
  }

  private finishUpdate() {
    this.phase = 'msg';
    this.onUpdate();
    this.requestUpdate(true);
  }

  requestUpdate(incremental: boolean) {
    const w = this.width;
    const h = this.height;
    this.send([3, incremental ? 1 : 0, 0, 0, 0, 0, w >> 8, w & 255, h >> 8, h & 255]);
  }
}

// ---------------------------------------------------------------- afbeelding

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const B64C = Uint8Array.from(B64, (c) => c.charCodeAt(0));

function base64(bytes: Uint8Array): string {
  const out = new Uint8Array(Math.ceil(bytes.length / 3) * 4);
  let o = 0;
  let i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    out[o++] = B64C[n >> 18];
    out[o++] = B64C[(n >> 12) & 63];
    out[o++] = B64C[(n >> 6) & 63];
    out[o++] = B64C[n & 63];
  }
  const rest = bytes.length - i;
  if (rest > 0) {
    const n = (bytes[i] << 16) | (rest > 1 ? bytes[i + 1] << 8 : 0);
    out[o++] = B64C[n >> 18];
    out[o++] = B64C[(n >> 12) & 63];
    out[o++] = rest > 1 ? B64C[(n >> 6) & 63] : 61;
    out[o++] = 61;
  }
  let s = '';
  const CH = 0x8000;
  for (let k = 0; k < out.length; k += CH) s += String.fromCharCode.apply(null, Array.from(out.subarray(k, k + CH)));
  return s;
}

/** Framebuffer omzetten naar een BMP-afbeelding (data-URI) voor <Image>. */
export function framebufferToBmp(fb: Uint8Array, w: number, h: number): string {
  const rowSize = Math.ceil((w * 3) / 4) * 4;
  const size = 54 + rowSize * h;
  const b = new Uint8Array(size);
  const dv = new DataView(b.buffer);
  b[0] = 0x42;
  b[1] = 0x4d;
  dv.setUint32(2, size, true);
  dv.setUint32(10, 54, true);
  dv.setUint32(14, 40, true);
  dv.setInt32(18, w, true);
  dv.setInt32(22, h, true);
  dv.setUint16(26, 1, true);
  dv.setUint16(28, 24, true);
  dv.setUint32(34, rowSize * h, true);
  for (let y = 0; y < h; y++) {
    let src = (h - 1 - y) * w * 4; // BMP begint onderaan
    let dst = 54 + y * rowSize;
    for (let x = 0; x < w; x++) {
      b[dst++] = fb[src];
      b[dst++] = fb[src + 1];
      b[dst++] = fb[src + 2];
      src += 4;
    }
  }
  return 'data:image/bmp;base64,' + base64(b);
}
