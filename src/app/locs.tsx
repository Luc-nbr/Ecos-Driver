import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { NotConnected } from '../components/Chrome';
import { ConfirmDialog } from '../components/Dialogs';
import { Icon } from '../components/Icon';
import { LocoPhoto } from '../components/Loco';
import { LOCO_KINDS, LocoEditor } from '../components/LocoEditor';
import { AccessoryRow } from '../components/Panels';
import { Button, Segmented } from '../components/ui';
import { deleteLocoPhoto } from '../lib/photos';
import { deleteLoco, metaKey, selectLoco } from '../store/actions';
import { useEcos } from '../store/ecos';
import { useMode } from '../store/hooks';
import { useSettings } from '../store/settings';
import { C, F, R } from '../theme';

type Tab = 'locs' | 'acc';
type Sort = 'naam' | 'adres' | 'protocol';

const KIND_SHORT: Record<string, string> = {
  'Elektrische locomotief': 'Elektrisch',
  Diesellocomotief: 'Diesel',
  Stoomlocomotief: 'Stoom',
  Treinstel: 'Treinstel',
  Overig: 'Overig',
};

export default function LibraryScreen() {
  const conn = useEcos((s) => s.conn);
  const ids = useEcos((s) => s.locoIds);
  const locos = useEcos((s) => s.locos);
  const accIds = useEcos((s) => s.accessoryIds);
  const metaAll = useSettings((s) => s.meta);
  const setMeta = useSettings((s) => s.setMeta);
  const mode = useMode();
  const [tab, setTab] = useState<Tab>('locs');
  const [q, setQ] = useState('');
  const [kind, setKind] = useState('');
  const [sort, setSort] = useState<Sort>('naam');
  const [editing, setEditing] = useState<{ id: number | null } | null>(null);
  const [removing, setRemoving] = useState<number | null>(null);
  const { width } = useWindowDimensions();
  const showKind = width >= 1100;

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    const out = ids.filter((id) => {
      const l = locos[id];
      const m = metaAll[metaKey(id, mode)];
      if (kind === 'Favorieten' && !m?.favorite) return false;
      if (kind && kind !== 'Favorieten' && m?.kind !== kind) return false;
      return !t || l.name.toLowerCase().includes(t) || String(l.addr).includes(t) || (m?.subtitle ?? '').toLowerCase().includes(t);
    });
    const cmp: Record<Sort, (a: number, b: number) => number> = {
      naam: (a, b) => locos[a].name.localeCompare(locos[b].name, 'nl', { numeric: true }),
      adres: (a, b) => locos[a].addr - locos[b].addr,
      protocol: (a, b) => locos[a].protocol.localeCompare(locos[b].protocol),
    };
    return out.sort(cmp[sort]);
  }, [ids, locos, metaAll, mode, q, kind, sort]);

  if (conn !== 'connected') return <NotConnected />;
  const removingLoco = removing != null ? locos[removing] : null;

  const Header = ({ label, k, flex, w }: { label: string; k?: Sort; flex?: number; w?: number }) => (
    <Pressable
      accessibilityRole={k ? 'button' : undefined}
      accessibilityLabel={k ? `Sorteren op ${label}` : label}
      disabled={!k}
      onPress={() => k && setSort(k)}
      style={{ flex, width: w, flexDirection: 'row', alignItems: 'center', gap: 4 }}
    >
      <Text style={{ color: sort === k ? C.accent : C.muted, fontSize: 13, fontWeight: F.semi }}>{label}</Text>
      {k && sort === k ? <Icon name="chevronDown" size={12} color={C.accent} strokeWidth={3} /> : null}
    </Pressable>
  );

  return (
    <>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24, gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1, maxWidth: 460 }}>
            <Segmented
              label="Bibliotheek"
              value={tab}
              onChange={setTab}
              options={[
                { value: 'locs', label: `Locomotieven (${ids.length})` },
                { value: 'acc', label: `Wissels en rijwegen (${accIds.length})` },
              ]}
            />
          </View>
          <View style={{ flex: 1 }} />
          {tab === 'locs' ? <Button title="Nieuwe loc" icon="plus" kind="primary" small onPress={() => setEditing({ id: null })} /> : null}
        </View>

        {tab === 'locs' ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.panel, borderRadius: 12, paddingHorizontal: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border }}>
              <Icon name="search" size={18} color={C.muted} />
              <TextInput
                value={q}
                onChangeText={setQ}
                placeholder="Zoeken op naam, adres of omschrijving"
                placeholderTextColor={C.muted}
                style={{ flex: 1, color: C.text, fontSize: 17, height: 44 }}
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
                    style={{ paddingHorizontal: 14, height: 34, borderRadius: 17, justifyContent: 'center', backgroundColor: on ? C.accent : C.panel2 }}
                  >
                    <Text style={{ color: on ? C.ink : C.textSoft, fontSize: 14, fontWeight: F.semi }}>{k ? KIND_SHORT[k] ?? k : 'Alle'}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={{ backgroundColor: C.panel, borderRadius: R.lg, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: C.border }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, height: 40, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border }}>
                <View style={{ width: 72 }} />
                <Header label="Naam" k="naam" flex={1} />
                <Header label="Adres" k="adres" w={70} />
                <Header label="Protocol" k="protocol" w={86} />
                {showKind ? <Header label="Soort" w={100} /> : null}
                <View style={{ width: 120 }} />
              </View>
              {list.map((id, i) => {
                const l = locos[id];
                const m = metaAll[metaKey(id, mode)] ?? {};
                return (
                  <Pressable
                    key={id}
                    accessibilityRole="button"
                    accessibilityLabel={`${l.name} besturen`}
                    onPress={() => {
                      selectLoco(id);
                      router.navigate('/');
                    }}
                    style={({ pressed }) => [
                      { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 8, minHeight: 64 },
                      i < list.length - 1 ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border } : null,
                      pressed ? { backgroundColor: C.panel2 } : null,
                    ]}
                  >
                    <LocoPhoto uri={m.photo} style={{ width: 72, height: 44 }} rounded={8} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ color: C.text, fontSize: 16, fontWeight: F.semi, flexShrink: 1 }} numberOfLines={1}>
                          {l.name}
                        </Text>
                        {l.speed > 0 ? <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: C.green }} /> : null}
                      </View>
                      <Text style={{ color: C.muted, fontSize: 13 }} numberOfLines={1}>
                        {m.subtitle || ' '}
                      </Text>
                    </View>
                    <Text style={{ width: 70, color: C.textSoft, fontSize: 15, fontVariant: ['tabular-nums'] }}>{l.addr}</Text>
                    <Text style={{ width: 86, color: C.textSoft, fontSize: 15 }}>{l.protocol}</Text>
                    {showKind ? (
                      <Text style={{ width: 100, color: C.muted, fontSize: 14 }} numberOfLines={1}>
                        {m.kind ? KIND_SHORT[m.kind] ?? m.kind : '–'}
                      </Text>
                    ) : null}
                    <View style={{ width: 120, flexDirection: 'row', justifyContent: 'flex-end', gap: 2 }}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={m.favorite ? 'Favoriet uitzetten' : 'Als favoriet markeren'}
                        onPress={() => setMeta(metaKey(id, mode), { favorite: !m.favorite })}
                        hitSlop={4}
                        style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Icon name="star" size={19} color={m.favorite ? C.accent : C.muted} fill={m.favorite ? C.accent : undefined} />
                      </Pressable>
                      <Pressable accessibilityRole="button" accessibilityLabel={`${l.name} bewerken`} onPress={() => setEditing({ id })} hitSlop={4} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name="edit" size={19} color={C.muted} />
                      </Pressable>
                      <Pressable accessibilityRole="button" accessibilityLabel={`${l.name} verwijderen`} onPress={() => setRemoving(id)} hitSlop={4} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name="trash" size={19} color={C.muted} />
                      </Pressable>
                    </View>
                  </Pressable>
                );
              })}
              {list.length === 0 ? <Text style={{ color: C.muted, fontSize: 16, padding: 20 }}>Geen locs gevonden.</Text> : null}
            </View>
            <Text style={{ color: C.muted, fontSize: 13 }}>Tik op een loc om te rijden. Naam, adres en protocol worden op de ECoS opgeslagen; foto en extra gegevens op de iPad.</Text>
          </>
        ) : (
          <View style={{ backgroundColor: C.panel, borderRadius: R.lg, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: C.border }}>
            {accIds.map((id, i) => (
              <AccessoryRow key={id} id={id} last={i === accIds.length - 1} />
            ))}
            {accIds.length === 0 ? <Text style={{ color: C.muted, fontSize: 16, padding: 20 }}>Er staan geen wissels of rijwegen in de ECoS.</Text> : null}
          </View>
        )}
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
