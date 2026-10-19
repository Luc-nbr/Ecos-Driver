// Kopbalk, navigatiebalk en meldingen rond alle schermen.
import { router, usePathname } from 'expo-router';
import React from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { emergencyStop, setPower } from '../store/actions';
import { useEcos } from '../store/ecos';
import { useSettings } from '../store/settings';
import { C, F, R, shadow } from '../theme';
import { AppLogo, Icon, IconName } from './Icon';

function SignalDots({ latency, ok }: { latency: number | null; ok: boolean }) {
  const bars = !ok ? 0 : latency === null ? 4 : latency < 60 ? 4 : latency < 150 ? 3 : latency < 400 ? 2 : 1;
  return (
    <View style={{ flexDirection: 'row', gap: 5 }}>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={{ width: 13, height: 13, borderRadius: 7, backgroundColor: i < bars ? C.green : '#2A4378' }} />
      ))}
    </View>
  );
}

export function Header() {
  const { width } = useWindowDimensions();
  const narrow = width < 900;
  const title = useSettings((s) => s.title);
  const subtitle = useSettings((s) => s.subtitle);
  const conn = useEcos((s) => s.conn);
  const mode = useEcos((s) => s.mode);
  const status = useEcos((s) => s.status);
  const latency = useEcos((s) => s.latency);
  const info = useEcos((s) => s.info);
  const connected = conn === 'connected';
  const connText =
    conn === 'connected'
      ? mode === 'demo'
        ? 'Demo-modus'
        : 'Verbonden'
      : conn === 'connecting'
        ? 'Verbinden…'
        : conn === 'reconnecting'
          ? 'Opnieuw verbinden…'
          : 'Niet verbonden';
  const stopped = connected && status === 'STOP';

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, gap: 16, borderBottomWidth: 1, borderBottomColor: C.borderSoft }}>
      <AppLogo size={narrow ? 44 : 52} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ color: C.text, fontSize: narrow ? 22 : 27, fontWeight: F.bold }} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={{ color: C.textSoft, fontSize: 15 }} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`ECoS: ${connText}. Open verbinding.`}
        onPress={() => router.navigate('/settings')}
        style={({ pressed }) => [
          { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6, paddingHorizontal: 8, borderRadius: R.md },
          pressed ? { backgroundColor: C.panel } : null,
        ]}
      >
        <View style={{ width: 52, height: 52, borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: C.panel, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="train" size={28} color={C.text} />
        </View>
        <View>
          <Text style={{ color: C.text, fontSize: 18, fontWeight: F.semi }}>{info?.model ? `ESU ${info.model}` : 'ESU ECoS'}</Text>
          <Text style={{ color: connected ? C.green : conn === 'error' ? '#FF8A80' : C.muted, fontSize: 15, fontWeight: F.semi }}>{connText}</Text>
        </View>
        {!narrow ? <SignalDots latency={latency} ok={connected} /> : null}
        <Icon name="chevronRight" size={22} color={C.textSoft} />
      </Pressable>

      {connected ? (
        stopped ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Spanning weer aanzetten (GO)"
            onPress={() => setPower(true)}
            style={({ pressed }) => [
              { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, height: 60, borderRadius: R.md, backgroundColor: C.green },
              shadow,
              pressed ? { opacity: 0.85 } : null,
            ]}
          >
            <Icon name="play" size={26} color={C.ink} fill={C.ink} />
            <View>
              <Text style={{ color: C.ink, fontSize: 20, fontWeight: F.heavy }}>GO</Text>
              <Text style={{ color: C.ink, fontSize: 13, fontWeight: F.semi }}>Spanning aan</Text>
            </View>
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Noodstop: alle locs stoppen"
            onPress={emergencyStop}
            style={({ pressed }) => [
              { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, height: 60, borderRadius: R.md, backgroundColor: C.red },
              shadow,
              pressed ? { backgroundColor: C.redDark } : null,
            ]}
          >
            <Icon name="stopSquare" size={30} color="#fff" />
            <View>
              <Text style={{ color: '#fff', fontSize: 20, fontWeight: F.heavy }}>STOP</Text>
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: F.semi }}>Alle locs</Text>
            </View>
          </Pressable>
        )
      ) : null}
    </View>
  );
}

