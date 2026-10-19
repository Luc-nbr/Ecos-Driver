import React, { useId, useMemo, useRef, useState } from 'react';
import { PanResponder, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { C } from '../theme';

const THUMB = 34;

/**
 * Schuifregelaar (horizontaal of verticaal) met grote touch-zone.
 * value/onChange: 0..max.
 */
export function Slider({
  value,
  max = 100,
  onChange,
  onRelease,
  vertical = false,
  length,
  thickness = 14,
  fill = C.yellow,
  gradient,
  label = 'Schuifregelaar',
  disabled,
}: {
  value: number;
  max?: number;
  onChange: (v: number) => void;
  onRelease?: () => void;
  vertical?: boolean;
  length?: number;
  thickness?: number;
  fill?: string;
  gradient?: [string, string];
  label?: string;
  disabled?: boolean;
}) {
  const gid = 'g' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const ref = useRef<React.ComponentRef<typeof View>>(null);
  const box = useRef({ x: 0, y: 0, w: 1, h: 1 });
  const [size, setSize] = useState({ w: 0, h: 0 });
  const cb = useRef(onChange);
  cb.current = onChange;
  const rel = useRef(onRelease);
  rel.current = onRelease;
  const dis = useRef(disabled);
  dis.current = disabled;
  const vert = useRef(vertical);
  vert.current = vertical;
  const maxRef = useRef(max);
  maxRef.current = max;

  const responder = useMemo(() => {
    const update = (px: number, py: number) => {
      if (dis.current) return;
      const b = box.current;
      const f = vert.current ? 1 - (py - b.y - THUMB / 2) / Math.max(1, b.h - THUMB) : (px - b.x - THUMB / 2) / Math.max(1, b.w - THUMB);
      cb.current(Math.round(Math.max(0, Math.min(1, f)) * maxRef.current));
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => !dis.current,
      onMoveShouldSetPanResponder: () => !dis.current,
      onMoveShouldSetPanResponderCapture: () => !dis.current,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        const { pageX, pageY } = e.nativeEvent;
        ref.current?.measureInWindow((x, y, w, h) => {
          box.current = { x, y, w: Math.max(1, w), h: Math.max(1, h) };
          update(pageX, pageY);
        });
      },
      onPanResponderMove: (e) => update(e.nativeEvent.pageX, e.nativeEvent.pageY),
      onPanResponderRelease: () => rel.current?.(),
      onPanResponderTerminate: () => rel.current?.(),
    });
  }, []);

  const frac = Math.max(0, Math.min(1, value / max));
  const thumb = THUMB;
  const touch = Math.max(48, thumb + 10);
  const len = Math.max(0, (vertical ? size.h : size.w) - thumb);
  const pos = frac * len;

  return (
    <View
      ref={ref}
      {...responder.panHandlers}
      onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max, now: value }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => onChange(Math.max(0, Math.min(max, value + (e.nativeEvent.actionName === 'increment' ? max / 10 : -max / 10))))}
      style={[
        vertical ? { width: touch, height: length ?? '100%' } : { height: touch, width: length ?? '100%' },
        vertical ? { paddingVertical: thumb / 2 } : { paddingHorizontal: thumb / 2 },
        { justifyContent: 'center', alignItems: 'center', opacity: disabled ? 0.5 : 1 },
      ]}
    >
      <View
        style={[
          { backgroundColor: '#0A1838', borderRadius: thickness / 2, overflow: 'hidden', borderWidth: 1, borderColor: C.borderSoft },
          vertical ? { width: thickness, height: '100%', justifyContent: 'flex-end' } : { height: thickness, width: '100%' },
        ]}
      >
        {gradient && len > 0 ? (
          <Svg width={vertical ? thickness : pos} height={vertical ? pos : thickness}>
            <Defs>
              <LinearGradient id={gid} x1="0" y1={vertical ? '1' : '0'} x2={vertical ? '0' : '1'} y2="0">
                <Stop offset="0" stopColor={gradient[0]} />
                <Stop offset="1" stopColor={gradient[1]} />
              </LinearGradient>
            </Defs>
            <Rect x={0} y={0} width="100%" height="100%" fill={`url(#${gid})`} />
          </Svg>
        ) : (
          <View style={vertical ? { width: '100%', height: pos, backgroundColor: fill } : { height: '100%', width: pos, backgroundColor: fill }} />
        )}
      </View>
      {len > 0 ? (
        <View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              width: thumb,
              height: thumb,
              borderRadius: thumb / 2,
              backgroundColor: '#FFFFFF',
              shadowColor: '#000',
              shadowOpacity: 0.35,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 2 },
              elevation: 4,
            },
            vertical ? { bottom: pos } : { left: pos },
          ]}
        />
      ) : null}
    </View>
  );
}
