import type { BinaryTransport } from './rfb';

/** In een browser bestaan geen TCP-sockets: VNC werkt daar alleen in de demo-modus. */
export class TcpBinaryTransport implements BinaryTransport {
  onData: (d: Uint8Array) => void = () => {};
  onClose: (e?: Error) => void = () => {};
  constructor(_host: string, _port: number) {}
  async open() {
    throw new Error('VNC naar een echte ECoS werkt alleen in de iPad-app.');
  }
  send() {}
  close() {}
}
