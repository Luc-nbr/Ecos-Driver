import TcpSocket from 'react-native-tcp-socket';
import type { BinaryTransport } from './rfb';

/** Binaire TCP-verbinding (voor VNC) via react-native-tcp-socket. */
export class TcpBinaryTransport implements BinaryTransport {
  onData: (d: Uint8Array) => void = () => {};
  onClose: (e?: Error) => void = () => {};
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
        reject(new Error(`Geen VNC-antwoord van ${this.host}:${this.port}`));
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
        // zonder encoding levert de socket Buffer-objecten (een Uint8Array)
        this.onData(data instanceof Uint8Array ? data : new Uint8Array(data as ArrayBuffer));
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

  send(d: Uint8Array) {
    this.socket?.write(d);
  }

  close() {
    this.socket?.destroy();
    this.finish();
  }
}
