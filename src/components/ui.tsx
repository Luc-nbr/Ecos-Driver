import React from 'react';
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { C, F, R } from '../theme';
import { Icon, IconName } from './Icon';

export function Panel({ children, style }: { children?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.panel, style]}>{children}</View>;
}

export function SectionTitle({ icon, title, right }: { icon?: IconName; title: string; right?: React.ReactNode }) {
  return (
    <View style={styles.sectionRow}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 }}>
        {icon ? <Icon name={icon} size={24} color={C.textSoft} /> : null}
        <Text style={styles.sectionTitle} numberOfLines={1}>
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
      style={[styles.toggle, value ? styles.toggleOn : null, disabled ? { opacity: 0.5 } : null]}
    >
      <View style={[styles.toggleKnob, value ? { alignSelf: 'flex-end', backgroundColor: '#fff' } : null]} />
    </Pressable>
  );
}

type BtnKind = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';

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
  const bg = { primary: C.yellow, secondary: C.panel2, danger: C.red, ghost: 'transparent', success: C.green }[kind];
  const fg = kind === 'primary' || kind === 'success' ? C.ink : C.text;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        small ? { minHeight: 44, paddingHorizontal: 14 } : null,
        { backgroundColor: bg, borderColor: kind === 'ghost' || kind === 'secondary' ? C.border : bg },
        pressed ? { opacity: 0.8, transform: [{ scale: 0.98 }] } : null,
        disabled ? { opacity: 0.45 } : null,
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : icon ? <Icon name={icon} size={small ? 18 : 22} color={fg} strokeWidth={2.4} /> : null}
      <Text style={[styles.btnText, { color: fg }, small ? { fontSize: 15 } : null, textStyle]}>{title}</Text>
    </Pressable>
  );
}

export function IconButton({
  icon,
  onPress,
  label,
  size = 48,
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
        { width: size, height: size, borderRadius: R.md, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
        pressed ? { opacity: 0.75 } : null,
      ]}
    >
      <Icon name={icon} size={size * 0.46} color={color} strokeWidth={2.2} />
    </Pressable>
  );
}

export function Pill({ text, color = C.green, dot = true }: { text: string; color?: string; dot?: boolean }) {
  return (
    <View style={styles.pill}>
      {dot ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} /> : null}
      <Text style={{ color: C.text, fontSize: 15, fontWeight: F.semi }}>{text}</Text>
    </View>
  );
}

export const styles = StyleSheet.create({
  panel: {
    backgroundColor: C.panel,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.borderSoft,
    padding: 16,
  },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 12 },
  sectionTitle: { color: C.text, fontSize: 21, fontWeight: F.bold },
  toggle: {
    width: 60,
    height: 34,
    borderRadius: 17,
    padding: 3,
    backgroundColor: '#2A4378',
    justifyContent: 'center',
  },
  toggleOn: { backgroundColor: C.yellow },
  toggleKnob: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#EEF2FA' },
  btn: {
    minHeight: 52,
    paddingHorizontal: 18,
    borderRadius: R.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
  },
  btnText: { fontSize: 17, fontWeight: F.bold },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.panel2,
  },
});
