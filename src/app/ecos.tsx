// ECoS-scherm: live via VNC (het echte scherm van de ECoS), of een nagebouwd
// bedienpaneel met twee draaiwielen, STOP/GO en een aanraakscherm voor locs en wissels.
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { NotConnected } from '../components/Chrome';
import { LocoPicker } from '../components/Dialogs';
import { Icon } from '../components/Icon';
import { LocoPhoto } from '../components/Loco';
import { JogWheel } from '../components/JogWheel';
import { emergencyStop, setDirection, setFunction, setPower, setSlot, setSpeed, switchAccessory, toggleFunction } from '../store/actions';
import { useEcos } from '../store/ecos';
import { FunctionView, kmh, useFunctions, useLoco, useLocoMeta, useSlots, vmaxOf } from '../store/hooks';
import { C, F } from '../theme';
import { Segmented } from '../components/ui';
import { VncView } from '../components/VncView';
import { useSettings } from '../store/settings';

const S = {
  chassis: '#1C1C1E',
  chassisEdge: '#2C2C2E',
  screenBg: '#E9EEF4',
  screenHead: '#1D3F73',
  screenText: '#13233F',
  screenMuted: '#4E5D75',
  tile: '#FFFFFF',
  tileOn: '#FFC917',
  line: '#C5CFDB',
};

function Clock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(t);
  }, []);
  return <Text style={{ color: '#fff', fontSize: 15, fontWeight: F.semi }}>{now.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}</Text>;
}

function ScreenFunction({ id, f }: { id: number; f: FunctionView }) {
  const handlers = f.moment
    ? { onPressIn: () => setFunction(id, f.n, true), onPressOut: () => setFunction(id, f.n, false) }
    : { onPress: () => toggleFunction(id, f.n) };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: f.on }}
      accessibilityLabel={`F${f.n} ${f.label}`}
      {...handlers}
      style={({ pressed }) => [
        {
          width: '22.5%',
          height: 54,
          borderRadius: 8,
          backgroundColor: f.on ? S.tileOn : S.tile,
          borderWidth: 1,
          borderColor: f.on ? '#C99A00' : S.line,
          alignItems: 'center',
          justifyContent: 'center',
        },
        pressed ? { opacity: 0.7 } : null,
      ]}
    >
      <Icon name={f.icon} size={22} color={S.screenText} />
      <Text style={{ color: S.screenText, fontSize: 11, fontWeight: F.bold }}>F{f.n}</Text>
    </Pressable>
  );
}

