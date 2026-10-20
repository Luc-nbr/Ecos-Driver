// Kleuren en maten in Apple-stijl (iPadOS, donkere modus): neutrale grafiettinten,
// één amber accentkleur voor wat actief is, rood alleen voor stop, groen voor verbonden/GO.
export const C = {
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
  blue: '#0A84FF',
  track: '#3A3A3C',
  shadow: '#000000',
};

export const R = { sm: 10, md: 14, lg: 18, xl: 22 };

export const F = {
  // Systeemlettertype: op iOS is dit San Francisco.
  heavy: '800' as const,
  bold: '700' as const,
  semi: '600' as const,
  medium: '500' as const,
};

export const shadow = {
  shadowColor: C.shadow,
  shadowOpacity: 0.3,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 8 },
  elevation: 6,
};
