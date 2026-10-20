import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CabControl } from '../components/Cab';
import { NotConnected } from '../components/Chrome';
import { LocoPicker } from '../components/Dialogs';
import { Icon } from '../components/Icon';
import { LocoPhoto } from '../components/Loco';
import { Button } from '../components/ui';
import { metaKey, selectLoco } from '../store/actions';
import { useEcos } from '../store/ecos';
import { useScrollEnabled } from '../store/ui';
import { useCurrentLocoId, useFunctions, useLoco, useLocoMeta, useMode, useRecentLocos } from '../store/hooks';
import { useSettings } from '../store/settings';
import { C, F } from '../theme';

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
            <LocoPhoto ecosId={id} uri={meta[metaKey(id, mode)]?.photo} style={{ width: 52, height: 36 }} rounded={18} />
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
  const scrollEnabled = useScrollEnabled();
  const id = useCurrentLocoId();
  const loco = useLoco(id);
  const meta = useLocoMeta(id);
  const funcs = useFunctions(loco, meta);
  const [picker, setPicker] = useState(false);

  if (conn !== 'connected') return <NotConnected />;
  if (!loco || id == null) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <Text style={{ color: C.text, fontSize: 22, fontWeight: F.bold }}>Nog geen locs in de ECoS</Text>
        <Button title="Loc toevoegen" icon="plus" kind="primary" onPress={() => router.navigate('/locs')} />
      </View>
    );
  }

  return (
    <>
      <ScrollView scrollEnabled={scrollEnabled} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24, gap: 16 }}>
        <RecentStrip current={id} onMore={() => setPicker(true)} />
        <CabControl id={id} loco={loco} meta={meta} funcs={funcs} onSwitch={() => setPicker(true)} />
        <Text style={{ color: C.muted, fontSize: 13, textAlign: 'center' }}>Scroll aan het duimwiel: omhoog is meer gas, omlaag minder. Bij vol gas stopt het; terugdraaien neemt meteen gas terug.</Text>
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
