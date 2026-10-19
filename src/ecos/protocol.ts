// Parser en helpers voor het ESU ECoS netwerkprotocol (TCP poort 15471).
//
// Een antwoord van de ECoS ziet er zo uit:
//   <REPLY queryObjects(10, name, addr)>
//   1000 name["NS 1700"] addr[1742]
//   <END 0 (OK)>
// En een event (na request(id, view)):
//   <EVENT 1000>
//   1000 speed[64]
//   <END 0 (OK)>

export interface EcosAttr {
  key: string;
  args: string[];
}

export interface EcosLine {
  id: number;
  attrs: EcosAttr[];
  raw: string;
}

export interface EcosBlock {
  type: 'REPLY' | 'EVENT';
  /** Bij REPLY: het commando; bij EVENT: het object-id als tekst. */
  head: string;
  lines: EcosLine[];
  errorCode: number;
  errorText: string;
}

/** Splitst een string op komma's die niet binnen haakjes of quotes staan. */
export function splitTopLevel(input: string, sep = ','): string[] {
  const out: string[] = [];
  let depth = 0;
  let inQuote = false;
  let cur = '';
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (inQuote) {
      cur += c;
      if (c === '"') {
        if (input[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuote = false;
        }
      }
      continue;
    }
    if (c === '"') {
      inQuote = true;
      cur += c;
    } else if (c === '[' || c === '(') {
      depth++;
      cur += c;
    } else if (c === ']' || c === ')') {
      depth--;
      cur += c;
    } else if (c === sep && depth === 0) {
      out.push(cur.trim());
      cur = '';
    } else {
      cur += c;
    }
  }
  if (cur.trim().length) out.push(cur.trim());
  return out;
}

/** Haalt de quotes van een ECoS-string af ("" wordt "). */
export function unquote(v: string): string {
  const t = v.trim();
  if (t.length >= 2 && t.startsWith('"') && t.endsWith('"')) {
    return t.slice(1, -1).replace(/""/g, '"');
  }
  return t;
}

/** Zet een JS-string om naar een ECoS-string met quotes. */
export function quote(v: string): string {
  return '"' + v.replace(/"/g, '""') + '"';
}

/** Parse van attributen zoals `name["NS 1700"] addr[1742] ECoS2`. */
export function parseAttrs(text: string): EcosAttr[] {
  const attrs: EcosAttr[] = [];
  let i = 0;
  const n = text.length;
  while (i < n) {
    while (i < n && /\s/.test(text[i])) i++;
    if (i >= n) break;
    let key = '';
    while (i < n && !/[\s[]/.test(text[i])) key += text[i++];
    if (text[i] === '[') {
      // lees tot de bijbehorende ] (quotes respecteren)
      i++;
      let inQuote = false;
      let depth = 1;
      let body = '';
      while (i < n) {
        const c = text[i];
        if (inQuote) {
          if (c === '"' && text[i + 1] === '"') {
            body += '""';
            i += 2;
            continue;
          }
          if (c === '"') inQuote = false;
          body += c;
          i++;
          continue;
        }
        if (c === '"') inQuote = true;
        if (c === '[') depth++;
        if (c === ']') {
          depth--;
          if (depth === 0) {
            i++;
            break;
          }
        }
        body += c;
        i++;
      }
      attrs.push({ key, args: splitTopLevel(body).map(unquote) });
    } else {
      attrs.push({ key, args: [] });
    }
  }
  return attrs;
}

export function parseLine(raw: string): EcosLine | null {
  const m = /^\s*(\d+)\s*(.*)$/.exec(raw);
  if (!m) return null;
  return { id: Number(m[1]), attrs: parseAttrs(m[2]), raw };
}

export function attr(line: EcosLine, key: string): string[] | undefined {
  const a = line.attrs.find((x) => x.key === key);
  return a?.args;
}

export function attrNum(line: EcosLine, key: string): number | undefined {
  const a = attr(line, key);
  if (!a || !a.length) return undefined;
  const v = Number(a[0]);
  return Number.isFinite(v) ? v : undefined;
}

/**
 * Stroom-parser: voer binnenkomende tekst in met `push`, krijg complete
 * REPLY/EVENT-blokken terug via de callback.
 */
export class EcosStreamParser {
  private buffer = '';
  private current: EcosBlock | null = null;

  constructor(private onBlock: (b: EcosBlock) => void) {}

  push(chunk: string) {
    this.buffer += chunk;
    let idx: number;
    while ((idx = this.buffer.indexOf('\n')) >= 0) {
      const line = this.buffer.slice(0, idx).replace(/\r$/, '');
      this.buffer = this.buffer.slice(idx + 1);
      this.handleLine(line);
    }
  }

  reset() {
    this.buffer = '';
    this.current = null;
  }

  private handleLine(line: string) {
    if (!line.trim()) return;
    if (line.startsWith('<REPLY ')) {
      this.current = { type: 'REPLY', head: line.slice(7, line.lastIndexOf('>')), lines: [], errorCode: 0, errorText: '' };
      return;
    }
    if (line.startsWith('<EVENT ')) {
      this.current = { type: 'EVENT', head: line.slice(7, line.lastIndexOf('>')).trim(), lines: [], errorCode: 0, errorText: '' };
      return;
    }
    if (line.startsWith('<END ')) {
      const m = /^<END\s+(\d+)\s*\(?([^)>]*)\)?>/.exec(line);
      if (this.current) {
        this.current.errorCode = m ? Number(m[1]) : 0;
        this.current.errorText = m ? m[2].trim() : '';
        const done = this.current;
        this.current = null;
        this.onBlock(done);
      }
      return;
    }
    if (this.current) {
      const parsed = parseLine(line);
      if (parsed) this.current.lines.push(parsed);
    }
  }
}

/** Een commando van de client, zoals de simulator het ontleedt. */
export interface ParsedCommand {
  name: string;
  id: number;
  options: EcosAttr[];
}

export function parseCommand(text: string): ParsedCommand | null {
  const m = /^\s*(\w+)\s*\((.*)\)\s*$/.exec(text);
  if (!m) return null;
  const parts = splitTopLevel(m[2]);
  const id = Number(parts[0]);
  const options = parts.slice(1).flatMap((p) => parseAttrs(p));
  return { name: m[1], id, options };
}

/** Protocollen die de ECoS kent voor locs. */
export const LOCO_PROTOCOLS = ['DCC14', 'DCC28', 'DCC128', 'MM14', 'MM27', 'MM28', 'SX32', 'MMFKT'] as const;

export const ECOS_MAX_SPEED = 127;
export const ECOS_MAX_FUNCTIONS = 32;