const NAV: { path: string; label: string; icon: IconName }[] = [
  { path: '/', label: 'Rijden', icon: 'train' },
  { path: '/duo', label: 'Duo', icon: 'duo' },
  { path: '/multi', label: 'Multi', icon: 'grid' },
  { path: '/ecos', label: 'ECoS', icon: 'device' },
  { path: '/locs', label: 'Locomotieven', icon: 'image' },
  { path: '/settings', label: 'Instellingen', icon: 'settings' },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: C.borderSoft, backgroundColor: C.bgDeep, paddingTop: 8 }}>
      {NAV.map((n) => {
        const active = n.path === '/' ? path === '/' : path.startsWith(n.path);
        return (
          <Pressable
            key={n.path}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => router.navigate(n.path as never)}
            style={{ flex: 1, alignItems: 'center', gap: 4, paddingVertical: 6, minHeight: 60 }}
          >
            <Icon name={n.icon} size={28} color={active ? C.yellow : C.muted} />
            <Text style={{ color: active ? C.yellow : C.muted, fontSize: 15, fontWeight: active ? F.bold : F.medium }}>{n.label}</Text>
            <View style={{ height: 4, width: 70, borderRadius: 2, backgroundColor: active ? C.yellow : 'transparent', marginTop: 2 }} />
          </Pressable>
        );
      })}
    </View>
  );
}

export function ToastHost() {
  const toast = useEcos((s) => s.toast);
  if (!toast) return null;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 100, left: 0, right: 0, alignItems: 'center' }}>
      <View
        style={[
          {
            maxWidth: 600,
            paddingHorizontal: 20,
            paddingVertical: 14,
            borderRadius: R.md,
            backgroundColor: toast.kind === 'error' ? '#5A1414' : C.panelHi,
            borderWidth: 1,
            borderColor: toast.kind === 'error' ? C.red : C.border,
            flexDirection: 'row',
            gap: 10,
            alignItems: 'center',
          },
          shadow,
        ]}
      >
        <Icon name={toast.kind === 'error' ? 'warning' : 'check'} size={22} color={toast.kind === 'error' ? '#FF8A80' : C.green} />
        <Text style={{ color: C.text, fontSize: 16, fontWeight: F.semi, flexShrink: 1 }}>{toast.text}</Text>
      </View>
    </View>
  );
}

/** Melding als er geen verbinding is, met knop naar de verbindingsinstellingen. */
export function NotConnected() {
  const conn = useEcos((s) => s.conn);
  const error = useEcos((s) => s.error);
  const busy = conn === 'connecting' || conn === 'reconnecting';
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 16 }}>
      <View style={{ width: 96, height: 96, borderRadius: 24, backgroundColor: C.panel, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border }}>
        <Icon name="wifi" size={48} color={busy ? C.yellow : C.muted} />
      </View>
      <Text style={{ color: C.text, fontSize: 26, fontWeight: F.bold, textAlign: 'center' }}>
        {busy ? 'Verbinden met de ECoS…' : 'Niet verbonden met de ECoS'}
      </Text>
      {error && !busy ? <Text style={{ color: '#FF8A80', fontSize: 16, textAlign: 'center', maxWidth: 520 }}>{error}</Text> : null}
      {!busy ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.navigate('/settings')}
          style={({ pressed }) => [
            { backgroundColor: C.yellow, paddingHorizontal: 24, height: 56, borderRadius: R.md, alignItems: 'center', justifyContent: 'center' },
            pressed ? { opacity: 0.85 } : null,
          ]}
        >
          <Text style={{ color: C.ink, fontSize: 18, fontWeight: F.bold }}>Naar verbinding</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
