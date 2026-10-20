import { router } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NotConnected } from '../components/Chrome';
import { LocoPhoto } from '../components/Loco';
import { RoutesPanel, StatTile } from '../components/Panels';
import { Button, Panel, SectionTitle } from '../components/ui';
import { emergencyStop, metaKey, selectLoco, setPower } from '../store/actions';
import { useEcos } from '../store/ecos';
import { kmh, useMode, useRecentLocos, vmaxOf } from '../store/hooks';
import { useActiveProfile, useSettings } from '../store/settings';
import { C, F, R } from '../theme';

export default function OverviewScreen() {
  const conn = useEcos((s) => s.conn);
  const mode = useMode();
  const info = useEcos((s) => s.info);
  const status = useEcos((s) => s.status);
  const latency = useEcos((s) => s.latency);
  const locoIds = useEcos((s) => s.locoIds);
  const locos = useEcos((s) => s.locos);
  const accIds = useEcos((s) => s.accessoryIds);
  const acc = useEcos((s) => s.accessories);
  const meta = useSettings((s) => s.meta);
  const recent = useRecentLocos();
  const profile = useActiveProfile();
  if (conn !== 'connected') return <NotConnected />;

  const routes = accIds.filter((id) => acc[id]?.type === 'ROUTE').length;
  const moving = Object.values(locos).filter((l) => l.speed > 0).length;
  const go = status === 'GO';
  const shown = (recent.length ? recent : locoIds).slice(0, 8);

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24, gap: 16 }}>
      <Text style={{ color: C.muted, fontSize: 16 }}>
        {mode === 'demo' ? 'Demo-baan' : profile.name} · ESU {info?.model ?? 'ECoS'}
        {info?.applicationVersion ? ` · firmware ${info.applicationVersion}` : ''}
      </Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <StatTile value={String(locoIds.length)} label="Locs" icon="train" onPress={() => router.navigate('/locs')} />
        <StatTile value={String(accIds.length - routes)} label="Wissels en seinen" icon="turnout" />
        <StatTile value={String(routes)} label="Rijwegen" icon="route" />
        <StatTile value={String(moving)} label="Rijden nu" icon="gauge" color={moving ? C.accent : C.text} />
        <StatTile value={latency === null ? '–' : `${latency}`} label="ms reactietijd" icon="wifi" />
      </View>

      <Panel style={{ flexDirection: 'row', alignItems: 'center', gap: 16, padding: 20 }}>
        <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: go ? C.green : C.red }} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.text, fontSize: 20, fontWeight: F.bold }}>Baan {go ? 'onder spanning' : 'gestopt'}</Text>
          <Text style={{ color: C.muted, fontSize: 15 }}>{go ? 'GO: locs kunnen rijden' : 'STOP: er staat geen spanning op de baan'}</Text>
        </View>
        {go ? (
          <Button title="STOP" icon="stopSquare" kind="danger" onPress={emergencyStop} />
        ) : (
          <Button title="GO" icon="play" kind="success" onPress={() => setPower(true)} />
        )}
      </Panel>

      <Panel>
        <SectionTitle title={recent.length ? 'Recent bestuurd' : 'Locs'} right={<Text style={{ color: C.muted, fontSize: 14 }}>Tik om te rijden</Text>} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {shown.map((id) => {
            const l = locos[id];
            if (!l) return null;
            const m = meta[metaKey(id, mode)] ?? {};
            return (
              <Pressable
                key={id}
                accessibilityRole="button"
                accessibilityLabel={`Rijden met ${l.name}`}
                onPress={() => {
                  selectLoco(id);
                  router.navigate('/');
                }}
                style={({ pressed }) => [
                  { width: 200, flexGrow: 1, maxWidth: 260, borderRadius: R.lg, overflow: 'hidden', backgroundColor: C.panel2 },
                  pressed ? { opacity: 0.75 } : null,
                ]}
              >
                <LocoPhoto uri={m.photo} style={{ height: 110 }} rounded={0} />
                <View style={{ padding: 12, flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: C.text, fontSize: 16, fontWeight: F.semi }} numberOfLines={1}>
                      {l.name}
                    </Text>
                    <Text style={{ color: C.muted, fontSize: 13 }} numberOfLines={1}>
                      {m.subtitle || `${l.protocol} · ${l.addr}`}
                    </Text>
                  </View>
                  <Text style={{ color: l.speed > 0 ? C.accent : C.muted, fontSize: 15, fontWeight: F.semi, fontVariant: ['tabular-nums'] }}>
                    {kmh(l.speed, vmaxOf(l, m))} km/h
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </Panel>

      <RoutesPanel />
      <View style={{ height: StyleSheet.hairlineWidth }} />
    </ScrollView>
  );
}
