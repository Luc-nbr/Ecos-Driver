import * as Haptics from 'expo-haptics';
import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { PanResponder, Platform, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { C, F } from '../theme';
import { Icon } from './Icon';

const PX_PER_STEP = 5; // zoveel pixels vegen = 1 rijstap
const SPACING = 16; // afstand tussen de ribbels
const MAX = 126;

/**
 * Eindeloze rol voor de snelheid: veeg omhoog = sneller, omlaag = langzamer.
 * Na loslaten rolt hij nog even door (zoals scrollen). Opnieuw aanraken,
 * een stopknop of de rem houdt het doorrollen meteen tegen.
 */
export function InfiniteThrottle({
  value,
  onChange,
  height,
  width = 110,
  disabled,
  maxLabel,
  showMeter = true,
  compact,
  label = 'Snelheid',
}: {
  value: number;
  onChange: (v: number) => void;
  /** Vaste hoogte; zonder hoogte vult de rol de beschikbare ruimte. */
  height?: number;
  width?: number;
  disabled?: boolean;
  maxLabel?: number;
  showMeter?: boolean;
  compact?: boolean;
  label?: string;
}) {
  const gid = 'cyl' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const [measured, setMeasured] = useState(height ?? 0);
  const h = height ?? measured;
  const [offset, setOffset] = useState(0);

  const offsetRef = useRef(0);
  const accum = useRef(0);
  const val = useRef(value);
  const lastEmitted = useRef(value);
  const anim = useRef<number | null>(null);
  const cb = useRef(onChange);
  cb.current = onChange;
  const dis = useRef(disabled);
  dis.current = disabled;

  const stopInertia = () => {
    if (anim.current !== null) cancelAnimationFrame(anim.current);
    anim.current = null;
  };

  // snelheid van buitenaf veranderd (stop, rem, ECoS): doorrollen stoppen
  useEffect(() => {
    if (value === lastEmitted.current) return;
    lastEmitted.current = value;
    val.current = value;
    accum.current = 0;
    stopInertia();
  }, [value]);

  useEffect(() => stopInertia, []);
  useEffect(() => {
    if (disabled) stopInertia();
  }, [disabled]);

  /** Verwerk een beweging in pixels (positief = omlaag). Geeft false als de rol aan het eind zit. */
  const move = (dy: number): boolean => {
    if (dis.current) return false;
    const v = val.current;
    if ((v >= MAX && dy < 0) || (v <= 0 && dy > 0)) {
      accum.current = 0;
      return false;
    }
    offsetRef.current += dy;
    setOffset(offsetRef.current);
    accum.current -= dy;
    const steps = accum.current > 0 ? Math.floor(accum.current / PX_PER_STEP) : Math.ceil(accum.current / PX_PER_STEP);
    if (steps !== 0) {
      accum.current -= steps * PX_PER_STEP;
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
    let lastDy = 0;
    return PanResponder.create({
      onStartShouldSetPanResponder: () => !dis.current,
      onMoveShouldSetPanResponder: () => !dis.current,
      onMoveShouldSetPanResponderCapture: () => !dis.current,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        stopInertia();
        lastDy = 0;
      },
      onPanResponderMove: (_, g) => {
        move(g.dy - lastDy);
        lastDy = g.dy;
      },
      onPanResponderRelease: (_, g) => {
        // doorrollen met afnemende snelheid (px per ms)
        let vel = Math.max(-4, Math.min(4, g.vy));
        if (Math.abs(vel) < 0.15) return;
        let last = Date.now();
        const tick = () => {
          const now = Date.now();
          const dt = Math.min(48, now - last);
          last = now;
          if (!move(vel * dt)) {
            anim.current = null;
            return;
          }
          vel *= Math.pow(0.94, dt / 16);
          if (Math.abs(vel) < 0.03) {
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

  const frac = Math.max(0, Math.min(1, value / MAX));
  const off = ((offset % SPACING) + SPACING) % SPACING;
  const ridges: { y: number; o: number }[] = [];
  if (h > 0) {
    for (let y = off - SPACING; y < h + SPACING; y += SPACING) {
      const t = Math.abs(y / h - 0.5) * 2; // 0 in het midden, 1 aan de rand
      ridges.push({ y, o: Math.max(0.08, 1 - t * t) });
    }
  }
  const chevron = compact ? 18 : 24;

  const wheel = (
    <View style={{ alignItems: 'center', gap: compact ? 2 : 6 }}>
      <Icon name="chevronUp" size={chevron} color={C.muted} strokeWidth={2.6} />
      <View
        {...responder.panHandlers}
        onLayout={height ? undefined : (e) => setMeasured(e.nativeEvent.layout.height)}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={`${label}: veeg omhoog voor sneller`}
        accessibilityValue={{ min: 0, max: MAX, now: value }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => onChange(Math.max(0, Math.min(MAX, value + (e.nativeEvent.actionName === 'increment' ? 6 : -6))))}
        style={{
          width,
          height: height ?? undefined,
          flex: height ? undefined : 1,
          minHeight: height ? undefined : 60,
          borderRadius: compact ? 14 : 22,
          overflow: 'hidden',
          borderWidth: 2,
          borderColor: disabled ? C.borderSoft : C.border,
          opacity: disabled ? 0.5 : 1,
          backgroundColor: '#0A1838',
        }}
      >
        {h > 0 ? (
          <Svg width={width} height={h} style={{ position: 'absolute', top: 0, left: 0 }}>
            <Defs>
              <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#030A1E" />
                <Stop offset="0.5" stopColor="#1C3A78" />
                <Stop offset="1" stopColor="#030A1E" />
              </LinearGradient>
            </Defs>
            <Rect x={0} y={0} width={width} height={h} fill={`url(#${gid})`} />
            {ridges.map((r, i) => (
              <Rect key={i} x={compact ? 6 : 10} y={r.y} width={width - (compact ? 12 : 20)} height={3} rx={1.5} fill="#8FA7DA" opacity={r.o} />
            ))}
          </Svg>
        ) : null}
      </View>
      <Icon name="chevronDown" size={chevron} color={C.muted} strokeWidth={2.6} />
    </View>
  );

  if (!showMeter) return wheel;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'stretch', gap: compact ? 8 : 14 }}>
      <View style={{ alignItems: 'center', justifyContent: 'space-between', paddingVertical: compact ? 22 : 30 }}>
        <Text style={{ color: C.textSoft, fontSize: compact ? 12 : 15, fontWeight: F.medium }}>{maxLabel ?? MAX}</Text>
        <View style={{ flex: 1, width: compact ? 10 : 16, marginVertical: 6, borderRadius: 8, backgroundColor: C.track, overflow: 'hidden', justifyContent: 'flex-end' }}>
          <View style={{ height: `${frac * 100}%`, backgroundColor: C.yellow, borderRadius: 8 }} />
        </View>
        <Text style={{ color: C.textSoft, fontSize: compact ? 12 : 15, fontWeight: F.medium }}>0</Text>
      </View>
      {wheel}
    </View>
  );
}
