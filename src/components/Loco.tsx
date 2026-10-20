import React, { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleProp, Text, View, ViewStyle } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { setFunction, toggleFunction } from '../store/actions';
import type { LocoDesc } from '../ecos/client';
import { useEcos } from '../store/ecos';
import { useActiveProfile } from '../store/settings';
import type { FunctionView } from '../store/hooks';
import { C, F, R } from '../theme';
import { Icon } from './Icon';

// Afbeeldingen die niet te laden waren, niet steeds opnieuw proberen.
const failedImages = new Set<string>();

/** Adressen van het plaatje dat de ECoS voor deze loc gebruikt (ingebouwde webserver). */
function ecosImageUrls(host: string, desc?: LocoDesc): string[] {
  if (!desc || desc.index < 0 || !host) return [];
  const base = `http://${host}/loco/image?`;
  if (desc.imageType === 'IMAGE_TYPE_USER') return [`${base}type=external&index=${desc.index}`, `${base}type=user&index=${desc.index}`];
  return [`${base}type=internal&index=${desc.index}`];
}

/**
 * Afbeelding van de loc: je eigen foto, anders het plaatje uit de ECoS,
 * anders een rustig getekend silhouet (zonder pantograaf bij diesel/stoom).
 */
export function LocoPhoto({
  uri,
  ecosId,
  style,
  rounded = R.md,
  hint = false,
}: {
  uri?: string;
  ecosId?: number | null;
  style?: StyleProp<ViewStyle>;
  rounded?: number;
  hint?: boolean;
}) {
  const mode = useEcos((s) => s.mode);
  const desc = useEcos((s) => (ecosId != null ? s.locos[ecosId]?.locodesc : undefined));
  const host = useActiveProfile().host.trim();
  const candidates = useMemo(() => {
    if (uri) return [uri];
    return mode === 'tcp' ? ecosImageUrls(host, desc).filter((u) => !failedImages.has(u)) : [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uri, mode, host, desc?.imageType, desc?.index]);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => setAttempt(0), [candidates]);
  const src = candidates[attempt];

  if (src) {
    const own = src === uri;
    return (
      <View style={[{ overflow: 'hidden', borderRadius: rounded, backgroundColor: own ? C.panel2 : C.photoWin, alignItems: 'center', justifyContent: 'center' }, style]}>
        <Image
          source={{ uri: src }}
          style={own ? { width: '100%', height: '100%' } : { width: '92%', height: '84%' }}
          resizeMode={own ? 'cover' : 'contain'}
          onError={() => {
            if (!own) failedImages.add(src);
            setAttempt((a) => a + 1);
          }}
        />
      </View>
    );
  }
  const electric = !desc || desc.locoType === 'LOCO_TYPE_E' || desc.locoType === 'LOCO_TYPE_MISC';
  return (
    <View style={[{ overflow: 'hidden', borderRadius: rounded, backgroundColor: C.panel2, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Svg width="62%" height="56%" viewBox="0 0 240 110" preserveAspectRatio="xMidYMid meet">
        {electric ? <Path d="M60 26 L84 6 M84 6 L108 26 M150 26 L174 6 M174 6 L198 26 M70 6 H190" stroke={C.photoLine} strokeWidth={3} fill="none" /> : null}
        {desc?.locoType === 'LOCO_TYPE_STEAM' ? <Rect x={150} y={8} width={16} height={22} rx={3} fill={C.photoBody} /> : null}
        <Path d="M16 84 V40 Q16 28 28 28 H206 Q222 28 230 46 L234 84 Z" fill={C.photoBody} />
        <Rect x={16} y={62} width={216} height={6} fill={C.accent} opacity={0.85} />
        <Rect x={196} y={36} width={24} height={18} rx={3} fill={C.photoWin} />
        {[34, 70, 106].map((x) => (
          <Rect key={x} x={x} y={36} width={26} height={16} rx={3} fill={C.photoWin} opacity={0.8} />
        ))}
        <Rect x={10} y={84} width={228} height={6} fill={C.photoBase} />
        {[44, 74, 170, 200].map((x) => (
          <Circle key={x} cx={x} cy={96} r={9} fill={C.photoBase} stroke={C.photoLine} strokeWidth={2} />
        ))}
      </Svg>
      {hint ? <Text style={{ position: 'absolute', bottom: 8, right: 12, color: C.muted, fontSize: 12 }}>Foto toevoegen in Bibliotheek</Text> : null}
    </View>
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

/** Kleine functietegel (multi). */
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