function ScreenLoco({ id, side, onPick }: { id: number | null; side: 'L' | 'R'; onPick: () => void }) {
  const loco = useLoco(id);
  const meta = useLocoMeta(id);
  const funcs = useFunctions(loco, meta);
  const [page, setPage] = useState(0);
  if (id == null || !loco) {
    return (
      <Pressable accessibilityRole="button" onPress={onPick} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <Icon name="plus" size={36} color={S.screenMuted} />
        <Text style={{ color: S.screenMuted, fontSize: 15, fontWeight: F.semi }}>Loc kiezen ({side === 'L' ? 'linker' : 'rechter'} knop)</Text>
      </Pressable>
    );
  }
  const vmax = vmaxOf(loco, meta);
  const pages = Math.max(1, Math.ceil(funcs.length / 8));
  const p = Math.min(page, pages - 1);
  const shown = funcs.slice(p * 8, p * 8 + 8);
  const pct = loco.speed / 126;
  return (
    <View style={{ flex: 1, padding: 10, gap: 8 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Andere loc kiezen" onPress={onPick} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ backgroundColor: S.screenHead, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
          <Text style={{ color: '#fff', fontSize: 12, fontWeight: F.bold }}>{side}</Text>
        </View>
        <Text style={{ color: S.screenText, fontSize: 17, fontWeight: F.bold, flex: 1 }} numberOfLines={1}>
          {loco.name}
        </Text>
        <Text style={{ color: S.screenMuted, fontSize: 13 }}>{loco.addr}</Text>
      </Pressable>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <LocoPhoto uri={meta.photo} style={{ width: 120, height: 62 }} rounded={6} />
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
            <Text style={{ color: S.screenText, fontSize: 30, fontWeight: F.heavy, fontVariant: ['tabular-nums'] }}>{kmh(loco.speed, vmax)}</Text>
            <Text style={{ color: S.screenMuted, fontSize: 13 }}>km/h</Text>
            <View style={{ flex: 1 }} />
            <Icon name={loco.dir === 0 ? 'arrowUp' : 'arrowDown'} size={22} color={S.screenHead} strokeWidth={2.8} />
          </View>
          <View style={{ flexDirection: 'row', gap: 2, height: 12 }}>
            {Array.from({ length: 20 }, (_, i) => (
              <View key={i} style={{ flex: 1, borderRadius: 2, backgroundColor: i < Math.round(pct * 20) ? (i > 15 ? '#E5322D' : i > 10 ? '#F2A900' : '#2E9E5B') : '#C9D3E0' }} />
            ))}
          </View>
        </View>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'space-between' }}>
        {shown.map((f) => (
          <ScreenFunction key={f.n} id={id} f={f} />
        ))}
      </View>
      {pages > 1 ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Vorige functies" onPress={() => setPage(Math.max(0, p - 1))} hitSlop={10}>
            <Icon name="chevronLeft" size={26} color={p === 0 ? S.line : S.screenHead} strokeWidth={3} />
          </Pressable>
          <Text style={{ color: S.screenMuted, fontSize: 13 }}>
            {p + 1} / {pages}
          </Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Volgende functies" onPress={() => setPage(Math.min(pages - 1, p + 1))} hitSlop={10}>
            <Icon name="chevronRight" size={26} color={p === pages - 1 ? S.line : S.screenHead} strokeWidth={3} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function ScreenSwitchboard() {
  const ids = useEcos((s) => s.accessoryIds);
  const acc = useEcos((s) => s.accessories);
  return (
    <ScrollView contentContainerStyle={{ padding: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {ids.length === 0 ? <Text style={{ color: S.screenMuted, fontSize: 15, padding: 10 }}>Geen wissels in de ECoS</Text> : null}
      {ids.map((id) => {
        const a = acc[id];
        const route = a.type === 'ROUTE';
        const on = !route && a.state !== 0;
        return (
          <Pressable
            key={id}
            accessibilityRole="button"
            accessibilityLabel={`${a.name} schakelen`}
            onPress={() => switchAccessory(id)}
            style={({ pressed }) => [
              { width: 118, height: 76, borderRadius: 8, backgroundColor: on ? S.tileOn : S.tile, borderWidth: 1, borderColor: S.line, padding: 8, justifyContent: 'space-between' },
              pressed ? { opacity: 0.7 } : null,
            ]}
          >
            <Icon name={route ? 'route' : 'turnout'} size={24} color={S.screenText} />
            <Text style={{ color: S.screenText, fontSize: 12, fontWeight: F.bold }} numberOfLines={2}>
              {a.name}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function HardKnob({ id, size, onPick, side }: { id: number | null; size: number; onPick: () => void; side: 'L' | 'R' }) {
  const loco = useLoco(id);
  const neutral = useEcos((s) => (id != null ? !!s.neutral[id] : false));
  return (
    <View style={{ alignItems: 'center', gap: 10 }}>
      <JogWheel value={loco?.speed ?? 0} onChange={(v) => id != null && setSpeed(id, v)} size={size} showScale={false} disabled={id == null || neutral} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Rijrichting omkeren"
        disabled={id == null}
        onPress={() => loco && id != null && setDirection(id, loco.dir === 0 ? 1 : 0)}
        style={({ pressed }) => [
          { flexDirection: 'row', alignItems: 'center', gap: 8, height: 48, paddingHorizontal: 16, borderRadius: 24, backgroundColor: '#2C2C2E', borderWidth: 0 },
          pressed ? { backgroundColor: '#3A3A3C' } : null,
        ]}
      >
        <Icon name="arrowUp" size={18} color={loco?.dir === 0 ? C.green : '#8A929C'} strokeWidth={3} />
        <Icon name="arrowDown" size={18} color={loco?.dir === 1 ? C.accent : '#8A929C'} strokeWidth={3} />
        <Text style={{ color: '#E6E9ED', fontSize: 14, fontWeight: F.semi }}>Richting</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${side === 'L' ? 'Linker' : 'Rechter'} loc wisselen`}
        onPress={onPick}
        style={({ pressed }) => [
          { flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, paddingHorizontal: 16, borderRadius: 22, backgroundColor: C.accentSoft },
          pressed ? { opacity: 0.7 } : null,
        ]}
      >
        <Icon name="swap" size={16} color={C.accent} strokeWidth={2.4} />
        <Text style={{ color: C.accent, fontSize: 14, fontWeight: F.semi }}>Wissel loc</Text>
      </Pressable>
    </View>
  );
}

function HwButton({ label, color, onPress, active }: { label: string; color: string; onPress: () => void; active: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        {
          width: 110,
          height: 54,
          borderRadius: 10,
          backgroundColor: color,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 3,
          borderColor: active ? '#FFFFFF' : 'rgba(0,0,0,0.25)',
        },
        pressed ? { transform: [{ scale: 0.96 }] } : null,
      ]}
    >
      <Text style={{ color: '#fff', fontSize: 20, fontWeight: F.heavy, letterSpacing: 1 }}>{label}</Text>
    </Pressable>
  );
}

export default function EcosCloneScreen() {
  const conn = useEcos((s) => s.conn);
  const status = useEcos((s) => s.status);
  const info = useEcos((s) => s.info);
  const slots = useSlots('duo');
  const locos = useEcos((s) => s.locos);
  const [tab, setTab] = useState<'locs' | 'wissels'>('locs');
  const [picker, setPicker] = useState<number | null>(null);
  const { width, height } = useWindowDimensions();
  const view = useSettings((x) => x.ecosView) ?? 'vnc';
  const setView = (v: 'vnc' | 'replica') => useSettings.getState().set({ ecosView: v });
  if (conn !== 'connected') return <NotConnected />;
  const left = slots[0] != null && locos[slots[0]] ? slots[0] : null;
  const right = slots[1] != null && locos[slots[1]] ? slots[1] : null;
  const knob = width > 1100 ? 190 : 150;
  const go = status === 'GO';

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24, gap: 16 }}>
      <View style={{ maxWidth: 520 }}>
        <Segmented
          label="Weergave ECoS-scherm"
          value={view}
          onChange={(v) => setView(v)}
          options={[
            { value: 'vnc', label: 'Live scherm (VNC)', icon: 'device' },
            { value: 'replica', label: 'Nagebouwd', icon: 'grid' },
          ]}
        />
      </View>
      {view === 'vnc' ? (
        <VncView maxHeight={Math.max(260, height - 300)} />
      ) : (
        <>
      <View style={{ backgroundColor: S.chassis, borderRadius: 34, borderWidth: 6, borderColor: S.chassisEdge, padding: 18, gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <HwButton label="STOP" color="#C8231F" active={!go} onPress={emergencyStop} />
          <Text style={{ color: '#AEB5BE', fontSize: 16, fontWeight: F.bold, letterSpacing: 3 }}>ESU {info?.model ?? 'ECoS'}</Text>
          <HwButton label="GO" color="#21A355" active={go} onPress={() => setPower(true)} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <HardKnob id={left} size={knob} side="L" onPick={() => setPicker(0)} />
          <View style={{ flex: 1, backgroundColor: '#0B0C0E', borderRadius: 14, padding: 10 }}>
            <View style={{ backgroundColor: S.screenBg, borderRadius: 6, overflow: 'hidden', minHeight: 360 }}>
              <View style={{ backgroundColor: S.screenHead, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 34, gap: 10 }}>
                <View style={{ backgroundColor: go ? '#21A355' : '#C8231F', paddingHorizontal: 8, borderRadius: 4 }}>
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: F.heavy }}>{go ? 'GO' : 'STOP'}</Text>
                </View>
                <Text style={{ color: '#fff', fontSize: 14, flex: 1 }} numberOfLines={1}>
                  {tab === 'locs' ? 'Locbesturing' : 'Schakelpaneel'}
                </Text>
                <Clock />
              </View>
              {tab === 'locs' ? (
                <View style={{ flexDirection: 'row', flex: 1 }}>
                  <ScreenLoco id={left} side="L" onPick={() => setPicker(0)} />
                  <View style={{ width: 1, backgroundColor: S.line }} />
                  <ScreenLoco id={right} side="R" onPick={() => setPicker(1)} />
                </View>
              ) : (
                <View style={{ flex: 1, maxHeight: 330 }}>
                  <ScreenSwitchboard />
                </View>
              )}
              <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: S.line, backgroundColor: '#DCE3EC' }}>
                {(
                  [
                    ['locs', 'train', 'Locs'],
                    ['wissels', 'turnout', 'Wissels'],
                  ] as const
                ).map(([key, icon, label]) => (
                  <Pressable
                    key={key}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: tab === key }}
                    onPress={() => setTab(key)}
                    style={{ flex: 1, height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: tab === key ? '#FFFFFF' : 'transparent' }}
                  >
                    <Icon name={icon} size={20} color={S.screenHead} />
                    <Text style={{ color: S.screenHead, fontSize: 15, fontWeight: F.bold }}>{label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
          <HardKnob id={right} size={knob} side="R" onPick={() => setPicker(1)} />
        </View>
      </View>
      <Text style={{ color: C.muted, fontSize: 15, lineHeight: 21 }}>
        Dit is een nagebouwd ECoS-bedienpaneel met live gegevens uit je centrale. Draai aan de knoppen om te rijden en tik op het scherm voor functies en wissels.
        De linker en rechter loc zijn dezelfde als in Duo. Het echte ECoS-scherm zie je bij Live scherm (VNC).
      </Text>
      <LocoPicker
        visible={picker !== null}
        allowClear
        onClose={() => setPicker(null)}
        onPick={(p) => {
          if (picker !== null) setSlot('duo', picker, p);
          setPicker(null);
        }}
      />
        </>
      )}
    </ScrollView>
  );
}
