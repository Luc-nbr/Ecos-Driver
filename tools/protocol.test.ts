/// <reference types="node" />
// Test van parser, client en simulator, zonder iPad. Gebruik: npm test
import assert from 'node:assert/strict';
import net from 'node:net';
import { EcosClient, ClientEvent, toEcosSpeed, fromEcosSpeed } from '../src/ecos/client';
import { EcosStreamParser, parseAttrs, parseCommand, EcosBlock } from '../src/ecos/protocol';
import { SimTransport, Transport } from '../src/ecos/transport';
import { startSimServer } from './ecos-sim-server';

class NodeTcpTransport implements Transport {
  onData: (c: string) => void = () => {};
  onClose: (e?: Error) => void = () => {};
  private s: net.Socket | null = null;
  constructor(private port: number) {}
  open() {
    return new Promise<void>((resolve, reject) => {
      const s = net.createConnection({ host: '127.0.0.1', port: this.port }, () => resolve());
      s.setEncoding('utf8');
      s.on('data', (d: string) => this.onData(d));
      s.on('error', reject);
      s.on('close', () => this.onClose());
      this.s = s;
    });
  }
  send(t: string) {
    this.s?.write(t);
  }
  close() {
    this.s?.destroy();
  }
}

const tests: [string, () => Promise<void> | void][] = [];
const test = (name: string, fn: () => Promise<void> | void) => tests.push([name, fn]);
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

test('parser: attributen met quotes en komma\'s', () => {
  const a = parseAttrs('name["NS ""1700"", blauw"] addr[1742] funcdesc[2, 37, moment] ECoS2');
  assert.deepEqual(a[0], { key: 'name', args: ['NS "1700", blauw'] });
  assert.deepEqual(a[1], { key: 'addr', args: ['1742'] });
  assert.deepEqual(a[2], { key: 'funcdesc', args: ['2', '37', 'moment'] });
  assert.deepEqual(a[3], { key: 'ECoS2', args: [] });
});

test('parser: blokken in stukjes met \\r\\n', () => {
  const blocks: EcosBlock[] = [];
  const p = new EcosStreamParser((b) => blocks.push(b));
  const text = '<REPLY get(1, status)>\r\n1 status[GO]\r\n<END 0 (OK)>\r\n<EVENT 1000>\r\n1000 speed[40]\r\n<END 0 (OK)>\r\n';
  for (let i = 0; i < text.length; i += 7) p.push(text.slice(i, i + 7));
  assert.equal(blocks.length, 2);
  assert.equal(blocks[0].type, 'REPLY');
  assert.equal(blocks[0].lines[0].attrs[0].args[0], 'GO');
  assert.equal(blocks[1].type, 'EVENT');
  assert.equal(blocks[1].head, '1000');
});

test('parser: foutcode', () => {
  const blocks: EcosBlock[] = [];
  const p = new EcosStreamParser((b) => blocks.push(b));
  p.push('<REPLY set(1000, speed[5])>\r\n<END 25 (NERROR_NOCONTROL)>\r\n');
  assert.equal(blocks[0].errorCode, 25);
  assert.equal(blocks[0].errorText, 'NERROR_NOCONTROL');
});

test('commando-parser', () => {
  const c = parseCommand('create(10, addr[3], name["Test, loc"], protocol[DCC28], append)');
  assert.equal(c?.name, 'create');
  assert.equal(c?.id, 10);
  assert.deepEqual(c?.options.map((o) => o.key), ['addr', 'name', 'protocol', 'append']);
  assert.equal(c?.options[1].args[0], 'Test, loc');
});

test('snelheid: 1 is noodstop en wordt overgeslagen', () => {
  assert.equal(toEcosSpeed(0), 0);
  assert.equal(toEcosSpeed(1), 2);
  assert.equal(toEcosSpeed(126), 127);
  assert.equal(fromEcosSpeed(1), 0);
  assert.equal(fromEcosSpeed(127), 126);
});

