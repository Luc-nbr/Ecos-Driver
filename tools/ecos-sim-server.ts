/// <reference types="node" />
// Start een nep-ECoS op TCP-poort 15471 (of PORT), zodat je de app op de iPad
// kunt testen zonder echte centrale. Gebruik: npm run sim
import http from 'node:http';
import net from 'node:net';
import { EcosSimulator } from '../src/ecos/simulator';
import { sharedSimScreen, VncSimSession } from '../src/vnc/sim';

export function startSimServer(port: number, sim = new EcosSimulator(), log = true) {
  const server = net.createServer((socket: net.Socket) => {
    const who = `${socket.remoteAddress}:${socket.remotePort}`;
    if (log) console.log(`+ verbinding van ${who}`);
    const session = sim.connect((text) => socket.write(text));
    let buf = '';
    socket.setEncoding('utf8');
    socket.on('data', (d: string) => {
      buf += d;
      let i: number;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i).replace(/\r$/, '');
        buf = buf.slice(i + 1);
        if (log && line.trim()) console.log(`  ${who} > ${line}`);
        session.handle(line);
      }
    });
    socket.on('close', () => {
      session.close();
      if (log) console.log(`- ${who} weg`);
    });
    socket.on('error', () => {});
  });
  server.listen(port);
  return server;
}

/** Nep-VNC-server (het ECoS-scherm) op poort 5900, optioneel met wachtwoord. */
export function startVncSimServer(port: number, password = '', log = true) {
  const server = net.createServer((socket: net.Socket) => {
    if (log) console.log(`+ VNC van ${socket.remoteAddress}`);
    const session = new VncSimSession(sharedSimScreen(), (d) => socket.write(d), password);
    socket.on('data', (d: Buffer) => session.handle(new Uint8Array(d)));
    socket.on('close', () => session.close());
    socket.on('error', () => {});
  });
  server.listen(port);
  return server;
}

/** Een simpel loc-plaatje als 24-bit BMP (zoals de ECoS ze levert), per index een andere kleur. */
export function simLocoBmp(index: number): Buffer {
  const w = 190;
  const h = 64;
  const row = Math.ceil((w * 3) / 4) * 4;
  const buf = Buffer.alloc(54 + row * h);
  buf.write('BM', 0);
  buf.writeUInt32LE(buf.length, 2);
  buf.writeUInt32LE(54, 10);
  buf.writeUInt32LE(40, 14);
  buf.writeInt32LE(w, 18);
  buf.writeInt32LE(h, 22);
  buf.writeUInt16LE(1, 26);
  buf.writeUInt16LE(24, 28);
  const colors = [[255, 201, 23], [200, 16, 46], [74, 134, 208], [46, 158, 91], [120, 120, 130]];
  const [r, g, b] = colors[index % colors.length];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const yy = h - 1 - y; // BMP begint onderaan
      const body = yy > 12 && yy < 48 && x > 8 && x < 182;
      const window = body && yy > 18 && yy < 28 && (x % 30) > 10 && (x % 30) < 24;
      const wheel = yy >= 48 && yy < 60 && [30, 52, 138, 160].some((c) => Math.abs(x - c) < 7);
      const [pr, pg, pb] = window ? [20, 30, 50] : body ? [r, g, b] : wheel ? [60, 60, 66] : [255, 255, 255];
      const o = 54 + y * row + x * 3;
      buf[o] = pb;
      buf[o + 1] = pg;
      buf[o + 2] = pr;
    }
  }
  return buf;
}

/** Nep-webserver van de ECoS: /loco/image?type=internal&index=N. */
export function startHttpSimServer(port: number, log = true) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://ecos');
    if (url.pathname === '/loco/image') {
      const index = Number(url.searchParams.get('index') ?? 0);
      if (log) console.log(`  plaatje ${url.searchParams.get('type')} ${index}`);
      res.writeHead(200, { 'Content-Type': 'image/bmp' });
      res.end(simLocoBmp(index));
      return;
    }
    res.writeHead(404);
    res.end();
  });
  server.on('error', (e) => console.log(`Webserver voor loc-plaatjes kon niet starten op poort ${port}: ${e.message}`));
  server.listen(port);
  return server;
}

if (process.argv[1] && /ecos-sim-server/.test(process.argv[1])) {
  const port = Number(process.env.PORT ?? 15471);
  startSimServer(port);
  const vncPort = Number(process.env.VNC_PORT ?? 5900);
  startVncSimServer(vncPort, process.env.VNC_PASSWORD ?? '');
  const httpPort = Number(process.env.HTTP_PORT ?? 80);
  startHttpSimServer(httpPort);
  console.log(`ECoS-simulator luistert op poort ${port}, VNC op poort ${vncPort}, loc-plaatjes op poort ${httpPort}`);
}
