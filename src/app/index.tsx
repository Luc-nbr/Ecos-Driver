import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { NotConnected, useCompactSidebar } from '../components/Chrome';
import { LocoPicker } from '../components/Dialogs';
import { Icon } from '../components/Icon';
import { JogWheel } from '../components/JogWheel';
import { DirectionButtons, FunctionButton, LocoPhoto, LocoSwitchButton } from '../components/Loco';
import { BrakePanel } from '../components/Panels';
import { Button } from '../components/ui';
import { metaKey, selectLoco, setSpeed, stopLoco } from '../store/actions';
import { useEcos } from '../store/ecos';
import { kmh, useCurrentLocoId, useFunctions, useLoco, useLocoMeta, useMode, useRecentLocos, vmaxOf } from '../store/hooks';
import { useSettings } from '../store/settings';
import { C, F, R, themed } from '../theme';

/** Strook met recent bestuurde locs: één tik om te wisselen. */
function RecentStrip({ current, onMore }: { current: number; onMore: () => void }) {
  const recent = useRecentLocos();
  const locos = useEcos((s) => s.locos);
  const ids = useEcos((s) => s.locoIds);
  const meta = useSettings((s) => s.meta);
  const mode = useMode();
  // eerst recent, dan aanvullen met de rest zodat er altijd iets te kiezen is
  const list = [...recent, ...ids.filter((i) => !recent.includes(i))].slice(0, 10);
  if (!list.includes(current)) list.unshift(current);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 8 }}>
      {list.map((id) => {
        const l = locos[id];
        if (!l) return null;
        const on = id === current;
        return (
          <Pressable
            key={id}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`Rijden met ${l.name}`}
            onPress={() => selectLoco(id)}
            style={({ pressed }) => [
              { flexDirection: 'row', alignItems: 'center', gap: 8, height: 48, paddingLeft: 6, paddingRight: 14, borderRadius: 24, backgroundColor: on ? C.accentSoft : C.panel },
              on ? { borderWidth: 1, borderColor: C.accent } : { borderWidth: StyleSheet.hairlineWidth, borderColor: C.border },
              pressed ? { opacity: 0.75 } : null,
            ]}
          >
            <LocoPhoto uri={meta[metaKey(id, mode)]?.photo} style={{ width: 52, height: 36 }} rounded={18} />
            <Text style={{ color: on ? C.accent : C.text, fontSize: 15, fontWeight: on ? F.semi : F.medium }} numberOfLines={1}>
              {l.name}
            </Text>
            {l.speed > 0 ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.green }} /> : null}
          </Pressable>
        );
      })}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Alle locs"
        onPress={onMore}
        style={({ pressed }) => [
          { flexDirection: 'row', alignItems: 'center', gap: 6, height: 48, paddingHorizontal: 16, borderRadius: 24, backgroundColor: C.panel, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border },
          pressed ? { opacity: 0.75 } : null,
        ]}
      >
        <Icon name="list" size={18} color={C.accent} />
        <Text style={{ color: C.accent, fontSize: 15, fontWeight: F.semi }}>Alle locs</Text>
      </Pressable>
    </ScrollView>
  );
}

