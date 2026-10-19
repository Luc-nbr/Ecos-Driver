import React from 'react';
import { Image, Pressable, StyleProp, Text, View, ViewStyle } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { setDirection, setFunction, setNeutral, toggleFunction } from '../store/actions';
import { useEcos } from '../store/ecos';
import type { FunctionView } from '../store/hooks';
import { C, F, R } from '../theme';
import { Icon } from './Icon';
import { Toggle } from './ui';

/** Foto van de loc, of een getekende loc als er nog geen foto is. */
export function LocoPhoto({ uri, style, rounded = R.md, hint = false }: { uri?: string; style?: StyleProp<ViewStyle>; rounded?: number; hint?: boolean }) {
  if (uri) {
    return (
      <View style={[{ overflow: 'hidden', borderRadius: rounded, backgroundColor: C.panel2 }, style]}>
        <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
      </View>
    );
  }
  return (
    <View style={[{ overflow: 'hidden', borderRadius: rounded, backgroundColor: '#14306A', alignItems: 'center', justifyContent: 'center' }, style]}>
      <Svg width="70%" height="60%" viewBox="0 0 240 110" preserveAspectRatio="xMidYMid meet">
        <Path d="M60 26 L84 6 M84 6 L108 26 M150 26 L174 6 M174 6 L198 26 M70 6 H190" stroke="#5D7BB8" strokeWidth={3} fill="none" />
        <Path d="M16 84 V40 Q16 28 28 28 H206 Q222 28 230 46 L234 84 Z" fill="#FFC917" />
        <Rect x={16} y={60} width={216} height={10} fill="#1C3F8C" />
        <Rect x={196} y={36} width={24} height={18} rx={3} fill="#0A1A3F" />
        <Rect x={34} y={36} width={26} height={16} rx={3} fill="#0A1A3F" opacity={0.75} />
        <Rect x={70} y={36} width={26} height={16} rx={3} fill="#0A1A3F" opacity={0.75} />
        <Rect x={106} y={36} width={26} height={16} rx={3} fill="#0A1A3F" opacity={0.75} />
        <Rect x={10} y={84} width={228} height={8} fill="#2B3F6A" />
        {[44, 74, 170, 200].map((x) => (
          <Circle key={x} cx={x} cy={96} r={10} fill="#2B3F6A" stroke="#5D7BB8" strokeWidth={2} />
        ))}
      </Svg>
      {hint ? <Text style={{ position: 'absolute', bottom: 8, right: 12, color: C.muted, fontSize: 13 }}>Voeg een foto toe in Locomotieven</Text> : null}
    </View>
  );
}

/** Vooruit / Neutraal / Achteruit. */
export function DirectionButtons({ id, dir, compact }: { id: number; dir: 0 | 1; compact?: boolean }) {
  const neutral = useEcos((s) => !!s.neutral[id]);
  const items: { key: string; label: string; icon: string; active: boolean; onPress: () => void }[] = [
    { key: 'f', label: 'Vooruit', icon: 'arrowUp', active: !neutral && dir === 0, onPress: () => setDirection(id, 0) },
    { key: 'n', label: 'Neutraal', icon: 'neutral', active: neutral, onPress: () => setNeutral(id) },
    { key: 'r', label: 'Achteruit', icon: 'arrowDown', active: !neutral && dir === 1, onPress: () => setDirection(id, 1) },
  ];
  return (
    <View style={{ flexDirection: 'row', gap: compact ? 6 : 10 }}>
      {items.map((it) => (
        <Pressable
          key={it.key}
          accessibilityRole="button"
          accessibilityState={{ selected: it.active }}
          accessibilityLabel={it.label}
          onPress={it.onPress}
          style={({ pressed }) => [
            {
              flex: 1,
              minHeight: compact ? 50 : 84,
              borderRadius: R.md,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              borderWidth: 1.5,
              borderColor: it.active ? C.yellow : C.border,
              backgroundColor: it.active ? C.yellow : C.panel2,
            },
            pressed ? { opacity: 0.8 } : null,
          ]}
        >
          {it.key === 'n' && !compact ? (
            <Text style={{ fontSize: 26, fontWeight: F.heavy, color: it.active ? C.ink : C.text }}>N</Text>
          ) : (
            <Icon name={it.icon} size={compact ? 22 : 28} color={it.active ? C.ink : C.text} strokeWidth={2.6} />
          )}
          {!compact ? <Text style={{ fontSize: 16, fontWeight: F.semi, color: it.active ? C.ink : C.textSoft }}>{it.label}</Text> : null}
        </Pressable>
      ))}
    </View>
  );
}

