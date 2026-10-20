// Zijbalk, bovenbalk en meldingen rond alle schermen (Apple-stijl splitweergave).
import { router, usePathname } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { emergencyStop, setPower } from '../store/actions';
import { useEcos } from '../store/ecos';
import { useActiveProfile } from '../store/settings';
import { C, F, R, shadow } from '../theme';
import { AppLogo, Icon, IconName } from './Icon';

export const NAV: { path: string; label: string; icon: IconName; group?: string }[] = [
  { path: '/centrales', label: 'Centrales', icon: 'server' },
  { path: '/overzicht', label: 'Overzicht', icon: 'overview' },
  { path: '/', label: 'Rijden', icon: 'train', group: 'Rijden' },
  { path: '/duo', label: 'Duo', icon: 'duo' },
  { path: '/multi', label: 'Multi', icon: 'grid' },
  { path: '/ecos', label: 'ECoS-scherm', icon: 'device' },
  { path: '/locs', label: 'Bibliotheek', icon: 'list', group: 'Beheer' },
  { path: '/settings', label: 'Instellingen', icon: 'settings' },
];

const isActive = (path: string, cur: string) => (path === '/' ? cur === '/' : cur.startsWith(path));

/** Wordt de zijbalk smal (alleen iconen)? Staand op iPad wel, liggend niet. */
export function useCompactSidebar() {
  const { width } = useWindowDimensions();
  return width < 1100;
}

function useConnText() {
  const conn = useEcos((s) => s.conn);
  const mode = useEcos((s) => s.mode);
  const connected = conn === 'connected';
  const text =
    conn === 'connected' ? (mode === 'demo' ? 'Demo-modus' : 'Verbonden') : conn === 'connecting' ? 'Verbinden…' : conn === 'reconnecting' ? 'Opnieuw verbinden…' : 'Niet verbonden';
  const color = connected ? C.green : conn === 'connecting' || conn === 'reconnecting' ? C.accent : C.muted;
  return { text, color, connected };
}

