import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LocoPicker } from '../components/Dialogs';
import { Icon } from '../components/Icon';
import { DirectionButtons, FunctionRow, LocoPhoto, QuickFunction } from '../components/Loco';
import { NotConnected } from '../components/Chrome';
import { BrakePanel, EmergencyStopButton, LiveStatusPanel, RoutesPanel } from '../components/Panels';
import { SpeedKnob } from '../components/SpeedKnob';
import { Button, Panel } from '../components/ui';
import { selectLoco, setSpeed } from '../store/actions';
import { useEcos } from '../store/ecos';
import { kmh, useCurrentLocoId, useFunctions, useLoco, useLocoMeta, vmaxOf } from '../store/hooks';
import { C, F, R } from '../theme';

export default function DriveScreen() {
  const conn = useEcos((s) => s.conn);
  const id = useCurrentLocoId();
  const loco = useLoco(id);
  const meta = useLocoMeta(id);
  const funcs = useFunctions(loco, meta);
  const neutral = useEcos((s) => (id != null ? !!s.neutral[id] : false));
  const [picker, setPicker] = useState(false);
  const { width } = useWindowDimensions();
  const wide = width >= 820;

  if (conn !== 'connected') return <NotConnected />;
  if (!loco || id == null) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <Text style={{ color: C.text, fontSize: 22, fontWeight: F.bold }}>Nog geen locs in de ECoS</Text>
        <Button title="Loc toevoegen" icon="plus" kind="primary" onPress={() => router.navigate('/locs')} />
      </View>
    );
  }

  const vmax = vmaxOf(loco, meta);
  const quick = (meta.quick?.length ? meta.quick : [0, funcs.find((f) => f.icon === 'horn')?.n ?? 1])
    .map((n) => funcs.find((f) => f.n === n))
    .filter((f): f is NonNullable<typeof f> => !!f)
    .slice(0, 2);

  const left = (
    <View style={{ flex: wide ? 1.75 : undefined, gap: 16 }}>
      <View style={styles.card}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Andere loc kiezen"
          onPress={() => setPicker(true)}
          style={({ pressed }) => [styles.cardHead, pressed ? { opacity: 0.9 } : null]}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.ink, fontSize: 34, fontWeight: F.heavy }} numberOfLines={1}>
              {loco.name}
            </Text>
            <Text style={{ color: C.ink, fontSize: 19, fontWeight: F.medium }}>
              {loco.protocol.startsWith('DCC') ? 'DCC' : loco.protocol} adres {loco.addr}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            {meta.subtitle ? <Text style={{ color: C.ink, fontSize: 19, fontWeight: F.medium }}>{meta.subtitle}</Text> : null}
            {meta.kind ? <Text style={{ color: C.ink, fontSize: 17 }}>{meta.kind}</Text> : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(10,26,63,0.12)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
              <Icon name="refresh" size={16} color={C.ink} strokeWidth={2.4} />
              <Text style={{ color: C.ink, fontSize: 14, fontWeight: F.bold }}>Wissel loc</Text>
            </View>
          </View>
        </Pressable>
        <LocoPhoto uri={meta.photo} style={{ height: wide ? 300 : 240 }} rounded={0} hint />
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 20, gap: 12 }}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
              <Text style={{ color: C.text, fontSize: 96, fontWeight: F.heavy, fontVariant: ['tabular-nums'] }}>{kmh(loco.speed, vmax)}</Text>
              <Text style={{ color: C.text, fontSize: 32, fontWeight: F.semi }}>km/h</Text>
            </View>
            <Text style={{ color: C.textSoft, fontSize: 18 }}>Schaalsnelheid (max {vmax} km/h)</Text>
            <Text style={{ color: C.muted, fontSize: 15, marginTop: 6 }}>
              {neutral ? 'Neutraal: kies een rijrichting' : `Rijstap ${loco.speed} van 126 · ${loco.dir === 0 ? 'vooruit' : 'achteruit'}`}
            </Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <SpeedKnob value={loco.speed} onChange={(v) => setSpeed(id, v)} size={wide ? 270 : 240} maxLabel={vmax} disabled={neutral} />
            <Text style={{ color: C.textSoft, fontSize: 17, marginTop: -18 }}>km/h</Text>
          </View>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 16 }}>
        <Panel style={{ flex: 3, padding: 14 }}>
          <DirectionButtons id={id} dir={loco.dir} />
        </Panel>
        {quick.length ? (
          <Panel style={{ flex: 2, padding: 14, flexDirection: 'row', alignItems: 'center' }}>
            {quick.map((f) => (
              <QuickFunction key={f.n} id={id} f={f} />
            ))}
          </Panel>
        ) : null}
      </View>
    </View>
  );

  const right = (
    <Panel style={{ flex: wide ? 1 : undefined, padding: 10, minHeight: wide ? undefined : 420 }}>
      <Text style={{ color: C.text, fontSize: 19, fontWeight: F.bold, margin: 6 }}>Functies</Text>
      <View style={{ flex: 1 }}>
        <ScrollView style={wide ? StyleSheet.absoluteFill : undefined} contentContainerStyle={{ gap: 8, paddingBottom: 6 }}>
          {!loco.detailsLoaded ? <Text style={{ color: C.muted, fontSize: 16, padding: 8 }}>Functies laden…</Text> : null}
          {funcs.map((f) => (
            <FunctionRow key={f.n} id={id} f={f} />
          ))}
        </ScrollView>
      </View>
    </Panel>
  );

  return (
    <>
      <ScrollView contentContainerStyle={{ padding: 18, gap: 16 }}>
        <View style={{ flexDirection: wide ? 'row' : 'column', gap: 16 }}>
          {left}
          {right}
        </View>
        <View style={{ flexDirection: 'row', gap: 16, alignItems: 'stretch' }}>
          <Panel style={{ flex: 1, justifyContent: 'center', paddingVertical: 22 }}>
            <BrakePanel id={id} />
          </Panel>
          <Panel style={{ width: 210, alignItems: 'center', justifyContent: 'center' }}>
            <EmergencyStopButton />
          </Panel>
        </View>
        <LiveStatusPanel />
        <RoutesPanel />
      </ScrollView>
      <LocoPicker
        visible={picker}
        onClose={() => setPicker(false)}
        onPick={(pick) => {
          if (pick != null) selectLoco(pick);
          setPicker(false);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: C.panel, borderRadius: R.lg, overflow: 'hidden', borderWidth: 1, borderColor: C.borderSoft },
  cardHead: { backgroundColor: C.yellow, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 22, paddingVertical: 16, gap: 12 },
});
