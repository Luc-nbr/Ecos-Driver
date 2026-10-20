import React from 'react';
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { C, F, R, themed } from '../theme';
import { Icon, IconName } from './Icon';

/** Kaart in Apple-stijl: grafiet vlak, ruime afronding, haarlijn-rand. */
export function Panel({ children, style }: { children?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles().panel, style]}>{children}</View>;
}

export function SectionTitle({ icon, title, right }: { icon?: IconName; title: string; right?: React.ReactNode }) {
  return (
    <View style={styles().sectionRow}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}>
        {icon ? <Icon name={icon} size={20} color={C.muted} /> : null}
        <Text style={styles().sectionTitle} numberOfLines={1}>
          {title}
        </Text>
      </View>
      {right}
    </View>
  );
}

export function Toggle({ value, onChange, disabled, label }: { value: boolean; onChange?: (v: boolean) => void; disabled?: boolean; label?: string }) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      aria-checked={value}
      accessibilityLabel={label}
      disabled={disabled}
      onPress={() => onChange?.(!value)}
      hitSlop={8}
      style={[styles().toggle, value ? styles().toggleOn : null, disabled ? { opacity: 0.5 } : null]}
    >
      <View style={[styles().toggleKnob, value ? { alignSelf: 'flex-end' } : null]} />
    </Pressable>
  );
}

type BtnKind = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success' | 'tinted';

export function Button({
  title,
  icon,
  onPress,
  kind = 'secondary',
  disabled,
  loading,
  style,
  textStyle,
  small,
}: {
  title: string;
  icon?: IconName;
  onPress?: () => void;
  kind?: BtnKind;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  small?: boolean;
}) {
  const bg = { primary: C.accent, secondary: C.panel2, danger: C.red, ghost: 'transparent', success: C.green, tinted: C.accentSoft }[kind];
  const fg = kind === 'primary' || kind === 'success' ? C.ink : kind === 'tinted' || kind === 'ghost' ? C.accent : C.text;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles().btn,
        small ? { minHeight: 44, paddingHorizontal: 14, borderRadius: 12 } : null,
        { backgroundColor: bg },
        pressed ? { opacity: 0.75 } : null,
        disabled ? { opacity: 0.4 } : null,
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : icon ? <Icon name={icon} size={small ? 18 : 20} color={fg} strokeWidth={2.2} /> : null}
      <Text style={[styles().btnText, { color: fg }, small ? { fontSize: 15 } : null, textStyle]}>{title}</Text>
    </Pressable>
  );
}

export function IconButton({
  icon,
  onPress,
  label,
  size = 44,
  color = C.text,
  bg = C.panel2,
}: {
  icon: IconName;
  onPress?: () => void;
  label: string;
  size?: number;
  color?: string;
  bg?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' },
        pressed ? { opacity: 0.7 } : null,
      ]}
    >
      <Icon name={icon} size={size * 0.45} color={color} strokeWidth={2.2} />
    </Pressable>
  );
}

export function Pill({ text, color = C.green, dot = true }: { text: string; color?: string; dot?: boolean }) {
  return (
    <View style={styles().pill}>
      {dot ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} /> : null}
      <Text style={{ color: C.textSoft, fontSize: 14, fontWeight: F.semi }}>{text}</Text>
    </View>
  );
}

/** Gesegmenteerde knop zoals in iOS. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  big,
}: {
  options: { value: T; label: string; icon?: IconName }[];
  value: T | null;
  onChange: (v: T) => void;
  label?: string;
  big?: boolean;
}) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={[styles().segTrack, big ? { borderRadius: 14, padding: 3 } : null]}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            aria-checked={on}
            accessibilityLabel={o.label || o.value}
            onPress={() => onChange(o.value)}
            style={[styles().seg, big ? { minHeight: 52, borderRadius: 11 } : null, on ? styles().segOn : null]}
          >
            {o.icon ? <Icon name={o.icon} size={big ? 20 : 17} color={on ? C.text : C.muted} strokeWidth={2.4} /> : null}
            {o.label ? <Text style={{ color: on ? C.text : C.muted, fontSize: big ? 16 : 14, fontWeight: on ? F.semi : F.medium }}>{o.label}</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

export const styles = themed(() => StyleSheet.create({
  panel: {
    backgroundColor: C.panel,
    borderRadius: R.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    padding: 16,
  },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 12 },
  sectionTitle: { color: C.text, fontSize: 20, fontWeight: F.bold, letterSpacing: 0.2 },
  toggle: { width: 51, height: 31, borderRadius: 16, padding: 2, backgroundColor: C.toggleOff, justifyContent: 'center' },
  toggleOn: { backgroundColor: C.accent },
  toggleKnob: { width: 27, height: 27, borderRadius: 14, backgroundColor: '#FFFFFF' },
  btn: { minHeight: 50, paddingHorizontal: 18, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  btnText: { fontSize: 17, fontWeight: F.semi },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, height: 32, borderRadius: 16, backgroundColor: C.panel2 },
  segTrack: { flexDirection: 'row', backgroundColor: C.segTrack, borderRadius: 10, padding: 2, gap: 2, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border },
  seg: { flex: 1, minHeight: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, paddingHorizontal: 8 },
  segOn: { backgroundColor: C.segOn, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
}));
