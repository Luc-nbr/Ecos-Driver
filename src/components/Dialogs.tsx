import React, { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { useEcos } from '../store/ecos';
import { useMode } from '../store/hooks';
import { useSettings } from '../store/settings';
import { metaKey } from '../store/actions';
import { C, F, R, shadow } from '../theme';
import { Icon } from './Icon';
import { LocoPhoto } from './Loco';
import { Button } from './ui';

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
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={{ flex: 1, backgroundColor: 'rgba(2,8,24,0.7)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <View style={[{ width: '100%', maxWidth: 480, backgroundColor: C.panel, borderRadius: R.xl, padding: 24, gap: 14, borderWidth: 1, borderColor: C.border }, shadow]}>
          <Text style={{ color: C.text, fontSize: 22, fontWeight: F.bold }}>{title}</Text>
          <Text style={{ color: C.textSoft, fontSize: 16, lineHeight: 22 }}>{message}</Text>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
            <Button title="Annuleren" onPress={onCancel} style={{ flex: 1 }} />
            <Button title={confirmText} kind={danger ? 'danger' : 'primary'} onPress={onConfirm} style={{ flex: 1 }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

/** Kies een loc uit de ECoS-lijst. */
export function LocoPicker({
  visible,
  onPick,
  onClose,
  allowClear,
}: {
  visible: boolean;
  onPick: (id: number | null) => void;
  onClose: () => void;
  allowClear?: boolean;
}) {
  const ids = useEcos((s) => s.locoIds);
  const locos = useEcos((s) => s.locos);
  const meta = useSettings((s) => s.meta);
  const mode = useMode();
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return ids.filter((id) => {
      const l = locos[id];
      return !t || l.name.toLowerCase().includes(t) || String(l.addr).includes(t);
    });
  }, [ids, locos, q]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(2,8,24,0.7)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <View style={[{ width: '100%', maxWidth: 640, maxHeight: '85%', backgroundColor: C.panel, borderRadius: R.xl, padding: 20, gap: 14, borderWidth: 1, borderColor: C.border }, shadow]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: C.text, fontSize: 24, fontWeight: F.bold }}>Kies een loc</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Sluiten" onPress={onClose} hitSlop={10} style={{ padding: 8 }}>
              <Icon name="close" size={26} color={C.text} />
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.bgDeep, borderRadius: R.md, paddingHorizontal: 14, borderWidth: 1, borderColor: C.border }}>
            <Icon name="search" size={20} color={C.muted} />
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="Zoek op naam of adres"
              placeholderTextColor={C.muted}
              style={{ flex: 1, color: C.text, fontSize: 17, height: 50 }}
              accessibilityLabel="Zoek loc"
            />
          </View>
          {allowClear ? <Button title="Plek leegmaken" icon="close" onPress={() => onPick(null)} small /> : null}
          <FlatList
            data={list}
            keyExtractor={(id) => String(id)}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            ListEmptyComponent={<Text style={{ color: C.muted, fontSize: 16, padding: 20, textAlign: 'center' }}>Geen locs gevonden</Text>}
            renderItem={({ item }) => {
              const l = locos[item];
              const m = meta[metaKey(item, mode)];
              return (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => onPick(item)}
                  style={({ pressed }) => [
                    { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 10, borderRadius: R.md, backgroundColor: C.panel2, borderWidth: 1, borderColor: C.borderSoft },
                    pressed ? { backgroundColor: C.panelHi } : null,
                  ]}
                >
                  <LocoPhoto uri={m?.photo} style={{ width: 96, height: 60 }} rounded={10} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: C.text, fontSize: 18, fontWeight: F.bold }}>{l.name}</Text>
                    <Text style={{ color: C.muted, fontSize: 15 }}>
                      Adres {l.addr} · {l.protocol}
                      {m?.subtitle ? ` · ${m.subtitle}` : ''}
                    </Text>
                  </View>
                  <Icon name="chevronRight" size={22} color={C.muted} />
                </Pressable>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
}
