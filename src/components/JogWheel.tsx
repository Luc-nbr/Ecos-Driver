import * as Haptics from 'expo-haptics';
import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { PanResponder, Platform, Text, View } from 'react-native';
import Svg, { Circle, Defs, G, Line, Path, RadialGradient, Stop } from 'react-native-svg';
import { useScrollLock } from '../store/ui';
import { C, F } from '../theme';

const MAX = 126;
// op web: slepen met de muis mag geen tekst selecteren (dat breekt de veeg af)
const NO_SELECT = (Platform.OS === 'web' ? { userSelect: 'none' } : {}) as object;
const PX_PER_STEP = 3.2; // zoveel pixels scrollen = 1 rijstap (hele schaal ≈ 400 px)
const DEG_PER_PX = 0.9; // zo ver draait het wiel zichtbaar mee per pixel
const ARC_START = 135;
const ARC_SWEEP = 270;

export function polar(cx: number, cy: number, r: number, deg: number) {
  const a = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

export function arcPath(cx: number, cy: number, r: number, from: number, to: number) {
  if (to - from < 0.01) return '';
  const a = polar(cx, cy, r, from);
  const b = polar(cx, cy, r, to);
  const large = to - from > 180 ? 1 : 0;
  return `M ${a.x} ${a.y} A ${r} ${r} 0 ${large} 1 ${b.x} ${b.y}`;
}

/**
 * Eindeloos draaiwiel voor de snelheid. Je scrolt aan het wiel: omhoog of naar
 * rechts vegen = meer gas, omlaag of naar links = minder. Het wiel draait mee en
 * heeft geen eind. Bij vol vermogen (of bij 0) geeft verder scrollen niets meer,
 * en zodra je terugdraait neemt het gas meteen af. Geen doordraaien na loslaten.
 */
export function JogWheel({
  value,
  onChange,
  size = 260,
  maxLabel,
  variant = 'dark',
  disabled,
  showScale = true,
  label = 'Snelheid',
}: {
  value: number;
  onChange: (v: number) => void;
  size?: number;
  maxLabel?: number;
  variant?: 'dark' | 'yellow';
  disabled?: boolean;
  showScale?: boolean;
  label?: string;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [rotation, setRotation] = useState(0);
  const rot = useRef(0);
  const acc = useRef(0);
  const val = useRef(value);
  const lastEmitted = useRef(value);
  const atEnd = useRef(false);
  const cb = useRef(onChange);
  cb.current = onChange;
  const dis = useRef(disabled);
  dis.current = disabled;
  const scrollLock = useScrollLock();
  const releaseLock = useRef(scrollLock.release);
  releaseLock.current = scrollLock.release;
  // kleinere wielen iets gevoeliger, zodat het hele bereik in één veeg past
  const pxPerStep = useRef(PX_PER_STEP);
  pxPerStep.current = size < 200 ? PX_PER_STEP * 0.8 : PX_PER_STEP;

  // snelheid van buitenaf veranderd (stop, rem, ECoS)
  useEffect(() => {
    if (value === lastEmitted.current) return;
    lastEmitted.current = value;
    val.current = value;
    acc.current = 0;
  }, [value]);
  useEffect(() => () => releaseLock.current(), []);

  /** Scroll d pixels (positief = meer gas). */
  const scroll = (d: number) => {
    if (dis.current || d === 0) return;
    const v = val.current;
    if ((v >= MAX && d > 0) || (v <= 0 && d < 0)) {
      // aan het eind: niets meer doen, en niets opsparen
      acc.current = 0;
      if (!atEnd.current && Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      atEnd.current = true;
      return;
    }
    atEnd.current = false;
    rot.current += d * DEG_PER_PX;
    setRotation(rot.current);
    acc.current += d / pxPerStep.current;
    const steps = acc.current > 0 ? Math.floor(acc.current) : Math.ceil(acc.current);
    if (steps === 0) return;
    acc.current -= steps;
    const next = Math.max(0, Math.min(MAX, v + steps));
    if (next === v) return;
    if (Platform.OS !== 'web' && Math.floor(next / 6) !== Math.floor(v / 6)) Haptics.selectionAsync().catch(() => {});
    val.current = next;
    lastEmitted.current = next;
    cb.current(next);
  };

  const responder = useMemo(() => {
    let last = { x: 0, y: 0 };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => !dis.current,
      onStartShouldSetPanResponderCapture: () => !dis.current,
      onMoveShouldSetPanResponder: () => !dis.current,
      onMoveShouldSetPanResponderCapture: () => !dis.current,
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: () => {
        last = { x: 0, y: 0 };
        atEnd.current = false;
      },
      onPanResponderMove: (_, g) => {
        // omhoog en naar rechts tellen allebei als "meer gas"
        const d = g.dx - last.x - (g.dy - last.y);
        last = { x: g.dx, y: g.dy };
        scroll(d);
      },
      onPanResponderRelease: () => releaseLock.current(),
      onPanResponderTerminate: () => releaseLock.current(),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cx = size / 2;
  const cy = size / 2;
  const rArc = size / 2 - 10;
  const rWheel = rArc - 22;
  const frac = Math.max(0, Math.min(1, value / MAX));
  const end = ARC_START + ARC_SWEEP * frac;
  const yellow = variant === 'yellow';
  const ticks = 40;
  const dimple = polar(cx, cy, rWheel * 0.62, -90);
  const lbl0 = polar(cx, cy, rArc + 2, ARC_START + 4);
  const lblMax = polar(cx, cy, rArc + 2, ARC_START + ARC_SWEEP - 4);

  return (
    <View
      {...responder.panHandlers}
      onTouchStart={scrollLock.onTouchStart}
      onTouchEnd={scrollLock.onTouchEnd}
      onTouchCancel={scrollLock.onTouchCancel}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={`${label}: scroll omhoog voor meer gas`}
      accessibilityValue={{ min: 0, max: MAX, now: value }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => onChange(Math.max(0, Math.min(MAX, value + (e.nativeEvent.actionName === 'increment' ? 6 : -6))))}
      style={[{ width: size, height: size, opacity: disabled ? 0.55 : 1 }, NO_SELECT]}
    >
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={`w${uid}`} cx="42%" cy="36%" r="75%">
            {yellow ? <Stop offset="0" stopColor="#FFC766" /> : <Stop offset="0" stopColor={C.wheelHi} />}
            {yellow ? <Stop offset="0.6" stopColor="#FF9F0A" /> : <Stop offset="0.65" stopColor={C.wheelMid} />}
            {yellow ? <Stop offset="1" stopColor="#C77700" /> : <Stop offset="1" stopColor={C.wheelLo} />}
          </RadialGradient>
          <RadialGradient id={`d${uid}`} cx="50%" cy="40%" r="60%">
            <Stop offset="0" stopColor={yellow ? '#B36B00' : C.dimpleLo} />
            <Stop offset="1" stopColor={yellow ? '#FFB340' : C.dimpleHi} />
          </RadialGradient>
        </Defs>
        {/* snelheidsboog */}
        <Path d={arcPath(cx, cy, rArc, ARC_START, ARC_START + ARC_SWEEP)} stroke={C.track} strokeWidth={8} strokeLinecap="round" fill="none" />
        {frac > 0.004 ? <Path d={arcPath(cx, cy, rArc, ARC_START, end)} stroke={C.accent} strokeWidth={8} strokeLinecap="round" fill="none" /> : null}
        {/* schaduw + wiel */}
        <Circle cx={cx} cy={cy + 6} r={rWheel} fill="#000000" opacity={C.wheelShadow} />
        <Circle cx={cx} cy={cy} r={rWheel} fill={`url(#w${uid})`} stroke={yellow ? '#C77700' : C.wheelEdge} strokeWidth={1.5} />
        <G transform={`rotate(${rotation % 360} ${cx} ${cy})`}>
          {Array.from({ length: ticks }, (_, i) => {
            const a = (360 / ticks) * i;
            const p1 = polar(cx, cy, rWheel - 3, a);
            const p2 = polar(cx, cy, rWheel - 15, a);
            return (
              <Line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={yellow ? '#B36B00' : C.wheelTick} strokeWidth={2.5} strokeLinecap="round" opacity={0.9} />
            );
          })}
          {/* vingerkuil */}
          <Circle cx={dimple.x} cy={dimple.y} r={rWheel * 0.17} fill={`url(#d${uid})`} stroke={yellow ? '#C77700' : C.wheelEdge} strokeWidth={1} />
        </G>
        <Circle cx={cx} cy={cy} r={rWheel * 0.2} fill={yellow ? '#E58E00' : C.wheelHub} stroke={yellow ? '#C77700' : C.wheelEdge} strokeWidth={1} />
      </Svg>
      {showScale ? (
        <>
          <Text style={{ position: 'absolute', left: lbl0.x - 8, top: lbl0.y + 4, color: C.textSoft, fontSize: 15, fontWeight: F.medium }}>0</Text>
          <Text style={{ position: 'absolute', left: lblMax.x - 16, top: lblMax.y + 4, color: C.textSoft, fontSize: 15, fontWeight: F.medium }}>{maxLabel ?? MAX}</Text>
        </>
      ) : null}
    </View>
  );
}
