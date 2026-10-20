/// <reference types="node" />
// Test van de VNC-client tegen de nagebouwde VNC-server. Gebruik: npm test
import assert from 'node:assert/strict';
import net from 'node:net';
import { desEncryptBlock } from '../src/vnc/des';
import { BinaryTransport, framebufferToBmp, RfbClient } from '../src/vnc/rfb';
import { SimVncTransport } from '../src/vnc/sim';
import { startVncSimServer } from './ecos-sim-server';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const hex = (s: string) => Uint8Array.from(s.match(/../g)!.map((h) => parseInt(h, 16)));

class NodeBinaryTransport implements BinaryTransport {
  onData: (d: Uint8Array) => void = () => {};
  onClose: (e?: Error) => void = () => {};
  private s: net.Socket | null = null;
  constructor(private port: number) {}
  open() {
    return new Promise<void>((resolve, reject) => {
      const s = net.createConnection({ host: '127.0.0.1', port: this.port }, () => resolve());
      // in kleine stukjes doorgeven, om het opknippen van berichten te testen
      s.on('data', (d: Buffer) => {
        for (let i = 0; i < d.length; i += 997) this.onData(new Uint8Array(d.subarray(i, i + 997)));
      });
      s.on('error', reject);
      s.on('close', () => this.onClose());
      this.s = s;
    });
  }
  send(d: Uint8Array) {
    this.s?.write(d);
  }
  close() {
    this.s?.destroy();
  }
}

const px = (c: RfbClient, x: number, y: number) => {
  const o = (y * c.width + x) * 4;
  return [c.fb[o + 2], c.fb[o + 1], c.fb[o]]; // R, G, B
};

async function connected(c: RfbClient) {
  for (let i = 0; i < 100 && c.status === 'connecting'; i++) await wait(10);
  await wait(60);
}

async function scenario(c: RfbClient) {
  let updates = 0;
  c.onUpdate = () => updates++;
  await c.connect();
  await connected(c);
  assert.equal(c.status, 'connected', c.error ?? '');
  assert.equal(c.width, 800);
  assert.equal(c.height, 480);
  assert.equal(c.name, 'ECoS 50210 (demo)');
  assert.ok(updates >= 1, 'eerste beeld ontvangen');
  assert.deepEqual(px(c, 5, 300), [233, 238, 244], 'achtergrond');
  const before = px(c, 130, 260);
  c.pointer(130, 260, true);
  c.pointer(130, 260, false);
  await wait(120);
  const after = px(c, 130, 260);
  assert.notDeepEqual(after, before, 'knop veranderd na aanraken');
  const bmp = framebufferToBmp(c.fb, c.width, c.height);
  assert.ok(bmp.startsWith('data:image/bmp;base64,Qk'), 'BMP-afbeelding');
  c.close();
}

const tests: [string, () => Promise<void> | void][] = [
  ['DES-testvector', () => {
    const out = Buffer.from(desEncryptBlock(hex('133457799BBCDFF1'), hex('0123456789ABCDEF'))).toString('hex');
    assert.equal(out, '85e813540f0ab405');
  }],
  ['VNC zonder wachtwoord (in geheugen)', () => scenario(new RfbClient(new SimVncTransport()))],
  ['VNC met wachtwoord (in geheugen)', () => scenario(new RfbClient(new SimVncTransport('ecos'), 'ecos'))],
  ['VNC met fout wachtwoord', async () => {
    const c = new RfbClient(new SimVncTransport('ecos'), 'fout');
    await c.connect();
    await wait(150);
    assert.equal(c.status, 'error');
    assert.match(c.error ?? '', /wachtwoord/i);
  }],
  ['VNC via TCP, in stukjes', async () => {
    const server = startVncSimServer(15901, 'geheim', false);
    try {
      await scenario(new RfbClient(new NodeBinaryTransport(15901), 'geheim'));
    } finally {
      server.close();
    }
  }],
];

(async () => {
  let failed = 0;
  for (const [name, fn] of tests) {
    try {
      await fn();
      console.log(`ok   ${name}`);
    } catch (e) {
      failed++;
      console.log(`FAIL ${name}\n     ${(e as Error).stack}`);
    }
  }
  console.log(failed ? `${failed} VNC-test(s) mislukt` : `alle ${tests.length} VNC-tests geslaagd`);
  process.exit(failed ? 1 : 0);
})();
