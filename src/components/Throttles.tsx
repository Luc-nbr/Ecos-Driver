// Rijregelaars voor de duo- en multi-weergave.
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { setSlot, setSpeed, stopLoco } from '../store/actions';
import { useEcos } from '../store/ecos';
import { kmh, useFunctions, useLoco, useLocoMeta, useSlots, vmaxOf } from '../store/hooks';
import { C, F, R, themed } from '../theme';
import { LocoPicker, Sheet } from './Dialogs';
import { Icon } from './Icon';
import { JogWheel } from './JogWheel';
import { DirectionButtons, FunctionTile, LocoPhoto, LocoSwitchButton } from './Loco';
import { BrakePanel } from './Panels';

/** Venster met alle functies van een loc als tegels. */
export function FunctionsSheet({ id, visible, onClose }: { id: number; visible: boolean; onClose: () => void }) {
  const loco = useLoco(id);
  const meta = useLocoMeta(id);
  const funcs = useFunctions(loco, meta);
  return (
    <Sheet visible={visible} onClose={onClose} maxWidth={760}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ color: C.text, fontSize: 22, fontWeight: F.bold }}>Functies · {loco?.name}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Sluiten" onPress={onClose} hitSlop={10} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: C.panel2, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="close" size={16} color={C.muted} strokeWidth={2.6} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {funcs.map((f) => (
          <View key={f.n} style={{ width: 128 }}>
            <FunctionTile id={id} f={f} />
          </View>
        ))}
      </ScrollView>
    </Sheet>
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
          borderRadius: R.xl,
          borderWidth: 1.5,
          borderStyle: 'dashed',
          borderColor: C.border,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          minHeight: big ? 560 : 200,
        },
        pressed ? { backgroundColor: C.panel } : null,
      ]}
    >
      <View style={{ width: big ? 64 : 48, height: big ? 64 : 48, borderRadius: 32, backgroundColor: C.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="plus" size={big ? 30 : 24} color={C.accent} strokeWidth={2.4} />
      </View>
      <Text style={{ color: C.text, fontSize: big ? 18 : 15, fontWeight: F.semi }}>{label}</Text>
      <Text style={{ color: C.muted, fontSize: big ? 15 : 12 }}>Loc kiezen</Text>
    </Pressable>
  );
}

const card = themed(() => ({ backgroundColor: C.panel, borderRadius: R.xl, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border }) as const);

/** Volledige regelaar voor de duo-weergave. */
export function DuoThrottle({ slot }: { slot: number }) {
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
      title={`${label} wisselen`}
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
        {picked}
      </View>
    );
  }

  const vmax = vmaxOf(loco, meta);
  return (
    <View style={[card(), { flex: 1, padding: 18, gap: 16 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <LocoPhoto uri={meta.photo} style={{ width: 96, height: 58 }} rounded={12} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ color: C.muted, fontSize: 13, fontWeight: F.semi }}>{label.toUpperCase()}</Text>
          <Text style={{ color: C.text, fontSize: 21, fontWeight: F.bold }} numberOfLines={1}>
            {loco.name}
          </Text>
          <Text style={{ color: C.muted, fontSize: 14 }} numberOfLines={1}>
            {[`${loco.protocol.startsWith('DCC') ? 'DCC' : loco.protocol} ${loco.addr}`, meta.subtitle].filter(Boolean).join(' · ')}
          </Text>
        </View>
        <LocoSwitchButton onPress={() => setPicker(true)} />
      </View>

      <View style={{ alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
          <Text style={{ color: C.text, fontSize: 56, fontWeight: F.bold, fontVariant: ['tabular-nums'] }}>{kmh(loco.speed, vmax)}</Text>
          <Text style={{ color: C.muted, fontSize: 18, fontWeight: F.medium }}>km/h</Text>
        </View>
        <JogWheel value={loco.speed} onChange={(v) => setSpeed(id, v)} size={250} maxLabel={vmax} disabled={neutral} label={`Snelheid ${loco.name}`} />
      </View>

      <DirectionButtons id={id} dir={loco.dir} />
      <BrakePanel id={id} />

      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {funcs.slice(0, 4).map((f) => (
            <FunctionTile key={f.n} id={id} f={f} />
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {funcs.slice(4, 8).map((f) => (
            <FunctionTile key={f.n} id={id} f={f} />
          ))}
        </View>
        {funcs.length > 8 ? (
          <Pressable accessibilityRole="button" onPress={() => setSheet(true)} style={({ pressed }) => [{ height: 44, alignItems: 'center', justifyContent: 'center' }, pressed ? { opacity: 0.6 } : null]}>
            <Text style={{ color: C.accent, fontSize: 16, fontWeight: F.semi }}>Alle functies (F0–F{funcs[funcs.length - 1].n})</Text>
          </Pressable>
        ) : null}
      </View>
      {picked}
      <FunctionsSheet id={id} visible={sheet} onClose={() => setSheet(false)} />
    </View>
  );
}

/** Compacte regelaar voor de multi-weergave (2 rijen van 5). */
export function CompactThrottle({ slot, dense, wheelSize = 160 }: { slot: number; dense?: boolean; wheelSize?: number }) {
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
      title={`Plek ${slot + 1}: loc wisselen`}
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
    <View style={[card(), { flex: 1, borderRadius: R.lg, padding: 10, gap: 8 }, loco.speed > 0 ? { borderColor: C.accent } : null]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text style={{ color: C.muted, fontSize: 12, fontWeight: F.bold, width: 16 }}>{slot + 1}</Text>
        <Text style={{ color: C.text, fontSize: 15, fontWeight: F.semi, flex: 1 }} numberOfLines={1}>
          {loco.name}
        </Text>
        <LocoSwitchButton compact onPress={() => setPicker(true)} label={`Plek ${slot + 1}: wissel loc`} />
      </View>
      {!dense ? <LocoPhoto uri={meta.photo} style={{ height: 56 }} rounded={10} /> : null}
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 4 }}>
        <Text style={{ color: C.text, fontSize: 30, fontWeight: F.bold, fontVariant: ['tabular-nums'] }}>{kmh(loco.speed, vmax)}</Text>
        <Text style={{ color: C.muted, fontSize: 13 }}>km/h</Text>
      </View>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <JogWheel value={loco.speed} onChange={(v) => setSpeed(id, v)} size={wheelSize} showScale={false} label={`Snelheid ${loco.name}`} disabled={neutral} />
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
          style={({ pressed }) => [{ flex: 1, minHeight: 48, borderRadius: 12, backgroundColor: C.panel2, alignItems: 'center', justifyContent: 'center' }, pressed ? { opacity: 0.7 } : null]}
        >
          <Icon name="more" size={20} color={C.text} strokeWidth={3} />
        </Pressable>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${loco.name} stoppen`}
        onPress={() => stopLoco(id)}
        style={({ pressed }) => [{ height: 40, borderRadius: 12, backgroundColor: C.redSoft, alignItems: 'center', justifyContent: 'center' }, pressed ? { opacity: 0.7 } : null]}
      >
        <Text style={{ color: C.red, fontSize: 15, fontWeight: F.bold }}>Stop</Text>
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