/** Druk-handlers voor een functie: aan/uit, of vasthouden bij een momentfunctie. */
function fnHandlers(id: number, f: FunctionView) {
  if (f.moment) {
    return { onPressIn: () => setFunction(id, f.n, true), onPressOut: () => setFunction(id, f.n, false) };
  }
  return { onPress: () => toggleFunction(id, f.n) };
}

/** Functie als rij met schakelaar (zoals in de rechterkolom van de mockup). */
export function FunctionRow({ id, f }: { id: number; f: FunctionView }) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: f.on }}
      aria-checked={f.on}
      accessibilityLabel={`F${f.n} ${f.label}`}
      {...fnHandlers(id, f)}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          padding: 10,
          borderRadius: R.md,
          backgroundColor: f.on ? C.panelHi : C.panel2,
          borderWidth: 1,
          borderColor: f.on ? '#3B5DA8' : C.borderSoft,
        },
        pressed ? { opacity: 0.85 } : null,
      ]}
    >
      <View style={{ width: 54, height: 54, borderRadius: 12, backgroundColor: '#0A1D49', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: C.text, fontSize: 22, fontWeight: F.heavy }}>F{f.n}</Text>
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Icon name={f.icon} size={28} color={f.on ? C.yellow : C.text} />
        <Text style={{ color: C.textSoft, fontSize: 15 }} numberOfLines={1}>
          {f.label}
          {f.moment ? '  ·  vasthouden' : ''}
        </Text>
      </View>
      <View pointerEvents="none">
        <Toggle value={f.on} />
      </View>
    </Pressable>
  );
}

/** Functie als tegel (zoals in de duo-weergave). */
export function FunctionTile({ id, f, size = 'md' }: { id: number; f: FunctionView; size?: 'sm' | 'md' }) {
  const sm = size === 'sm';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: f.on }}
      accessibilityLabel={`F${f.n} ${f.label}`}
      {...fnHandlers(id, f)}
      style={({ pressed }) => [
        {
          flex: 1,
          minWidth: sm ? 0 : 72,
          minHeight: sm ? 48 : 108,
          paddingVertical: sm ? 4 : 10,
          paddingHorizontal: 4,
          borderRadius: sm ? 10 : R.md,
          alignItems: 'center',
          justifyContent: 'center',
          gap: sm ? 0 : 4,
          backgroundColor: f.on ? C.yellow : C.panel2,
          borderWidth: 1,
          borderColor: f.on ? C.yellow : C.border,
        },
        pressed ? { opacity: 0.8 } : null,
      ]}
    >
      <Icon name={f.icon} size={sm ? 18 : 30} color={f.on ? C.ink : C.text} />
      <Text style={{ color: f.on ? C.ink : C.text, fontSize: sm ? 12 : 17, fontWeight: F.bold }}>F{f.n}</Text>
      {!sm ? (
        <Text style={{ color: f.on ? C.ink : C.textSoft, fontSize: 13 }} numberOfLines={1}>
          {f.label}
        </Text>
      ) : null}
    </Pressable>
  );
}

/** Grote ronde snelknop (bv. Koplampen/Tyfoon). */
export function QuickFunction({ id, f }: { id: number; f: FunctionView }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: f.on }}
      accessibilityLabel={f.label}
      {...fnHandlers(id, f)}
      style={({ pressed }) => [{ flex: 1, alignItems: 'center', gap: 8 }, pressed ? { opacity: 0.8 } : null]}
    >
      <View
        style={{
          width: 84,
          height: 64,
          borderRadius: R.md,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: f.on ? C.yellow : C.panel2,
          borderWidth: 1.5,
          borderColor: f.on ? C.yellow : C.border,
        }}
      >
        <Icon name={f.icon} size={32} color={f.on ? C.ink : C.text} />
      </View>
      <Text style={{ color: C.text, fontSize: 16, fontWeight: F.semi }} numberOfLines={1}>
        {f.label}
      </Text>
    </Pressable>
  );
}