async function scenario(makeTransport: () => Transport) {
  const events: ClientEvent[] = [];
  const c = new EcosClient(makeTransport());
  c.on((e) => events.push(e));
  await c.connect();
  const list = events.find((e) => e.type === 'locoList');
  assert.ok(list && list.type === 'locoList' && list.locos.length >= 10, 'loclijst geladen');
  const info = events.find((e) => e.type === 'info');
  assert.ok(info && info.type === 'info' && info.info.model === 'ECoS2');
  const accs = events.find((e) => e.type === 'accessoryList');
  assert.ok(accs && accs.type === 'accessoryList' && accs.list.length > 0, 'wissels geladen');

  const id = (list as { locos: { id: number }[] }).locos[0].id;
  await c.watchLoco(id);
  const details = events.find((e): e is Extract<ClientEvent, { type: 'loco' }> => e.type === 'loco' && e.id === id && !!e.patch.detailsLoaded);
  assert.ok(details);
  assert.equal(details.patch.funcDesc?.[2]?.symbol, 37);
  assert.equal(details.patch.funcDesc?.[2]?.moment, true);
  assert.equal(details.patch.speedIndicator, 160);

  c.setSpeed(id, 30);
  c.setSpeed(id, 60);
  c.setSpeed(id, 64);
  await c.setFunction(id, 1, true);
  await wait(50);
  const r = await c.send(`get(${id}, speed, func[1])`);
  assert.match(r.lines.map((l) => l.raw).join(' '), /speed\[65\]/);
  assert.match(r.lines.map((l) => l.raw).join(' '), /func\[1, 1\]/);

  await c.setDirection(id, 1);
  const d = await c.send(`get(${id}, dir, speed)`);
  assert.match(d.lines.map((l) => l.raw).join(' '), /dir\[1\]/);

  // nieuwe loc, aanpassen en verwijderen
  const newId = await c.createLoco({ name: 'Test "loc"', addr: 4444, protocol: 'DCC28' });
  assert.ok(newId > 1000);
  await c.updateLoco(newId, { name: 'Hernoemd', addr: 4445 });
  const q = await c.send(`get(${newId}, name, addr)`);
  assert.match(q.lines.map((l) => l.raw).join(' '), /Hernoemd/);
  await c.deleteLoco(newId);
  const q2 = await c.send('queryObjects(10)');
  assert.ok(!q2.lines.some((l) => l.id === newId), 'loc verwijderd');

  // wissel omzetten
  const acc = (accs as { list: { id: number; state: number }[] }).list[0];
  await c.switchAccessory(acc.id, acc.state ? 0 : 1);
  const s = await c.send(`get(${acc.id}, state)`);
  assert.match(s.lines[0].raw, new RegExp(`state\\[${acc.state ? 0 : 1}\\]`));

  await c.setPower(false);
  await c.setPower(true);
  await c.disconnect();
}

test('client tegen simulator (in geheugen)', () => scenario(() => new SimTransport()));

test('client tegen simulator via TCP + events van tweede client', async () => {
  const server = startSimServer(15999, undefined, false);
  try {
    await scenario(() => new NodeTcpTransport(15999));
    // tweede client ziet de snelheid van de eerste via events
    const a = new EcosClient(new NodeTcpTransport(15999));
    const b = new EcosClient(new NodeTcpTransport(15999));
    const seen: ClientEvent[] = [];
    b.on((e) => seen.push(e));
    await a.connect();
    await b.connect();
    await b.watchLoco(1001);
    a.setSpeed(1001, 50);
    await a.setFunction(1001, 3, true);
    await wait(100);
    assert.ok(seen.some((e) => e.type === 'loco' && e.id === 1001 && e.patch.speed === 50), 'speed event');
    assert.ok(seen.some((e) => e.type === 'func' && e.id === 1001 && e.n === 3 && e.on), 'func event');
    // b neemt control over: a krijgt CONTROL_LOST
    const aSeen: ClientEvent[] = [];
    a.on((e) => aSeen.push(e));
    await a.watchLoco(1001);
    b.setSpeed(1001, 10);
    await wait(100);
    assert.ok(aSeen.some((e) => e.type === 'controlLost' && e.id === 1001), 'control lost');
    await a.disconnect();
    await b.disconnect();
  } finally {
    server.close();
  }
});

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
  console.log(failed ? `${failed} test(s) mislukt` : `alle ${tests.length} tests geslaagd`);
  process.exit(failed ? 1 : 0);
})();
