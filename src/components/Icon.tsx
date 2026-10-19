import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

// Eenvoudige lijn-iconen (24×24), getekend met stroke zodat ze elke kleur aannemen.
const PATHS: Record<string, string[]> = {
  train: ['M6 16V7a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v9a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z', 'M6 11h12', 'M9 15h.01M15 15h.01', 'M8 18l-2 3M16 18l2 3'],
  light: ['M9 18h6M10 21h4', 'M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z'],
  headlight: ['M10 6a6 6 0 0 0 0 12h3V6z', 'M17 8h4M17 12h4M17 16h4'],
  taillight: ['M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z', 'M12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4'],
  horn: ['M3 10v4h3l7 4V6L6 10H3z', 'M13 8l8-3v14l-8-3'],
  sound: ['M4 9v6h4l5 4V5L8 9H4z', 'M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11'],
  fan: ['M12 12m-1.5 0a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0', 'M12 10.5C11 7 12 4 14.5 4S18 7 13.5 11', 'M13.5 12c3.5-1 6.5 0 6.5 2.5S17 18 13 13.5', 'M12 13.5c1 3.5 0 6.5-2.5 6.5S6 17 10.5 12.5', 'M10.5 12C7 13 4 12 4 9.5S7 6 11 10.5'],
  compressor: ['M4 8h9v10H4z', 'M13 11h3a3 3 0 0 1 3 3v4', 'M7 8V5h3v3', 'M7 13h3'],
  pantograph: ['M4 20h16', 'M6 17h12', 'M8 17l4-6 4 6', 'M12 11l-5-5h10', 'M5 4h14'],
  coupling: ['M9 15l6-6', 'M10.5 6.5l2-2a3.5 3.5 0 0 1 5 5l-2 2', 'M13.5 17.5l-2 2a3.5 3.5 0 0 1-5-5l2-2'],
  driver: ['M12 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M5 21v-3a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v3', 'M8 6h8'],
  cabin: ['M4 6h16v12H4z', 'M4 11h16', 'M8 6v5M16 6v5'],
  door: ['M6 3h12v18H6z', 'M12 3v18', 'M10 12h.01M14 12h.01'],
  snow: ['M12 2v20M4 7l16 10M20 7L4 17', 'M9 4l3 2 3-2M9 20l3-2 3 2'],
  bell: ['M6 16V11a6 6 0 0 1 12 0v5l2 2H4z', 'M10 21h4'],
  smoke: ['M7 20h10', 'M9 20v-6h6v6', 'M10 10c-2-1-2-3 0-4s2-3 0-4', 'M14 10c-2-1-2-3 0-4'],
  brake: ['M12 12m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0', 'M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14'],
  shunting: ['M3 12h18', 'M7 8l-4 4 4 4M17 8l4 4-4 4'],
  speaker: ['M3 10h4l5-4v12l-5-4H3z', 'M16 9l5 6M21 9l-5 6'],
  more: ['M5 12h.01M12 12h.01M19 12h.01'],
  button: ['M4 7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3z', 'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z'],
  hand: ['M9 11V5a1.5 1.5 0 0 1 3 0v5', 'M12 10V4a1.5 1.5 0 0 1 3 0v6', 'M15 10V6a1.5 1.5 0 0 1 3 0v8a6 6 0 0 1-6 6h-1a6 6 0 0 1-5-2.7L3.5 14a1.5 1.5 0 0 1 2.5-1.7L9 15'],
  music: ['M9 18V5l11-2v13', 'M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM17 19a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'],
  warning: ['M12 3L2 20h20z', 'M12 10v4M12 17h.01'],
  stopSquare: ['M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0', 'M9 9h6v6H9z'],
  play: ['M8 5l11 7-11 7z'],
  power: ['M12 3v8', 'M6.3 7.3a8 8 0 1 0 11.4 0'],
  settings: ['M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M19.4 13a7.5 7.5 0 0 0 0-2l2-1.6-2-3.4-2.4 1a7.5 7.5 0 0 0-1.7-1L15 3.5h-4l-.4 2.5a7.5 7.5 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.6a7.5 7.5 0 0 0 0 2l-2 1.6 2 3.4 2.4-1a7.5 7.5 0 0 0 1.7 1l.4 2.5h4l.4-2.5a7.5 7.5 0 0 0 1.7-1l2.4 1 2-3.4z'],
  grid: ['M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z'],
  duo: ['M3 5h8v14H3zM13 5h8v14h-8z'],
  route: ['M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4z', 'M6 15V9a3 3 0 0 1 3-3h7', 'M8 17h7a3 3 0 0 0 3-3V9'],
  turnout: ['M4 20h16', 'M4 20C10 20 14 14 20 6'],
  track: ['M8 3v18M16 3v18', 'M5 6h14M5 10h14M5 14h14M5 18h14'],
  plus: ['M12 5v14M5 12h14'],
  minus: ['M5 12h14'],
  trash: ['M4 7h16', 'M10 11v6M14 11v6', 'M6 7l1 13h10l1-13', 'M9 7V4h6v3'],
  edit: ['M4 20h4L19 9l-4-4L4 16z', 'M13 7l4 4'],
  camera: ['M4 8h3l2-3h6l2 3h3v11H4z', 'M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'],
  image: ['M4 5h16v14H4z', 'M4 16l5-5 4 4 3-3 4 4', 'M15 9h.01'],
  wifi: ['M2 9a15 15 0 0 1 20 0', 'M5 12.5a10 10 0 0 1 14 0', 'M8.5 16a5 5 0 0 1 7 0', 'M12 19.5h.01'],
  check: ['M5 12l5 5L20 7'],
  close: ['M6 6l12 12M18 6L6 18'],
  chevronRight: ['M9 6l6 6-6 6'],
  chevronLeft: ['M15 6l-6 6 6 6'],
  chevronDown: ['M6 9l6 6 6-6'],
  chevronUp: ['M6 15l6-6 6 6'],
  arrowUp: ['M12 20V5', 'M6 11l6-6 6 6'],
  arrowDown: ['M12 4v15', 'M6 13l6 6 6-6'],
  neutral: ['M12 12m-6 0a6 6 0 1 0 12 0a6 6 0 1 0-12 0'],
  search: ['M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z', 'M20 20l-4-4'],
  link: ['M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1', 'M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1'],
  chart: ['M5 20V14M10 20V9M15 20V12M20 20V5'],
  bolt: ['M13 2L4 14h7l-1 8 9-12h-7z'],
  gauge: ['M4 16a8 8 0 1 1 16 0', 'M12 16l4-5', 'M12 16h.01'],
  device: ['M3 5h18v12H3z', 'M8 21h8M12 17v4', 'M8 11a1.5 1.5 0 1 0 0-.01M16 11a1.5 1.5 0 1 0 0-.01'],
  refresh: ['M20 12a8 8 0 1 1-2.3-5.7', 'M20 4v5h-5'],
  star: ['M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z'],
  steam: ['M5 18h12a3 3 0 0 0 0-6H9V8H5z', 'M9 8V5h3', 'M15 9c0-2 2-2 2-4'],
  lightning: ['M13 3L5 14h6l-1 7 8-11h-6z'],
  numberSign: ['M5 9h14M5 15h14M10 4L8 20M16 4l-2 16'],
};

