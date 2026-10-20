// Kleuren en maten in Apple-stijl (iPadOS), met een donker en een licht thema.
// Neutrale tinten, één amber accentkleur voor wat actief is, rood alleen voor stop,
// groen voor verbonden/GO.

const dark = {
  bg: '#000000',
  bgDeep: '#0A0A0C',
  sidebar: '#141416',
  panel: '#1C1C1E',
  panel2: '#2C2C2E',
  panelHi: '#3A3A3C',
  border: '#38383A',
  borderSoft: '#2C2C2E',
  accent: '#FF9F0A',
  accentDark: '#C77700',
  accentSoft: 'rgba(255,159,10,0.16)',
  ink: '#000000',
  text: '#FFFFFF',
  textSoft: '#D1D1D6',
  muted: '#8E8E93',
  green: '#30D158',
  red: '#FF453A',
  redDark: '#D70015',
  redSoft: 'rgba(255,69,58,0.16)',
  blue: '#0A84FF',
  track: '#3A3A3C',
  shadow: '#000000',
  toggleOff: '#39393D',
  segTrack: '#1F1F22',
  segOn: '#636366',
  backdrop: 'rgba(0,0,0,0.6)',
  inactiveLine: '#5A5A5F',
  photoLine: '#5A5A5F',
  photoBody: '#48484A',
  photoWin: '#1C1C1E',
  photoBase: '#3A3A3C',
  wheelHi: '#4A4A4E',
  wheelMid: '#2C2C2E',
  wheelLo: '#1A1A1C',
  wheelEdge: '#48484A',
  wheelTick: '#636366',
  wheelHub: '#1C1C1E',
  dimpleLo: '#111113',
  dimpleHi: '#3A3A3C',
  wheelShadow: 0.5,
};

const light: typeof dark = {
  bg: '#F2F2F7',
  bgDeep: '#E5E5EA',
  sidebar: '#EBEBF0',
  panel: '#FFFFFF',
  panel2: '#F0F0F4',
  panelHi: '#E5E5EA',
  border: '#D1D1D6',
  borderSoft: '#E5E5EA',
  accent: '#FF9500',
  accentDark: '#C93400',
  accentSoft: 'rgba(255,149,0,0.14)',
  ink: '#000000',
  text: '#000000',
  textSoft: '#3A3A3C',
  muted: '#6C6C70',
  green: '#248A3D',
  red: '#FF3B30',
  redDark: '#D70015',
  redSoft: 'rgba(255,59,48,0.12)',
  blue: '#007AFF',
  track: '#E5E5EA',
  shadow: '#000000',
  toggleOff: '#E9E9EA',
  segTrack: '#EEEEF0',
  segOn: '#FFFFFF',
  backdrop: 'rgba(0,0,0,0.3)',
  inactiveLine: '#AEAEB2',
  photoLine: '#AEAEB2',
  photoBody: '#C7C7CC',
  photoWin: '#F2F2F7',
  photoBase: '#D1D1D6',
  wheelHi: '#FFFFFF',
  wheelMid: '#E5E5EA',
  wheelLo: '#C7C7CC',
  wheelEdge: '#C7C7CC',
  wheelTick: '#A1A1A6',
  wheelHub: '#F2F2F7',
  dimpleLo: '#C7C7CC',
  dimpleHi: '#FFFFFF',
  wheelShadow: 0.18,
};

export type ThemeName = 'dark' | 'light';
const palettes: Record<ThemeName, typeof dark> = { dark, light };

/** Actieve kleuren. Wordt bij een themawissel bijgewerkt; de app tekent dan alles opnieuw. */
export const C = { ...dark };
export let themeName: ThemeName = 'dark';
let version = 0;

export function applyTheme(name: ThemeName) {
  if (name === themeName) return;
  Object.assign(C, palettes[name]);
  themeName = name;
  version++;
}

/** Stijlen die van het thema afhangen: opnieuw berekend na een themawissel. */
export function themed<T>(make: () => T): () => T {
  let v = -1;
  let cache: T;
  return () => {
    if (v !== version) {
      cache = make();
      v = version;
    }
    return cache;
  };
}

export const R = { sm: 10, md: 14, lg: 18, xl: 22 };

export const F = {
  // Systeemlettertype: op iOS is dit San Francisco.
  heavy: '800' as const,
  bold: '700' as const,
  semi: '600' as const,
  medium: '500' as const,
};

export const shadow = {
  shadowColor: '#000000',
  shadowOpacity: 0.25,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 8 },
  elevation: 6,
};
