import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { NotConnected } from '../components/Chrome';
import { ConfirmDialog } from '../components/Dialogs';
import { Icon } from '../components/Icon';
import { LocoPhoto } from '../components/Loco';
import { LOCO_KINDS, LocoEditor } from '../components/LocoEditor';
import { Button } from '../components/ui';
import { deleteLoco, metaKey, selectLoco } from '../store/actions';
import { useEcos } from '../store/ecos';
import { useMode } from '../store/hooks';
import { useSettings } from '../store/settings';
import { deleteLocoPhoto } from '../lib/photos';
import { C, F, R } from '../theme';

export default function LibraryScreen() {
  const conn = useEcos((s) => s.conn);
  const ids = useEcos((s) => s.locoIds);
  const locos = useEcos((s) => s.locos);
  const metaAll = useSettings((s) => s.meta);
  const setMeta = useSettings((s) => s.setMeta);
  const mode = useMode();
  const [q, setQ] = useState('');
  const [kind, setKind] = useState('');
  const [editing, setEditing] = useState<{ id: number | null } | null>(null);
  const [removing, setRemoving] = useState<number | null>(null);
  const { width } = useWindowDimensions();
  const cols = width > 1200 ? 4 : width > 760 ? 3 : 2;

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return ids
      .filter((id) => {
        const l = locos[id];
        const m = metaAll[metaKey(id, mode)];
        if (kind === 'Favorieten' && !m?.favorite) return false;
        if (kind && kind !== 'Favorieten' && m?.kind !== kind) return false;
        return !t || l.name.toLowerCase().includes(t) || String(l.addr).includes(t) || (m?.subtitle ?? '').toLowerCase().includes(t);
      })
      .sort((a, b) => Number(!!metaAll[metaKey(b, mode)]?.favorite) - Number(!!metaAll[metaKey(a, mode)]?.favorite));
  }, [ids, locos, metaAll, mode, q, kind]);

  if (conn !== 'connected') return <NotConnected />;
  const removingLoco = removing != null ? locos[removing] : null;

  return (
    <>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 18 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <View style={{ flex: 1, minWidth: 260 }}>
            <Text style={{ color: C.text, fontSize: 30, fontWeight: F.heavy }}>Locomotieven</Text>
            <Text style={{ color: C.textSoft, fontSize: 16 }}>
              {ids.length} {ids.length === 1 ? 'loc' : 'locs'} op de ECoS · wijzigingen gaan direct naar de centrale
            </Text>
          </View>
          <Button title="Nieuwe loc" icon="plus" kind="primary" onPress={() => setEditing({ id: null })} />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.panel, borderRadius: R.md, paddingHorizontal: 14, borderWidth: 1, borderColor: C.border }}>
          <Icon name="search" size={22} color={C.muted} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Zoek op naam, adres of omschrijving"
            placeholderTextColor={C.muted}
            style={{ flex: 1, color: C.text, fontSize: 18, height: 54 }}
            accessibilityLabel="Zoek loc"
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {['', 'Favorieten', ...LOCO_KINDS].map((k) => {
            const on = k === kind;
            return (
              <Pressable
                key={k || 'alle'}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                onPress={() => setKind(k)}
                style={{ paddingHorizontal: 18, height: 44, borderRadius: 22, justifyContent: 'center', backgroundColor: on ? C.yellow : C.panel, borderWidth: 1, borderColor: on ? C.yellow : C.border }}
              >
                <Text style={{ color: on ? C.ink : C.text, fontSize: 15, fontWeight: F.semi }}>{k || 'Alle'}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
          {list.map((id) => {
            const l = locos[id];
            const m = metaAll[metaKey(id, mode)] ?? {};
            return (
              <View
                key={id}
                style={{
                  width: `${100 / cols - 2}%`,
                  flexGrow: 1,
                  maxWidth: `${100 / cols}%`,
                  backgroundColor: C.panel,
                  borderRadius: R.lg,
                  borderWidth: 1,
                  borderColor: C.borderSoft,
                  overflow: 'hidden',
                }}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${l.name} besturen`}
                  onPress={() => {
                    selectLoco(id);
                    router.navigate('/');
                  }}
                >
                  <LocoPhoto uri={m.photo} style={{ height: 150 }} rounded={0} />
                  {l.speed > 0 ? (
                    <View style={{ position: 'absolute', top: 10, left: 10, backgroundColor: C.ink, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}>
                      <Text style={{ color: C.yellow, fontSize: 13, fontWeight: F.bold }}>Rijdt</Text>
                    </View>
                  ) : null}
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={m.favorite ? 'Favoriet uitzetten' : 'Als favoriet markeren'}
                  onPress={() => setMeta(metaKey(id, mode), { favorite: !m.favorite })}
                  hitSlop={8}
                  style={{ position: 'absolute', top: 8, right: 8, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(5,19,55,0.75)', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Icon name="star" size={22} color={C.yellow} fill={m.favorite ? C.yellow : undefined} />
                </Pressable>
                <View style={{ padding: 14, gap: 6 }}>
                  <Text style={{ color: C.text, fontSize: 20, fontWeight: F.bold }} numberOfLines={1}>
                    {l.name}
                  </Text>
                  <Text style={{ color: C.textSoft, fontSize: 15 }} numberOfLines={1}>
                    {[m.subtitle, m.kind].filter(Boolean).join(' · ') || 'Geen omschrijving'}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                    <View style={{ backgroundColor: C.panel2, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                      <Text style={{ color: C.text, fontSize: 13, fontWeight: F.semi }}>Adres {l.addr}</Text>
                    </View>
                    <View style={{ backgroundColor: C.panel2, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                      <Text style={{ color: C.text, fontSize: 13, fontWeight: F.semi }}>{l.protocol}</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                    <Button title="Bewerken" icon="edit" onPress={() => setEditing({ id })} small style={{ flex: 1 }} />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${l.name} verwijderen`}
                      onPress={() => setRemoving(id)}
                      style={({ pressed }) => [
                        { width: 48, height: 44, borderRadius: R.md, borderWidth: 1, borderColor: '#7A2A2A', alignItems: 'center', justifyContent: 'center' },
                        pressed ? { backgroundColor: '#3A1515' } : null,
                      ]}
                    >
                      <Icon name="trash" size={20} color="#FF8A80" />
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          })}
          {list.length === 0 ? <Text style={{ color: C.muted, fontSize: 17, padding: 20 }}>Geen locs gevonden.</Text> : null}
        </View>
      </ScrollView>

      <LocoEditor id={editing?.id ?? null} visible={!!editing} onClose={() => setEditing(null)} />
      <ConfirmDialog
        visible={removing != null}
        title={`${removingLoco?.name ?? 'Loc'} verwijderen?`}
        message="De loc wordt van de ECoS verwijderd, samen met de foto en instellingen in deze app. Dit kan niet ongedaan worden gemaakt."
        confirmText="Verwijderen"
        danger
        onCancel={() => setRemoving(null)}
        onConfirm={async () => {
          const id = removing;
          setRemoving(null);
          if (id == null) return;
          const photo = metaAll[metaKey(id, mode)]?.photo;
          if (await deleteLoco(id)) deleteLocoPhoto(photo);
        }}
      />
    </>
  );
}
