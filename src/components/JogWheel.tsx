import * as Haptics from 'expo-haptics';
import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { PanResponder, Platform, Text, View } from 'react-native';
import Svg, { Circle, Defs, G, Line, Path, RadialGradient, Stop } from 'react-native-svg';
import { C, F } from '../theme';

const MAX = 126;
const DEG_PER_STEP = 2.2; // zoveel graden draaien = 1 rijstap (bijna één slag voor de hele schaal)
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
 * Eindeloos draaiwiel voor de snelheid (zoals een jog-wiel of de knop van de ECoS):
 * met de klok mee = sneller, tegen de klok in = langzamer. Na een zwiep draait het
 * nog even door; aanraken, stop, neutraal of de rem houdt het meteen tegen.
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
  const ref = useRef<React.ComponentRef<typeof View>>(null);
  const [rotation, setRotation] = useState(0);
  const rot = useRef(0);
  const center = useRef({ x: 0, y: 0 });
  const lastAngle = useRef<number | null>(null);
  const samples = useRef<{ t: number; a: number }[]>([]);
  const acc = useRef(0);
  const val = useRef(value);
  const lastEmitted = useRef(value);
  const anim = useRef<number | null>(null);
  const cb = useRef(onChange);
  cb.current = onChange;
  const dis = useRef(disabled);
  dis.current = disabled;

  const stopSpin = () => {
    if (anim.current !== null) cancelAnimationFrame(anim.current);
    anim.current = null;
  };

  // snelheid van buitenaf veranderd (stop, rem, ECoS): doordraaien stoppen
  useEffect(() => {
    if (value === lastEmitted.current) return;
    lastEmitted.current = value;
    val.current = value;
    acc.current = 0;
    stopSpin();
  }, [value]);
  useEffect(() => stopSpin, []);
  useEffect(() => {
    if (disabled) stopSpin();
  }, [disabled]);

  /** Draai het wiel d graden (positief = met de klok mee). False als het wiel aan het eind zit. */
  const turn = (d: number): boolean => {
    if (dis.current) return false;
    const v = val.current;
    if ((v >= MAX && d > 0) || (v <= 0 && d < 0)) {
      acc.current = 0;
      return false;
    }
    rot.current += d;
    setRotation(rot.current);
    acc.current += d / DEG_PER_STEP;
    const steps = acc.current > 0 ? Math.floor(acc.current) : Math.ceil(acc.current);
    if (steps !== 0) {
      acc.current -= steps;
      const next = Math.max(0, Math.min(MAX, v + steps));
      if (next !== v) {
        if (Platform.OS !== 'web' && Math.floor(next / 6) !== Math.floor(v / 6)) Haptics.selectionAsync().catch(() => {});
        val.current = next;
        lastEmitted.current = next;
        cb.current(next);
      }
    }
    return true;
  };

  const responder = useMemo(() => {
    const angleAt = (px: number, py: number) => {
      const dx = px - center.current.x;
      const dy = py - center.current.y;
      if (dx * dx + dy * dy < 14 * 14) return null; // te dicht bij het midden
      return (Math.atan2(dy, dx) * 180) / Math.PI;
    };
    const onMove = (px: number, py: number) => {
      const a = angleAt(px, py);
      if (a === null) return;
      if (lastAngle.current !== null) {
        let d = a - lastAngle.current;
        if (d > 180) d -= 360;
        if (d < -180) d += 360;
        turn(d);
        const now = Date.now();
        samples.current.push({ t: now, a: d });
        samples.current = samples.current.filter((s) => now - s.t < 90);
      }
      lastAngle.current = a;
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => !dis.current,
      onMoveShouldSetPanResponder: () => !dis.current,
      onMoveShouldSetPanResponderCapture: () => !dis.current,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        stopSpin();
        lastAngle.current = null;
        samples.current = [];
        const { pageX, pageY } = e.nativeEvent;
        ref.current?.measureInWindow((x, y, w, h) => {
          center.current = { x: x + w / 2, y: y + h / 2 };
          lastAngle.current = angleAt(pageX, pageY);
        });
      },
      onPanResponderMove: (e) => onMove(e.nativeEvent.pageX, e.nativeEvent.pageY),
      onPanResponderRelease: () => {
        // doordraaien met de draaisnelheid van de laatste beweging (graden per ms)
        const s = samples.current;
        samples.current = [];
        lastAngle.current = null;
        if (s.length < 2) return;
        const span = Math.max(16, Date.now() - s[0].t);
        let w = s.reduce((sum, x) => sum + x.a, 0) / span;
        w = Math.max(-2.5, Math.min(2.5, w));
        if (Math.abs(w) < 0.12) return;
        let last = Date.now();
        const tick = () => {
          const now = Date.now();
          const dt = Math.min(48, now - last);
          last = now;
          if (!turn(w * dt)) {
            anim.current = null;
            return;
          }
          w *= Math.pow(0.95, dt / 16);
          if (Math.abs(w) < 0.02) {
            anim.current = null;
            return;
          }
          anim.current = requestAnimationFrame(tick);
        };
        anim.current = requestAnimationFrame(tick);
      },
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
      ref={ref}
      {...responder.panHandlers}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={`${label}: draai met de klok mee voor sneller`}
      accessibilityValue={{ min: 0, max: MAX, now: value }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => onChange(Math.max(0, Math.min(MAX, value + (e.nativeEvent.actionName === 'increment' ? 6 : -6))))}
      style={{ width: size, height: size, opacity: disabled ? 0.55 : 1 }}
    >
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={`w${uid}`} cx="42%" cy="36%" r="75%">
            {yellow ? <Stop offset="0" stopColor="#FFC766" /> : <Stop offset="0" stopColor="#4A4A4E" />}
            {yellow ? <Stop offset="0.6" stopColor="#FF9F0A" /> : <Stop offset="0.65" stopColor="#2C2C2E" />}
            {yellow ? <Stop offset="1" stopColor="#C77700" /> : <Stop offset="1" stopColor="#1A1A1C" />}
          </RadialGradient>
          <RadialGradient id={`d${uid}`} cx="50%" cy="40%" r="60%">
            <Stop offset="0" stopColor={yellow ? '#B36B00' : '#111113'} />
            <Stop offset="1" stopColor={yellow ? '#FFB340' : '#3A3A3C'} />
          </RadialGradient>
        </Defs>
        {/* snelheidsboog */}
        <Path d={arcPath(cx, cy, rArc, ARC_START, ARC_START + ARC_SWEEP)} stroke={C.track} strokeWidth={8} strokeLinecap="round" fill="none" />
        {frac > 0.004 ? <Path d={arcPath(cx, cy, rArc, ARC_START, end)} stroke={C.accent} strokeWidth={8} strokeLinecap="round" fill="none" /> : null}
        {/* schaduw + wiel */}
        <Circle cx={cx} cy={cy + 6} r={rWheel} fill="#000000" opacity={0.5} />
        <Circle cx={cx} cy={cy} r={rWheel} fill={`url(#w${uid})`} stroke={yellow ? '#C77700' : '#48484A'} strokeWidth={1.5} />
        <G transform={`rotate(${rotation % 360} ${cx} ${cy})`}>
          {Array.from({ length: ticks }, (_, i) => {
            const a = (360 / ticks) * i;
            const p1 = polar(cx, cy, rWheel - 3, a);
            const p2 = polar(cx, cy, rWheel - 15, a);
            return (
              <Line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={yellow ? '#B36B00' : '#636366'} strokeWidth={2.5} strokeLinecap="round" opacity={0.9} />
            );
          })}
          {/* vingerkuil */}
          <Circle cx={dimple.x} cy={dimple.y} r={rWheel * 0.17} fill={`url(#d${uid})`} stroke={yellow ? '#C77700' : '#48484A'} strokeWidth={1} />
        </G>
        <Circle cx={cx} cy={cy} r={rWheel * 0.2} fill={yellow ? '#E58E00' : '#1C1C1E'} stroke={yellow ? '#C77700' : '#48484A'} strokeWidth={1} />
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
