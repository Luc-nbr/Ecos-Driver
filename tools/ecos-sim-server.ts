/// <reference types="node" />
// Start een nep-ECoS op TCP-poort 15471 (of PORT), zodat je de app op de iPad
// kunt testen zonder echte centrale. Gebruik: npm run sim
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

if (process.argv[1] && /ecos-sim-server/.test(process.argv[1])) {
  const port = Number(process.env.PORT ?? 15471);
  startSimServer(port);
  const vncPort = Number(process.env.VNC_PORT ?? 5900);
  startVncSimServer(vncPort, process.env.VNC_PASSWORD ?? '');
  console.log(`ECoS-simulator luistert op poort ${port}, VNC op poort ${vncPort}`);
}
