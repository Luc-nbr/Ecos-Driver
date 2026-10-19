import TcpSocket from 'react-native-tcp-socket';
import type { Transport } from './transport';

/** Echte TCP-verbinding naar de ECoS (iOS/Android via react-native-tcp-socket). */
export class TcpTransport implements Transport {
  onData: (chunk: string) => void = () => {};
  onClose: (error?: Error) => void = () => {};
  private socket: ReturnType<typeof TcpSocket.createConnection> | null = null;
  private closed = false;

  constructor(private host: string, private port: number, private timeoutMs = 6000) {}

  open(): Promise<void> {
    return new Promise((resolve, reject) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        this.socket?.destroy();
        reject(new Error(`Geen antwoord van ${this.host}:${this.port}`));
      }, this.timeoutMs);

      const socket = TcpSocket.createConnection({ host: this.host, port: this.port }, () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve();
      });
      this.socket = socket;
      socket.setNoDelay?.(true);
      socket.on('data', (data: unknown) => {
        const text = typeof data === 'string' ? data : (data as { toString(enc?: string): string }).toString('utf8');
        this.onData(text);
      });
      socket.on('error', (err: Error) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          reject(err);
          return;
        }
        this.finish(err);
      });
      socket.on('close', () => this.finish());
    });
  }

  private finish(err?: Error) {
    if (this.closed) return;
    this.closed = true;
    this.onClose(err);
  }

  send(text: string) {
    // De ECoS heeft een ontvangstbuffer van 1024 bytes: elk commando apart versturen.
    this.socket?.write(text.endsWith('\n') ? text : text + '\n');
  }

  close() {
    this.socket?.destroy();
    this.finish();
  }
}
