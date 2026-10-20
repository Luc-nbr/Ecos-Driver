import React from 'react';
import { Image, Pressable, StyleProp, Text, View, ViewStyle } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { setDirection, setFunction, setNeutral, toggleFunction } from '../store/actions';
import { useEcos } from '../store/ecos';
import type { FunctionView } from '../store/hooks';
import { C, F, R } from '../theme';
import { Icon } from './Icon';
import { Segmented } from './ui';

/** Foto van de loc, of een rustig getekend silhouet als er nog geen foto is. */
export function LocoPhoto({ uri, style, rounded = R.md, hint = false }: { uri?: string; style?: StyleProp<ViewStyle>; rounded?: number; hint?: boolean }) {
  if (uri) {
    return (
      <View style={[{ overflow: 'hidden', borderRadius: rounded, backgroundColor: C.panel2 }, style]}>
        <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
      </View>
    );
  }
  return (
    <View style={[{ overflow: 'hidden', borderRadius: rounded, backgroundColor: C.panel2, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Svg width="62%" height="56%" viewBox="0 0 240 110" preserveAspectRatio="xMidYMid meet">
        <Path d="M60 26 L84 6 M84 6 L108 26 M150 26 L174 6 M174 6 L198 26 M70 6 H190" stroke="#5A5A5F" strokeWidth={3} fill="none" />
        <Path d="M16 84 V40 Q16 28 28 28 H206 Q222 28 230 46 L234 84 Z" fill="#48484A" />
        <Rect x={16} y={62} width={216} height={6} fill={C.accent} opacity={0.85} />
        <Rect x={196} y={36} width={24} height={18} rx={3} fill="#1C1C1E" />
        {[34, 70, 106].map((x) => (
          <Rect key={x} x={x} y={36} width={26} height={16} rx={3} fill="#1C1C1E" opacity={0.8} />
        ))}
        <Rect x={10} y={84} width={228} height={6} fill="#3A3A3C" />
        {[44, 74, 170, 200].map((x) => (
          <Circle key={x} cx={x} cy={96} r={9} fill="#3A3A3C" stroke="#5A5A5F" strokeWidth={2} />
        ))}
      </Svg>
      {hint ? <Text style={{ position: 'absolute', bottom: 8, right: 12, color: C.muted, fontSize: 12 }}>Foto toevoegen in Bibliotheek</Text> : null}
    </View>
  );
}

/** Vooruit / Neutraal / Achteruit als gesegmenteerde knop. */
export function DirectionButtons({ id, dir, compact }: { id: number; dir: 0 | 1; compact?: boolean }) {
  const neutral = useEcos((s) => !!s.neutral[id]);
  const value = neutral ? 'n' : dir === 0 ? 'f' : 'r';
  return (
    <Segmented
      label="Rijrichting"
      big={!compact}
      value={value}
      onChange={(v) => (v === 'n' ? setNeutral(id) : setDirection(id, v === 'f' ? 0 : 1))}
      options={[
        { value: 'f', label: compact ? '' : 'Vooruit', icon: 'arrowUp' },
        { value: 'n', label: compact ? '' : 'Neutraal', icon: 'neutral' },
        { value: 'r', label: compact ? '' : 'Achteruit', icon: 'arrowDown' },
      ]}
    />
  );
}

/** Knop "Wissel loc", in elk rijscherm. */
export function LocoSwitchButton({ onPress, compact, label = 'Wissel loc' }: { onPress: () => void; compact?: boolean; label?: string }) {
  if (compact) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        hitSlop={8}
        style={({ pressed }) => [
          { width: 36, height: 36, borderRadius: 18, backgroundColor: C.accentSoft, alignItems: 'center', justifyContent: 'center' },
          pressed ? { opacity: 0.7 } : null,
        ]}
      >
        <Icon name="swap" size={17} color={C.accent} strokeWidth={2.4} />
      </Pressable>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: C.accentSoft },
        pressed ? { opacity: 0.7 } : null,
      ]}
    >
      <Icon name="swap" size={16} color={C.accent} strokeWidth={2.4} />
      <Text style={{ color: C.accent, fontSize: 15, fontWeight: F.semi }}>{label}</Text>
    </Pressable>
  );
}

/** Druk-handlers voor een functie: aan/uit, of vasthouden bij een momentfunctie. */
function fnHandlers(id: number, f: FunctionView) {
  if (f.moment) {
    return { onPressIn: () => setFunction(id, f.n, true), onPressOut: () => setFunction(id, f.n, false) };
  }
  return { onPress: () => toggleFunction(id, f.n) };
}

/** Functie als drukknop met icoon (rijscherm). Amber = aan. */
export function FunctionButton({ id, f }: { id: number; f: FunctionView }) {
  const fg = f.on ? C.ink : C.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: f.on }}
      aria-pressed={f.on}
      accessibilityLabel={`F${f.n} ${f.label}${f.moment ? ', vasthouden' : ''}`}
      {...fnHandlers(id, f)}
      style={({ pressed }) => [
        {
          flexBasis: '30%',
          flexGrow: 1,
          maxWidth: '33%',
          minHeight: 96,
          padding: 10,
          borderRadius: 16,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          backgroundColor: f.on ? C.accent : C.panel2,
        },
        pressed ? { transform: [{ scale: 0.96 }], opacity: 0.9 } : null,
      ]}
    >
      <Text style={{ position: 'absolute', top: 8, left: 10, color: f.on ? C.ink : C.muted, fontSize: 13, fontWeight: F.bold }}>F{f.n}</Text>
      {f.moment ? (
        <View style={{ position: 'absolute', top: 8, right: 8 }}>
          <Icon name="hand" size={14} color={f.on ? C.ink : C.muted} />
        </View>
      ) : null}
      <Icon name={f.icon} size={30} color={fg} strokeWidth={1.9} />
      <Text style={{ color: fg, fontSize: 13, fontWeight: F.medium, textAlign: 'center' }} numberOfLines={1}>
        {f.label}
      </Text>
    </Pressable>
  );
}

/** Kleine functietegel (duo, multi, alle functies). */
export function FunctionTile({ id, f, size = 'md' }: { id: number; f: FunctionView; size?: 'sm' | 'md' }) {
  const sm = size === 'sm';
  const fg = f.on ? C.ink : C.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: f.on }}
      aria-pressed={f.on}
      accessibilityLabel={`F${f.n} ${f.label}`}
      {...fnHandlers(id, f)}
      style={({ pressed }) => [
        {
          flex: 1,
          minWidth: sm ? 0 : 72,
          minHeight: sm ? 48 : 84,
          paddingVertical: sm ? 4 : 8,
          paddingHorizontal: 4,
          borderRadius: sm ? 12 : 14,
          alignItems: 'center',
          justifyContent: 'center',
          gap: sm ? 1 : 4,
          backgroundColor: f.on ? C.accent : C.panel2,
        },
        pressed ? { opacity: 0.8 } : null,
      ]}
    >
      <Icon name={f.icon} size={sm ? 18 : 26} color={fg} strokeWidth={1.9} />
      <Text style={{ color: f.on ? C.ink : C.muted, fontSize: sm ? 11 : 12, fontWeight: F.bold }}>F{f.n}</Text>
      {!sm ? (
        <Text style={{ color: fg, fontSize: 12 }} numberOfLines={1}>
          {f.label}
        </Text>
      ) : null}
    </Pressable>
  );
}
