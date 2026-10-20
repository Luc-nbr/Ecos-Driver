import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { metaKey } from '../store/actions';
import { useEcos } from '../store/ecos';
import { useMode, useRecentLocos } from '../store/hooks';
import { useSettings } from '../store/settings';
import { C, F, R, shadow } from '../theme';
import { Icon } from './Icon';
import { LocoPhoto } from './Loco';
import { Button, Segmented } from './ui';

export function Sheet({ visible, onClose, children, maxWidth = 640 }: { visible: boolean; onClose: () => void; children: React.ReactNode; maxWidth?: number }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable accessibilityLabel="Sluiten" onPress={onClose} style={{ flex: 1, backgroundColor: C.backdrop, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Pressable
          onPress={() => {}}
          style={[
            { width: '100%', maxWidth, maxHeight: '88%', backgroundColor: C.panel, borderRadius: R.xl, padding: 20, gap: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border },
            shadow,
          ]}
        >
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmText = 'Bevestigen',
  danger,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Sheet visible={visible} onClose={onCancel} maxWidth={420}>
      <Text style={{ color: C.text, fontSize: 20, fontWeight: F.bold, textAlign: 'center' }}>{title}</Text>
      <Text style={{ color: C.textSoft, fontSize: 15, lineHeight: 21, textAlign: 'center' }}>{message}</Text>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
        <Button title="Annuleren" onPress={onCancel} style={{ flex: 1 }} />
        <Button title={confirmText} kind={danger ? 'danger' : 'primary'} onPress={onConfirm} style={{ flex: 1 }} />
      </View>
    </Sheet>
  );
}

type Filter = 'alle' | 'recent' | 'fav';

/** Kies een loc uit de ECoS: zoeken, recent, favorieten. */
export function LocoPicker({
  visible,
  onPick,
  onClose,
  allowClear,
  title = 'Wissel loc',
}: {
  visible: boolean;
  onPick: (id: number | null) => void;
  onClose: () => void;
  allowClear?: boolean;
  title?: string;
}) {
  const ids = useEcos((s) => s.locoIds);
  const locos = useEcos((s) => s.locos);
  const meta = useSettings((s) => s.meta);
  const recent = useRecentLocos();
  const mode = useMode();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('alle');

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    const base = filter === 'recent' ? recent : filter === 'fav' ? ids.filter((id) => meta[metaKey(id, mode)]?.favorite) : ids;
    return base.filter((id) => {
      const l = locos[id];
      if (!l) return false;
      const m = meta[metaKey(id, mode)];
      return !t || l.name.toLowerCase().includes(t) || String(l.addr).includes(t) || (m?.subtitle ?? '').toLowerCase().includes(t);
    });
  }, [ids, locos, meta, mode, q, filter, recent]);

  return (
    <Sheet visible={visible} onClose={onClose} maxWidth={760}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ color: C.text, fontSize: 22, fontWeight: F.bold }}>{title}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Sluiten" onPress={onClose} hitSlop={10} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: C.panel2, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="close" size={16} color={C.muted} strokeWidth={2.6} />
        </Pressable>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.panel2, borderRadius: 12, paddingHorizontal: 12 }}>
        <Icon name="search" size={18} color={C.muted} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Zoeken op naam of adres"
          placeholderTextColor={C.muted}
          style={{ flex: 1, color: C.text, fontSize: 17, height: 44 }}
          accessibilityLabel="Zoek loc"
        />
      </View>
      <Segmented
        label="Filter"
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'alle', label: 'Alle' },
          { value: 'recent', label: 'Recent' },
          { value: 'fav', label: 'Favorieten' },
        ]}
      />
      <ScrollView contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingBottom: 4 }}>
        {list.map((item) => {
          const l = locos[item];
          const m = meta[metaKey(item, mode)];
          return (
            <Pressable
              key={item}
              accessibilityRole="button"
              accessibilityLabel={`Kies ${l.name}`}
              onPress={() => onPick(item)}
              style={({ pressed }) => [
                { width: 162, flexGrow: 1, maxWidth: 230, borderRadius: 16, backgroundColor: C.panel2, overflow: 'hidden' },
                pressed ? { opacity: 0.75 } : null,
              ]}
            >
              <LocoPhoto ecosId={item} uri={m?.photo} style={{ height: 92 }} rounded={0} />
              <View style={{ padding: 10 }}>
                <Text style={{ color: C.text, fontSize: 15, fontWeight: F.semi }} numberOfLines={1}>
                  {l.name}
                </Text>
                <Text style={{ color: C.muted, fontSize: 13 }} numberOfLines={1}>
                  {l.addr} · {l.protocol}
                </Text>
              </View>
              {m?.favorite ? (
                <View style={{ position: 'absolute', top: 8, right: 8 }}>
                  <Icon name="star" size={16} color={C.accent} fill={C.accent} />
                </View>
              ) : null}
            </Pressable>
          );
        })}
        {list.length === 0 ? (
          <Text style={{ color: C.muted, fontSize: 16, padding: 20, textAlign: 'center', width: '100%' }}>
            {filter === 'recent' ? 'Nog geen recent bestuurde locs' : filter === 'fav' ? 'Nog geen favorieten (ster in de Bibliotheek)' : 'Geen locs gevonden'}
          </Text>
        ) : null}
      </ScrollView>
      {allowClear ? <Button title="Plek leegmaken" icon="close" kind="ghost" onPress={() => onPick(null)} small /> : null}
    </Sheet>
  );
}
