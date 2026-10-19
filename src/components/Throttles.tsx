// Rijregelaars voor de duo- en multi-weergave.
import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { setSlot, setSpeed, stopLoco } from '../store/actions';
import { useEcos } from '../store/ecos';
import { kmh, useFunctions, useLoco, useLocoMeta, useSlots, vmaxOf } from '../store/hooks';
import { C, F, R, shadow } from '../theme';
import { LocoPicker } from './Dialogs';
import { Icon } from './Icon';
import { DirectionButtons, FunctionTile, LocoPhoto } from './Loco';
import { BrakePanel } from './Panels';
import { Slider } from './Slider';
import { SpeedKnob } from './SpeedKnob';

/** Venster met alle functies van een loc als tegels. */
export function FunctionsSheet({ id, visible, onClose }: { id: number; visible: boolean; onClose: () => void }) {
  const loco = useLoco(id);
  const meta = useLocoMeta(id);
  const funcs = useFunctions(loco, meta);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(2,8,24,0.7)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <View style={[{ width: '100%', maxWidth: 760, maxHeight: '85%', backgroundColor: C.panel, borderRadius: R.xl, padding: 20, gap: 14, borderWidth: 1, borderColor: C.border }, shadow]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: C.text, fontSize: 24, fontWeight: F.bold }}>Functies · {loco?.name}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Sluiten" onPress={onClose} hitSlop={10} style={{ padding: 8 }}>
              <Icon name="close" size={26} color={C.text} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {funcs.map((f) => (
              <View key={f.n} style={{ width: 128 }}>
                <FunctionTile id={id} f={f} />
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function EmptySlot({ label, onPress, big }: { label: string; onPress: () => void; big?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: loc kiezen`}
      onPress={onPress}
      style={({ pressed }) => [
        {
          flex: 1,
          borderRadius: R.lg,
          borderWidth: 2,
          borderStyle: 'dashed',
          borderColor: C.border,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          minHeight: big ? 600 : 200,
        },
        pressed ? { backgroundColor: C.panel } : null,
      ]}
    >
      <View style={{ width: big ? 80 : 56, height: big ? 80 : 56, borderRadius: 40, backgroundColor: C.panel2, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="plus" size={big ? 40 : 28} color={C.yellow} strokeWidth={2.6} />
      </View>
      <Text style={{ color: C.text, fontSize: big ? 20 : 16, fontWeight: F.semi }}>{label}</Text>
      <Text style={{ color: C.muted, fontSize: big ? 16 : 13 }}>Tik om een loc te kiezen</Text>
    </Pressable>
  );
}

/** Een volledige regelaar zoals in de duo-mockup. */
export function DuoThrottle({ slot }: { slot: number }) {
  const ids = useEcos((s) => s.locoIds);
  const slotIds = useSlotIds('duo');
  const id = slotIds[slot];
  const loco = useLoco(id);
  const meta = useLocoMeta(id);
  const funcs = useFunctions(loco, meta);
  const neutral = useEcos((s) => (id != null ? !!s.neutral[id] : false));
  const [picker, setPicker] = useState(false);
  const [sheet, setSheet] = useState(false);
  const label = `Loc ${slot + 1}`;

  const picked = (
    <LocoPicker
      visible={picker}
      allowClear={id != null}
      onClose={() => setPicker(false)}
      onPick={(p) => {
        setSlot('duo', slot, p);
        setPicker(false);
      }}
    />
  );

  if (id == null || !loco) {
    return (
      <View style={{ flex: 1 }}>
        <EmptySlot label={label} onPress={() => setPicker(true)} big />
        {ids.length ? picked : null}
      </View>
    );
  }

  const vmax = vmaxOf(loco, meta);
  const moving = loco.speed > 0;
  return (
    <View style={{ flex: 1, backgroundColor: C.panel, borderRadius: R.lg, borderWidth: 1, borderColor: C.borderSoft, overflow: 'hidden' }}>
      <View style={{ padding: 18, gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ backgroundColor: C.yellow, borderRadius: 20, paddingHorizontal: 18, paddingVertical: 6 }}>
            <Text style={{ color: C.ink, fontSize: 19, fontWeight: F.bold }}>{label}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: C.border, borderRadius: 20, paddingHorizontal: 14, height: 40 }}>
            <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: moving ? C.green : C.muted }} />
            <Text style={{ color: C.text, fontSize: 16, fontWeight: F.semi }}>{moving ? 'Rijdt' : neutral ? 'Neutraal' : 'Actief'}</Text>
          </View>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Andere loc kiezen" onPress={() => setPicker(true)}>
          <LocoPhoto uri={meta.photo} style={{ height: 230 }} />
        </Pressable>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.text, fontSize: 30, fontWeight: F.heavy }} numberOfLines={1}>
              {loco.name}
            </Text>
            <Text style={{ color: C.textSoft, fontSize: 17, minHeight: 22 }} numberOfLines={1}>
              {meta.subtitle || meta.kind || ''}
            </Text>
          </View>
          <View style={{ borderWidth: 1.5, borderColor: C.border, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 }}>
            <Text style={{ color: C.text, fontSize: 16, fontWeight: F.bold }}>
              {loco.protocol.startsWith('DCC') ? 'DCC' : loco.protocol} {loco.addr}
            </Text>
          </View>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: C.text, fontSize: 64, fontWeight: F.heavy, fontVariant: ['tabular-nums'] }}>{kmh(loco.speed, vmax)}</Text>
          <Text style={{ color: C.text, fontSize: 18, marginTop: -6 }}>km/h</Text>
          <SpeedKnob value={loco.speed} onChange={(v) => setSpeed(id, v)} size={250} maxLabel={vmax} variant="yellow" disabled={neutral} />
        </View>
        <BrakePanel id={id} compact />
      </View>
      <View style={{ borderTopWidth: 1, borderTopColor: C.borderSoft, padding: 18, gap: 14 }}>
        <DirectionButtons id={id} dir={loco.dir} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {funcs.slice(0, 4).map((f) => (
            <FunctionTile key={f.n} id={id} f={f} />
          ))}
        </View>
        {funcs.length > 4 ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setSheet(true)}
            style={({ pressed }) => [
              { height: 48, borderRadius: R.md, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
              pressed ? { backgroundColor: C.panel2 } : null,
            ]}
          >
            <Icon name="more" size={22} color={C.text} strokeWidth={3} />
            <Text style={{ color: C.text, fontSize: 16, fontWeight: F.semi }}>Alle functies (F0–F{funcs[funcs.length - 1].n})</Text>
          </Pressable>
        ) : null}
      </View>
      {picked}
      <FunctionsSheet id={id} visible={sheet} onClose={() => setSheet(false)} />
    </View>
  );
}

/** Compacte regelaar voor de multi-weergave (2 rijen van 5). */
export function CompactThrottle({ slot, dense }: { slot: number; dense?: boolean }) {
  const slotIds = useSlotIds('multi');
  const id = slotIds[slot];
  const loco = useLoco(id);
  const meta = useLocoMeta(id);
  const funcs = useFunctions(loco, meta);
  const neutral = useEcos((s) => (id != null ? !!s.neutral[id] : false));
  const [picker, setPicker] = useState(false);
  const [sheet, setSheet] = useState(false);

  const picked = (
    <LocoPicker
      visible={picker}
      allowClear={id != null}
      onClose={() => setPicker(false)}
      onPick={(p) => {
        setSlot('multi', slot, p);
        setPicker(false);
      }}
    />
  );

  if (id == null || !loco) {
    return (
      <View style={{ flex: 1 }}>
        <EmptySlot label={`Plek ${slot + 1}`} onPress={() => setPicker(true)} />
        {picked}
      </View>
    );
  }
  const vmax = vmaxOf(loco, meta);
  return (
    <View style={{ flex: 1, backgroundColor: C.panel, borderRadius: R.lg, borderWidth: 1, borderColor: loco.speed > 0 ? '#3B5DA8' : C.borderSoft, padding: 10, gap: 8 }}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${loco.name}, andere loc kiezen`} onPress={() => setPicker(true)} style={{ gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ backgroundColor: C.yellow, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 }}>
            <Text style={{ color: C.ink, fontSize: 13, fontWeight: F.heavy }}>{slot + 1}</Text>
          </View>
          <Text style={{ color: C.text, fontSize: 16, fontWeight: F.bold, flex: 1 }} numberOfLines={1}>
            {loco.name}
          </Text>
        </View>
        {!dense ? <LocoPhoto uri={meta.photo} style={{ height: 64 }} rounded={10} /> : null}
      </Pressable>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 4 }}>
        <Text style={{ color: C.text, fontSize: 34, fontWeight: F.heavy, fontVariant: ['tabular-nums'] }}>{kmh(loco.speed, vmax)}</Text>
        <Text style={{ color: C.textSoft, fontSize: 14 }}>km/h</Text>
      </View>
      <View style={{ flex: 1, minHeight: dense ? 80 : 110, flexDirection: 'row', alignItems: 'stretch', justifyContent: 'center', gap: 8 }}>
        <Slider vertical value={loco.speed} max={126} onChange={(v) => setSpeed(id, v)} thickness={22} label={`Snelheid ${loco.name}`} disabled={neutral} />
      </View>
      <DirectionButtons id={id} dir={loco.dir} compact />
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {funcs.slice(0, 3).map((f) => (
          <FunctionTile key={f.n} id={id} f={f} size="sm" />
        ))}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Alle functies"
          onPress={() => setSheet(true)}
          style={({ pressed }) => [
            { flex: 1, minHeight: 48, borderRadius: 10, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
            pressed ? { backgroundColor: C.panel2 } : null,
          ]}
        >
          <Icon name="more" size={20} color={C.text} strokeWidth={3} />
        </Pressable>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${loco.name} stoppen`}
        onPress={() => stopLoco(id)}
        style={({ pressed }) => [
          { height: 44, borderRadius: 10, backgroundColor: pressed ? C.redDark : C.red, alignItems: 'center', justifyContent: 'center' },
        ]}
      >
        <Text style={{ color: '#fff', fontSize: 15, fontWeight: F.heavy }}>STOP</Text>
      </Pressable>
      {picked}
      <FunctionsSheet id={id} visible={sheet} onClose={() => setSheet(false)} />
    </View>
  );
}

function useSlotIds(kind: 'duo' | 'multi') {
  // een verwijderde loc verschijnt meteen als lege plek
  const locos = useEcos((s) => s.locos);
  return useSlots(kind).map((id) => (id != null && locos[id] ? id : null));
}
