import { EcosSimulator, SimSession } from './simulator';

/** Een tekstverbinding naar een ECoS (echt via TCP, of de simulator). */
export interface Transport {
  open(): Promise<void>;
  send(text: string): void;
  close(): void;
  onData: (chunk: string) => void;
  onClose: (error?: Error) => void;
}

// Eén gedeelde simulator, zodat de demo-baan zijn toestand houdt tussen verbindingen.
let sharedSim: EcosSimulator | null = null;

export class SimTransport implements Transport {
  onData: (chunk: string) => void = () => {};
  onClose: (error?: Error) => void = () => {};
  private session: SimSession | null = null;

  async open() {
    if (!sharedSim) sharedSim = new EcosSimulator();
    this.session = sharedSim.connect((text) => {
      // kleine vertraging zoals bij een netwerk
      setTimeout(() => this.onData(text), 4);
    });
  }

  send(text: string) {
    const s = this.session;
    if (!s) return;
    for (const line of text.split('\n')) if (line.trim()) setTimeout(() => s.handle(line), 4);
  }

  close() {
    this.session?.close();
    this.session = null;
    this.onClose();
  }
}
