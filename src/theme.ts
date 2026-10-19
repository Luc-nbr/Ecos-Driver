// Kleuren en maten, afgeleid van de stijl-mockups (donkerblauw met geel).
export const C = {
  bg: '#071A44',
  bgDeep: '#051337',
  panel: '#0D2559',
  panel2: '#123068',
  panelHi: '#173A7A',
  border: '#1F4185',
  borderSoft: '#183568',
  yellow: '#FFC917',
  yellowDark: '#E0AC00',
  ink: '#0A1A3F',
  text: '#FFFFFF',
  textSoft: '#D5DEF2',
  muted: '#9FB1D6',
  green: '#34D27B',
  red: '#E5322D',
  redDark: '#B81F1B',
  blue: '#2F7BF5',
  track: '#22407E',
  shadow: '#000814',
};

export const R = { sm: 10, md: 14, lg: 18, xl: 24 };

export const F = {
  // Systeemlettertype; iOS toont SF Pro, wat dicht bij de mockup ligt.
  heavy: '800' as const,
  bold: '700' as const,
  semi: '600' as const,
  medium: '500' as const,
};

export const shadow = {
  shadowColor: C.shadow,
  shadowOpacity: 0.35,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 6 },
  elevation: 6,
};