export type IconName = keyof typeof PATHS;
export const ICON_NAMES = Object.keys(PATHS) as IconName[];

export function Icon({
  name,
  size = 24,
  color = '#fff',
  strokeWidth = 2,
  fill,
}: {
  name: IconName | string;
  size?: number;
  color?: string;
  strokeWidth?: number;
  fill?: string;
}) {
  const paths = PATHS[name] ?? PATHS.more;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {paths.map((d, i) => (
        <Path key={i} d={d} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" fill={fill ?? 'none'} />
      ))}
    </Svg>
  );
}

/** Eigen logo: geel blok met een treinsymbool (geen NS-merk). */
export function AppLogo({ size = 52 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 52 52">
      <Rect x={0} y={0} width={52} height={52} rx={14} fill="#FFC917" />
      <Path d="M15 34V17a5 5 0 0 1 5-5h12a5 5 0 0 1 5 5v17" stroke="#0A1A3F" strokeWidth={3.2} strokeLinecap="round" fill="none" />
      <Path d="M15 25h22" stroke="#0A1A3F" strokeWidth={3.2} strokeLinecap="round" />
      <Circle cx={20.5} cy={30} r={1.8} fill="#0A1A3F" />
      <Circle cx={31.5} cy={30} r={1.8} fill="#0A1A3F" />
      <Path d="M19 38l-3 4M33 38l3 4" stroke="#0A1A3F" strokeWidth={3.2} strokeLinecap="round" />
    </Svg>
  );
}