export function Sidebar() {
  const path = usePathname();
  const compact = useCompactSidebar();
  const profile = useActiveProfile();
  const mode = useEcos((s) => s.mode);
  const { text, color } = useConnText();

  return (
    <View
      style={{
        width: compact ? 92 : 250,
        backgroundColor: C.sidebar,
        borderRightWidth: StyleSheet.hairlineWidth,
        borderRightColor: C.border,
        paddingHorizontal: compact ? 8 : 12,
        paddingTop: 16,
        paddingBottom: 12,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: compact ? 0 : 8, marginBottom: 18, justifyContent: compact ? 'center' : 'flex-start' }}>
        <AppLogo size={compact ? 40 : 34} />
        {!compact ? <Text style={{ color: C.text, fontSize: 19, fontWeight: F.bold }}>ECoS Driver</Text> : null}
      </View>

      <View style={{ flex: 1, gap: compact ? 6 : 2 }}>
        {NAV.map((n) => {
          const active = isActive(n.path, path);
          return (
            <React.Fragment key={n.path}>
              {n.group && !compact ? (
                <Text style={{ color: C.muted, fontSize: 13, fontWeight: F.semi, marginTop: 14, marginBottom: 4, marginLeft: 12 }}>{n.group}</Text>
              ) : null}
              {n.group && compact ? <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: C.border, marginVertical: 6, marginHorizontal: 10 }} /> : null}
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={n.label}
                onPress={() => router.navigate(n.path as never)}
                style={({ pressed }) => [
                  compact
                    ? { alignItems: 'center', justifyContent: 'center', gap: 3, paddingVertical: 8, borderRadius: 12, minHeight: 56 }
                    : { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, height: 44, borderRadius: 10 },
                  active ? { backgroundColor: C.accentSoft } : pressed ? { backgroundColor: C.panel } : null,
                ]}
              >
                <Icon name={n.icon} size={compact ? 22 : 20} color={active ? C.accent : C.textSoft} strokeWidth={2} />
                <Text
                  style={{ color: active ? C.accent : C.text, fontSize: compact ? 11 : 16, fontWeight: active ? F.semi : F.medium, textAlign: 'center' }}
                  numberOfLines={1}
                >
                  {compact ? n.label.replace('-scherm', '') : n.label}
                </Text>
              </Pressable>
            </React.Fragment>
          );
        })}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${mode === 'demo' ? 'Demo' : profile.name}: ${text}`}
        onPress={() => router.navigate('/centrales')}
        style={({ pressed }) => [
          { flexDirection: compact ? 'column' : 'row', alignItems: 'center', gap: compact ? 4 : 10, padding: 10, borderRadius: 12, backgroundColor: C.panel },
          pressed ? { opacity: 0.8 } : null,
        ]}
      >
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
        {compact ? (
          <Text style={{ color: C.muted, fontSize: 10, textAlign: 'center' }} numberOfLines={2}>
            {text}
          </Text>
        ) : (
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.text, fontSize: 14, fontWeight: F.semi }} numberOfLines={1}>
              {mode === 'demo' ? 'Demo-baan' : profile.name}
            </Text>
            <Text style={{ color: C.muted, fontSize: 12 }} numberOfLines={1}>
              {text}
            </Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}

/** Bovenbalk met grote titel, verbinding en de STOP/GO-knop voor de hele baan. */
export function TopBar() {
  const path = usePathname();
  const title = NAV.find((n) => isActive(n.path, path))?.label ?? 'ECoS Driver';
  const status = useEcos((s) => s.status);
  const info = useEcos((s) => s.info);
  const latency = useEcos((s) => s.latency);
  const { text, color, connected } = useConnText();
  const stopped = connected && status === 'STOP';

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: 14, paddingBottom: 10, gap: 14 }}>
      <Text style={{ flex: 1, color: C.text, fontSize: 32, fontWeight: F.bold, letterSpacing: 0.3 }} numberOfLines={1}>
        {title}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, height: 36, paddingHorizontal: 12, borderRadius: 18, backgroundColor: C.panel }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
        <Text style={{ color: C.textSoft, fontSize: 14, fontWeight: F.medium }}>
          {connected && info?.model ? `${info.model} · ` : ''}
          {text}
          {connected && latency !== null ? ` · ${latency} ms` : ''}
        </Text>
      </View>
      {connected ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={stopped ? 'Spanning weer aanzetten (GO)' : 'Noodstop: alle locs stoppen'}
          onPress={() => (stopped ? setPower(true) : emergencyStop())}
          style={({ pressed }) => [
            { flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, paddingHorizontal: 20, borderRadius: 22, backgroundColor: stopped ? C.green : C.red },
            pressed ? { opacity: 0.8 } : null,
          ]}
        >
          <Icon name={stopped ? 'play' : 'stopSquare'} size={20} color={stopped ? C.ink : '#fff'} fill={stopped ? C.ink : undefined} strokeWidth={2.2} />
          <Text style={{ color: stopped ? C.ink : '#fff', fontSize: 17, fontWeight: F.bold, letterSpacing: 0.5 }}>{stopped ? 'GO' : 'STOP'}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function ToastHost() {
  const toast = useEcos((s) => s.toast);
  if (!toast) return null;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 24, left: 0, right: 0, alignItems: 'center' }}>
      <View
        style={[
          {
            maxWidth: 560,
            paddingHorizontal: 18,
            paddingVertical: 12,
            borderRadius: 22,
            backgroundColor: C.panel,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: toast.kind === 'error' ? C.red : C.border,
            flexDirection: 'row',
            gap: 10,
            alignItems: 'center',
          },
          shadow,
        ]}
      >
        <Icon name={toast.kind === 'error' ? 'warning' : 'check'} size={20} color={toast.kind === 'error' ? C.red : C.green} />
        <Text style={{ color: C.text, fontSize: 15, fontWeight: F.medium, flexShrink: 1 }}>{toast.text}</Text>
      </View>
    </View>
  );
}

/** Melding als er geen verbinding is, met knop naar de centrales. */
export function NotConnected() {
  const conn = useEcos((s) => s.conn);
  const error = useEcos((s) => s.error);
  const busy = conn === 'connecting' || conn === 'reconnecting';
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 14 }}>
      <View style={{ width: 84, height: 84, borderRadius: 22, backgroundColor: C.panel, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="wifi" size={40} color={busy ? C.accent : C.muted} />
      </View>
      <Text style={{ color: C.text, fontSize: 24, fontWeight: F.bold, textAlign: 'center' }}>{busy ? 'Verbinden met de ECoS…' : 'Niet verbonden'}</Text>
      <Text style={{ color: C.muted, fontSize: 16, textAlign: 'center', maxWidth: 460 }}>
        {error && !busy ? error : 'Kies een centrale om te verbinden, of probeer de demo-modus.'}
      </Text>
      {!busy ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.navigate('/centrales')}
          style={({ pressed }) => [
            { backgroundColor: C.accent, paddingHorizontal: 22, height: 50, borderRadius: R.md, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
            pressed ? { opacity: 0.8 } : null,
          ]}
        >
          <Text style={{ color: C.ink, fontSize: 17, fontWeight: F.semi }}>Naar Centrales</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
