import type { Transport } from './transport';

/** In een browser bestaan geen TCP-sockets: alleen de demo-modus werkt op web. */
export class TcpTransport implements Transport {
  onData: (chunk: string) => void = () => {};
  onClose: (error?: Error) => void = () => {};

  constructor(_host: string, _port: number) {}

  async open() {
    throw new Error('Een echte ECoS-verbinding werkt alleen in de iPad-app. Gebruik op web de demo-modus.');
  }

  send() {}

  close() {}
}
