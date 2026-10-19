import React, { useMemo, useRef } from 'react';
import { PanResponder, Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, Path, RadialGradient, Stop } from 'react-native-svg';
import { C, F } from '../theme';

const START = 135; // graden, linksonder
const SWEEP = 270;

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
 * Draaiknop voor de snelheid. Sleep rond de knop om sneller/langzamer te rijden.
 * value: 0..126 (ECoS-stappen), maxLabel: topsnelheid in km/h voor de schaal.
 */
export function SpeedKnob({
  value,
  onChange,
  size = 260,
  maxLabel = 160,
  variant = 'dark',
  disabled,
  showScale = true,
  endless = false,
}: {
  value: number;
  onChange: (v: number) => void;
  size?: number;
  maxLabel?: number;
  variant?: 'dark' | 'yellow';
  disabled?: boolean;
  showScale?: boolean;
  /** Eindeloze draaiknop: draaien verandert de snelheid, zonder begin of eind (zoals de ECoS). */
  endless?: boolean;
}) {
  const ref = useRef<React.ComponentRef<typeof View>>(null);
  const center = useRef({ x: 0, y: 0 });
  const last = useRef(value / 126);
  last.current = value / 126;
  const cb = useRef(onChange);
  cb.current = onChange;
  const dis = useRef(disabled);
  dis.current = disabled;
  const endlessRef = useRef(endless);
  endlessRef.current = endless;
  const lastAngle = useRef<number | null>(null);
  const acc = useRef(0);
  const cur = useRef(value);
  cur.current = value;

  const responder = useMemo(() => {
    const update = (px: number, py: number) => {
      if (dis.current) return;
      const dx = px - center.current.x;
      const dy = py - center.current.y;
      if (dx * dx + dy * dy < 12 * 12) return; // te dicht bij het midden
      let deg = (Math.atan2(dy, dx) * 180) / Math.PI;
      if (deg < 0) deg += 360;
      if (endlessRef.current) {
        if (lastAngle.current !== null) {
          let d = deg - lastAngle.current;
          if (d > 180) d -= 360;
          if (d < -180) d += 360;
          acc.current += d / 2.5; // 2,5 graad draaien = 1 rijstap
          const steps = acc.current > 0 ? Math.floor(acc.current) : Math.ceil(acc.current);
          if (steps !== 0) {
            acc.current -= steps;
            const next = Math.max(0, Math.min(126, cur.current + steps));
            if (next !== cur.current) {
              cur.current = next;
              cb.current(next);
            }
          }
        }
        lastAngle.current = deg;
        return;
      }
      let rel = (deg - START + 360) % 360;
      let frac: number;
      if (rel > SWEEP) frac = last.current > 0.5 ? 1 : 0;
      else frac = rel / SWEEP;
      if (Math.abs(frac - last.current) > 0.5) return; // geen sprong over de onderkant
      last.current = frac;
      cb.current(Math.round(frac * 126));
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => !dis.current,
      onMoveShouldSetPanResponder: () => !dis.current,
      onMoveShouldSetPanResponderCapture: () => !dis.current,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        const { pageX, pageY } = e.nativeEvent;
        lastAngle.current = null;
        acc.current = 0;
        ref.current?.measureInWindow((x, y, w, h) => {
          center.current = { x: x + w / 2, y: y + h / 2 };
          update(pageX, pageY);
        });
      },
      onPanResponderMove: (e) => update(e.nativeEvent.pageX, e.nativeEvent.pageY),
    });
  }, []);

  const cx = size / 2;
  const cy = size / 2;
  const rArc = size / 2 - 14;
  const rKnob = rArc - (variant === 'yellow' ? 20 : 26);
  const frac = Math.max(0, Math.min(1, value / 126));
  const angle = START + SWEEP * frac;
  const ind1 = polar(cx, cy, rKnob - 8, angle);
  const ind2 = polar(cx, cy, rKnob - 34, angle);
  const lbl0 = polar(cx, cy, rArc + 2, START + 6);
  const lblMax = polar(cx, cy, rArc + 2, START + SWEEP - 6);
  const yellow = variant === 'yellow';

  return (
    <View style={{ alignItems: 'center' }}>
      <View
        ref={ref}
        {...responder.panHandlers}
        style={{ width: size, height: size, opacity: disabled ? 0.55 : 1 }}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Snelheid"
        accessibilityValue={{ min: 0, max: 126, now: value }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => onChange(Math.max(0, Math.min(126, value + (e.nativeEvent.actionName === 'increment' ? 6 : -6))))}
      >
        <Svg width={size} height={size}>
          <Defs>
            <RadialGradient id="knobDark" cx="40%" cy="35%" r="75%">
              <Stop offset="0" stopColor="#2B3A5C" />
              <Stop offset="1" stopColor="#0B1430" />
            </RadialGradient>
            <RadialGradient id="knobYellow" cx="40%" cy="35%" r="75%">
              <Stop offset="0" stopColor="#FFE07A" />
              <Stop offset="0.6" stopColor="#FFC917" />
              <Stop offset="1" stopColor="#D9A400" />
            </RadialGradient>
          </Defs>
          <Path d={arcPath(cx, cy, rArc, START, START + SWEEP)} stroke={C.track} strokeWidth={12} strokeLinecap="round" fill="none" />
          {frac > 0.004 ? (
            <Path d={arcPath(cx, cy, rArc, START, angle)} stroke={C.yellow} strokeWidth={12} strokeLinecap="round" fill="none" />
          ) : null}
          <Circle cx={cx} cy={cy + 6} r={rKnob} fill="#000814" opacity={0.45} />
          <Circle cx={cx} cy={cy} r={rKnob} fill={yellow ? 'url(#knobYellow)' : 'url(#knobDark)'} stroke={yellow ? '#B88A00' : '#24365F'} strokeWidth={2} />
          <Line x1={ind1.x} y1={ind1.y} x2={ind2.x} y2={ind2.y} stroke="#FFFFFF" strokeWidth={6} strokeLinecap="round" />
        </Svg>
        {showScale ? (
          <>
            <Text style={{ position: 'absolute', left: lbl0.x - 8, top: lbl0.y + 10, color: C.textSoft, fontSize: 17, fontWeight: F.medium }}>0</Text>
            <Text style={{ position: 'absolute', left: lblMax.x - 18, top: lblMax.y + 10, color: C.textSoft, fontSize: 17, fontWeight: F.medium }}>
              {maxLabel}
            </Text>
          </>
        ) : null}
      </View>
    </View>
  );
}