export default function DriveScreen() {
  const conn = useEcos((s) => s.conn);
  const id = useCurrentLocoId();
  const loco = useLoco(id);
  const meta = useLocoMeta(id);
  const funcs = useFunctions(loco, meta);
  const neutral = useEcos((s) => (id != null ? !!s.neutral[id] : false));
  const [picker, setPicker] = useState(false);
  const { width } = useWindowDimensions();
  const compactSidebar = useCompactSidebar();
  const contentW = width - (compactSidebar ? 92 : 250);
  const wide = contentW >= 820;

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
  const wheel = Math.min(260, Math.max(200, (contentW * (wide ? 0.53 : 1) - 60) / 2));
  const subtitle = [`${loco.protocol.startsWith('DCC') ? 'DCC' : loco.protocol} ${loco.addr}`, meta.subtitle, meta.kind].filter(Boolean).join(' · ');

  const left = (
    <View style={{ flex: wide ? 1.15 : undefined, gap: 16 }}>
      <View style={[styles().card, { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 14 }]}>
        <LocoPhoto uri={meta.photo} style={{ width: wide ? 190 : 150, height: wide ? 112 : 90 }} rounded={14} />
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <Text style={{ color: C.text, fontSize: 28, fontWeight: F.bold }} numberOfLines={1}>
            {loco.name}
          </Text>
          <Text style={{ color: C.muted, fontSize: 15 }} numberOfLines={1}>
            {subtitle}
          </Text>
          <View style={{ flexDirection: 'row', marginTop: 8 }}>
            <LocoSwitchButton onPress={() => setPicker(true)} />
          </View>
        </View>
      </View>

      <View style={[styles().card, { padding: 18, gap: 16 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
          <JogWheel value={loco.speed} onChange={(v) => setSpeed(id, v)} size={wheel} maxLabel={vmax} disabled={neutral} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ color: C.text, fontSize: 72, fontWeight: F.bold, fontVariant: ['tabular-nums'], letterSpacing: -1 }}>{kmh(loco.speed, vmax)}</Text>
            <Text style={{ color: C.muted, fontSize: 20, fontWeight: F.medium, marginTop: -8 }}>km/h</Text>
            <Text style={{ color: C.muted, fontSize: 14, marginTop: 8 }}>
              {neutral ? 'Neutraal: kies een rijrichting' : `Rijstap ${loco.speed} / 126`}
            </Text>
            <Text style={{ color: C.muted, fontSize: 14 }}>max {vmax} km/h</Text>
          </View>
        </View>
        <DirectionButtons id={id} dir={loco.dir} />
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 14 }}>
          <View style={{ flex: 1 }}>
            <BrakePanel id={id} />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${loco.name} stoppen`}
            onPress={() => stopLoco(id)}
            style={({ pressed }) => [{ height: 46, paddingHorizontal: 20, borderRadius: 14, backgroundColor: C.redSoft, alignItems: 'center', justifyContent: 'center' }, pressed ? { opacity: 0.7 } : null]}
          >
            <Text style={{ color: C.red, fontSize: 16, fontWeight: F.semi }}>Loc stoppen</Text>
          </Pressable>
        </View>
      </View>
      <Text style={{ color: C.muted, fontSize: 13, textAlign: 'center' }}>Draai het wiel met de klok mee om sneller te rijden. Na een zwiep draait het nog even door.</Text>
    </View>
  );

  const right = (
    <View style={[styles().card, { flex: wide ? 1 : undefined, padding: 14, minHeight: wide ? undefined : 420 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingHorizontal: 2 }}>
        <Text style={{ color: C.text, fontSize: 20, fontWeight: F.bold }}>Functies</Text>
        <Text style={{ color: C.muted, fontSize: 13 }}>{funcs.filter((f) => f.on).length} aan</Text>
      </View>
      <View style={{ flex: 1 }}>
        <ScrollView style={wide ? StyleSheet.absoluteFill : undefined} contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 6 }}>
          {!loco.detailsLoaded ? <Text style={{ color: C.muted, fontSize: 15, padding: 8 }}>Functies laden…</Text> : null}
          {funcs.map((f) => (
            <FunctionButton key={f.n} id={id} f={f} />
          ))}
        </ScrollView>
      </View>
    </View>
  );

  return (
    <>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24, gap: 16 }}>
        <RecentStrip current={id} onMore={() => setPicker(true)} />
        <View style={{ flexDirection: wide ? 'row' : 'column', gap: 16 }}>
          {left}
          {right}
        </View>
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

const styles = themed(() => StyleSheet.create({
  card: { backgroundColor: C.panel, borderRadius: R.xl, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border },
}));
