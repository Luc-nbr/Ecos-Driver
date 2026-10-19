// Panelen die op meerdere schermen terugkomen: rem, noodstop, live status, rijwegen.
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { emergencyStop, setBrake, setPower, switchAccessory } from '../store/actions';
import { useEcos } from '../store/ecos';
import { C, F, R, shadow } from '../theme';
import { Icon } from './Icon';
import { Slider } from './Slider';
import { arcPath } from './JogWheel';
import { Panel, SectionTitle } from './ui';

export function BrakePanel({ id, compact }: { id: number; compact?: boolean }) {
  const brake = useEcos((s) => s.brake[id] ?? 0);
  if (compact) {
    return (
      <View style={{ gap: 2 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ color: C.text, fontSize: 18, fontWeight: F.semi }}>Rem</Text>
          <Text style={{ color: C.text, fontSize: 18, fontWeight: F.semi }}>{brake === 0 ? 'Uit' : `${brake}%`}</Text>
        </View>
        <Slider value={brake} max={100} onChange={(v) => setBrake(id, v)} gradient={['#E5322D', '#F07A76']} label="Rem" />
      </View>
    );
  }
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
      <View style={{ width: 60, height: 60, borderRadius: 14, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', backgroundColor: C.panel2 }}>
        <Icon name="brake" size={32} color={C.text} />
      </View>
      <Text style={{ color: C.text, fontSize: 20, fontWeight: F.semi }}>Rem</Text>
      <View style={{ flex: 1 }}>
        <Slider value={brake} max={100} onChange={(v) => setBrake(id, v)} gradient={['#E5322D', '#F07A76']} label="Rem" />
      </View>
      <Text style={{ color: C.text, fontSize: 20, fontWeight: F.bold, width: 56, textAlign: 'right' }}>
        {brake === 0 ? 'Uit' : `${brake}%`}
      </Text>
    </View>
  );
}

export function EmergencyStopButton() {
  const stopped = useEcos((s) => s.status === 'STOP');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={stopped ? 'Spanning weer aanzetten' : 'Noodstop'}
      onPress={() => (stopped ? setPower(true) : emergencyStop())}
      style={({ pressed }) => [{ alignItems: 'center', gap: 10 }, pressed ? { transform: [{ scale: 0.97 }] } : null]}
    >
      <View
        style={[
          {
            width: 108,
            height: 108,
            borderRadius: 54,
            backgroundColor: stopped ? C.green : C.red,
            borderWidth: 4,
            borderColor: stopped ? '#7BE8AB' : '#FF6B66',
            alignItems: 'center',
            justifyContent: 'center',
          },
          shadow,
        ]}
      >
        <Icon name={stopped ? 'play' : 'warning'} size={50} color={stopped ? C.ink : '#fff'} strokeWidth={2.2} fill={stopped ? C.ink : undefined} />
      </View>
      <Text style={{ color: C.text, fontSize: 20, fontWeight: F.heavy, letterSpacing: 0.5 }}>{stopped ? 'SPANNING AAN' : 'NOODSTOP'}</Text>
    </Pressable>
  );
}

function ArcGauge({ value, max, color, text, unit, minLabel, maxLabel, title }: {
  value: number; max: number; color: string; text: string; unit?: string; minLabel: string; maxLabel: string; title: string;
}) {
  const w = 230;
  const h = 130;
  const r = 86;
  const frac = Math.max(0, Math.min(1, value / max));
  return (
    <View style={{ flex: 1, minWidth: 200, backgroundColor: C.panel2, borderRadius: R.md, borderWidth: 1, borderColor: C.borderSoft, padding: 14, alignItems: 'center' }}>
      <Text style={{ color: C.text, fontSize: 18, fontWeight: F.semi }}>{title}</Text>
      <View style={{ width: w, height: h, marginTop: 6 }}>
        <Svg width={w} height={h}>
          <Path d={arcPath(w / 2, h - 12, r, 180, 360)} stroke={C.track} strokeWidth={14} strokeLinecap="round" fill="none" />
          {frac > 0.01 ? <Path d={arcPath(w / 2, h - 12, r, 180, 180 + 180 * frac)} stroke={color} strokeWidth={14} strokeLinecap="round" fill="none" /> : null}
        </Svg>
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 14, alignItems: 'center' }}>
          <View style={{ backgroundColor: '#0A1D49', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 6, flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
            <Text style={{ color: C.text, fontSize: 28, fontWeight: F.bold }}>{text}</Text>
            {unit ? <Text style={{ color: C.textSoft, fontSize: 18 }}>{unit}</Text> : null}
          </View>
        </View>
        <Text style={{ position: 'absolute', left: 16, bottom: -8, color: C.textSoft, fontSize: 15 }}>{minLabel}</Text>
        <Text style={{ position: 'absolute', right: 16, bottom: -8, color: C.textSoft, fontSize: 15 }}>{maxLabel}</Text>
      </View>
    </View>
  );
}

