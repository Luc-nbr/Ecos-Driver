// Rijregelaars voor de duo- en multi-weergave.
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { setSlot, setSpeed } from '../store/actions';
import { useEcos } from '../store/ecos';
import { useFunctions, useLoco, useLocoMeta, useSlots } from '../store/hooks';
import { C, F, R, themed } from '../theme';
import { CabButtons, CabControl, cabSubtitle, FunctionList, fromStep, protocolSteps, SpeedGauge, StepBar, ThumbWheel, toStep } from './Cab';
import { LocoPicker, Sheet } from './Dialogs';
import { Icon } from './Icon';
import { FunctionTile, LocoPhoto, LocoSwitchButton } from './Loco';

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
      <ScrollView>
        {id != null ? <FunctionList id={id} funcs={funcs} /> : null}
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
  const [picker, setPicker] = useState(false);
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

  return (
    <View style={{ flex: 1 }}>
      <CabControl id={id} loco={loco} meta={meta} funcs={funcs} onSwitch={() => setPicker(true)} slotLabel={label} maxGauge={250} />
      {picked}
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
  const [w, setW] = useState(0);
  const [rowH, setRowH] = useState(0);

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
  const steps = protocolSteps(loco.protocol);
  const step = toStep(loco.speed, steps);
  const inner = Math.max(0, w - 20);
  const wheelW = 40;
  const gauge = Math.max(96, Math.min(dense ? 150 : 170, inner - wheelW - 8));
  const btnW = Math.floor((inner - 12) / 3);
  return (
    <View style={[card(), { flex: 1, borderRadius: R.lg, padding: 10, gap: 8 }, loco.speed > 0 ? { borderColor: C.blue } : null]} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text style={{ color: C.muted, fontSize: 12, fontWeight: F.bold, width: 16 }}>{slot + 1}</Text>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ color: C.text, fontSize: 15, fontWeight: F.semi }} numberOfLines={1}>
            {loco.name}
          </Text>
          <Text style={{ color: C.muted, fontSize: 11 }} numberOfLines={1}>
            {cabSubtitle(loco, meta)}
          </Text>
        </View>
        <LocoSwitchButton compact onPress={() => setPicker(true)} label={`Plek ${slot + 1}: wissel loc`} />
      </View>
      {!dense ? <LocoPhoto ecosId={id} uri={meta.photo} style={{ height: 56 }} rounded={10} /> : null}
      <StepBar id={id} loco={loco} steps={steps} height={18} />
      {w > 0 ? (
        <>
          <View onLayout={(e) => setRowH(e.nativeEvent.layout.height)} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <SpeedGauge step={step} steps={steps} size={gauge} />
            {/* het duimwiel mag de hele hoogte gebruiken: langer wiel = fijner gas geven */}
            <ThumbWheel step={step} steps={steps} onChange={(s) => setSpeed(id, fromStep(s, steps))} width={wheelW} height={Math.round(Math.max(gauge, Math.min(300, rowH - 4)))} disabled={neutral} label={`Snelheid ${loco.name}`} />
          </View>
          <CabButtons id={id} loco={loco} steps={steps} layout="compact" w={btnW} h={40} />
        </>
      ) : null}
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