/** Live status van de ECoS. De ECoS geeft geen stroom/spanning door, dus we tonen wat wel echt is. */
export function LiveStatusPanel() {
  const status = useEcos((s) => s.status);
  const latency = useEcos((s) => s.latency);
  const total = useEcos((s) => s.locoIds.length);
  const moving = useEcos((s) => Object.values(s.locos).filter((l) => l.speed > 0).length);
  const info = useEcos((s) => s.info);
  const go = status === 'GO';
  return (
    <Panel>
      <SectionTitle
        icon="chart"
        title="Live status"
        right={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: C.green }} />
            <Text style={{ color: C.textSoft, fontSize: 15 }}>
              Live van ESU {info?.model ?? 'ECoS'}
              {info?.applicationVersion ? ` · firmware ${info.applicationVersion}` : ''}
            </Text>
          </View>
        }
      />
      <View style={{ flexDirection: 'row', gap: 14, flexWrap: 'wrap' }}>
        <ArcGauge title="Baanspanning" value={go ? 1 : 0} max={1} color={go ? C.green : C.red} text={go ? 'Aan' : 'Uit'} minLabel="" maxLabel="" />
        <ArcGauge title="Rijdende locs" value={moving} max={Math.max(1, total)} color={C.yellow} text={`${moving}`} unit={`/ ${total}`} minLabel="0" maxLabel={`${total}`} />
        <ArcGauge
          title="Reactietijd"
          value={latency ?? 0}
          max={200}
          color={latency !== null && latency > 150 ? C.red : C.blue}
          text={latency === null ? '–' : `${latency}`}
          unit="ms"
          minLabel="0"
          maxLabel="200"
        />
      </View>
    </Panel>
  );
}

function TurnoutGlyph({ state, route }: { state: number; route: boolean }) {
  if (route) return <Icon name="route" size={40} color={C.yellow} />;
  return (
    <Svg width={56} height={40} viewBox="0 0 56 40">
      <Path d="M4 32 H52" stroke={state === 0 ? C.yellow : '#4A6399'} strokeWidth={5} strokeLinecap="round" fill="none" />
      <Path d="M4 32 C24 32 32 10 52 6" stroke={state !== 0 ? C.yellow : '#4A6399'} strokeWidth={5} strokeLinecap="round" fill="none" />
    </Svg>
  );
}

/** Rijwegen en wissels uit de ECoS, tik om te schakelen. */
export function RoutesPanel() {
  const ids = useEcos((s) => s.accessoryIds);
  const acc = useEcos((s) => s.accessories);
  return (
    <Panel>
      <SectionTitle icon="route" title="Rijwegen en wissels" right={<Text style={{ color: C.textSoft, fontSize: 15 }}>Tik om te schakelen</Text>} />
      {ids.length === 0 ? (
        <Text style={{ color: C.muted, fontSize: 16 }}>Er staan geen wissels of rijwegen in de ECoS.</Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
          {ids.map((id) => {
            const a = acc[id];
            const route = a.type === 'ROUTE';
            const stateText = route ? 'Rijweg instellen' : a.state === 0 ? 'Recht' : a.state === 1 ? 'Afbuigend' : `Stand ${a.state}`;
            return (
              <Pressable
                key={id}
                accessibilityRole="button"
                accessibilityLabel={`${a.name}: ${stateText}`}
                onPress={() => switchAccessory(id)}
                style={({ pressed }) => [
                  { width: 190, borderRadius: R.md, overflow: 'hidden', backgroundColor: C.panel2, borderWidth: 1, borderColor: C.border },
                  pressed ? { opacity: 0.8 } : null,
                ]}
              >
                <View style={{ height: 84, backgroundColor: '#0A1D49', alignItems: 'center', justifyContent: 'center' }}>
                  <TurnoutGlyph state={a.state} route={route} />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: C.text, fontSize: 17, fontWeight: F.semi }} numberOfLines={1}>
                      {a.name}
                    </Text>
                    <Text style={{ color: C.textSoft, fontSize: 15 }} numberOfLines={1}>
                      {stateText}
                    </Text>
                  </View>
                  <Icon name="chevronRight" size={20} color={C.textSoft} />
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </Panel>
  );
}
