// De rijregelaar ("cab"): snelheidsmeter in rijstappen, verticaal duimwiel,
// knoppen voor richting, stap, halt en noodstop, en de functielijst.
import React, { useEffect, useId, useRef, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import type { LocoInfo } from '../ecos/client';
import { setDirection, setFunction, setSpeed, stopLoco, toggleFunction } from '../store/actions';
import { useEcos } from '../store/ecos';
import type { FunctionView } from '../store/hooks';
import type { LocoMeta } from '../store/settings';
import { C, F, R, themed } from '../theme';
import { Icon } from './Icon';
import { arcPath, polar } from './JogWheel';
import { LocoPhoto, LocoSwitchButton } from './Loco';
import { NO_SELECT, useGasScroll } from './useGasScroll';

const MAX = 126;

/** Aantal rijstappen van het protocol (DCC128 heeft 126 bruikbare stappen). */
export function protocolSteps(protocol: string): number {
  const m = /(\d+)$/.exec(protocol);
  const n = m ? Number(m[1]) : 128;
  if (protocol.startsWith('SX')) return 31;
  if (n >= 126) return 126;
  return n === 14 || n === 27 || n === 28 ? n : 126;
}

/** Korte protocolnaam zoals op de ECoS: M28, DCC128, SX32. */
export function protocolShort(protocol: string) {
  if (protocol === 'MMFKT') return 'M-fkt';
  return protocol.startsWith('MM') ? 'M' + protocol.slice(2) : protocol;
}

export const toStep = (speed: number, steps: number) => Math.round((Math.max(0, Math.min(MAX, speed)) / MAX) * steps);
export const fromStep = (step: number, steps: number) => Math.round((Math.max(0, Math.min(steps, step)) / steps) * MAX);

const TYPE_LABEL: Record<string, string> = {
  LOCO_TYPE_STEAM: 'Stoom',
  LOCO_TYPE_DIESEL: 'Diesel',
  LOCO_TYPE_E: 'Elektrisch',
};
const KIND_LABEL: Record<string, string> = {
  'Elektrische locomotief': 'Elektrisch',
  Diesellocomotief: 'Diesel',
  Stoomlocomotief: 'Stoom',
};

/** "[78] · M28 · Stoom" */
export function cabSubtitle(loco: LocoInfo, meta: LocoMeta) {
  const type = meta.kind ? KIND_LABEL[meta.kind] ?? meta.kind : loco.locodesc ? TYPE_LABEL[loco.locodesc.locoType] : undefined;
  return [`[${loco.addr}]`, protocolShort(loco.protocol), type, meta.subtitle].filter(Boolean).join(' · ');
}

// ------------------------------------------------------------------ meter

const GAUGE_START = 135;
const GAUGE_SWEEP = 270;

function mix(a: number[], b: number[], t: number) {
  const c = a.map((x, i) => Math.round(x + (b[i] - x) * t));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}
function bandColor(t: number) {
  const green = [52, 199, 89];
  const yellow = [255, 204, 0];
  const red = [255, 59, 48];
  return t < 0.5 ? mix(green, yellow, t * 2) : mix(yellow, red, (t - 0.5) * 2);
}

function scaleFor(steps: number) {
  if (steps <= 14) return { major: 2, minor: 1 };
  if (steps <= 31) return { major: 4, minor: 1 };
  return { major: 20, minor: 5 };
}

/** Snelheidsmeter in rijstappen: groen naar rood, rode naald, "0 / 28" eronder. */
export function SpeedGauge({ step, steps, size }: { step: number; steps: number; size: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const band = Math.max(7, size * 0.045);
  const rBand = size / 2 - band / 2 - 2;
  const rTick = rBand - band / 2 - 3;
  const frac = Math.max(0, Math.min(1, step / steps));
  const angle = GAUGE_START + GAUGE_SWEEP * frac;
  const segs = 54;
  const { major, minor } = scaleFor(steps);
  const labels: number[] = [];
  for (let v = 0; v <= steps; v += major) labels.push(v);
  if (labels[labels.length - 1] !== steps) {
    if (steps - labels[labels.length - 1] < major / 2) labels.pop();
    labels.push(steps);
  }
  const fontSize = Math.max(10, Math.round(size * 0.058));
  const rLabel = rTick - size * 0.125;
  const needleTip = polar(cx, cy, rTick - 4, angle);
  const needleTail = polar(cx, cy, size * 0.07, angle + 180);

  return (
    <View style={{ width: size, height: size }} accessible accessibilityLabel={`Rijstap ${step} van ${steps}`}>
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cy} r={size / 2 - 1} fill={C.panel2} />
        {Array.from({ length: segs }, (_, i) => {
          const a0 = GAUGE_START + (GAUGE_SWEEP * i) / segs;
          const a1 = GAUGE_START + (GAUGE_SWEEP * (i + 1)) / segs + 0.6;
          const lit = (i + 0.5) / segs <= frac || frac >= 1;
          return <Path key={i} d={arcPath(cx, cy, rBand, a0, a1)} stroke={bandColor(i / (segs - 1))} strokeWidth={band} fill="none" opacity={lit ? 1 : 0.32} />;
        })}
        {Array.from({ length: Math.floor(steps / minor) + 1 }, (_, i) => {
          const v = i * minor;
          const isMajor = v % major === 0 || v === steps;
          const a = GAUGE_START + (GAUGE_SWEEP * v) / steps;
          const p1 = polar(cx, cy, rTick, a);
          const p2 = polar(cx, cy, rTick - (isMajor ? size * 0.06 : size * 0.03), a);
          return <Line key={v} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={isMajor ? C.text : C.muted} strokeWidth={isMajor ? 2 : 1} strokeLinecap="round" />;
        })}
        <Line x1={needleTail.x} y1={needleTail.y} x2={needleTip.x} y2={needleTip.y} stroke="#FF3B30" strokeWidth={Math.max(2.5, size * 0.014)} strokeLinecap="round" />
        <Circle cx={cx} cy={cy} r={size * 0.045} fill="#FF3B30" />
        <Circle cx={cx} cy={cy} r={size * 0.02} fill={C.panel2} />
      </Svg>
      {size >= 170 && labels.map((v) => {
        const p = polar(cx, cy, rLabel, GAUGE_START + (GAUGE_SWEEP * v) / steps);
        return (
          <Text key={v} style={{ position: 'absolute', left: p.x - 20, top: p.y - fontSize * 0.7, width: 40, textAlign: 'center', color: C.textSoft, fontSize, fontWeight: F.medium, fontVariant: ['tabular-nums'] }}>
            {v}
          </Text>
        );
      })}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: size * 0.025, flexDirection: 'row', justifyContent: 'center', alignItems: 'baseline' }}>
        <Text style={{ color: C.blue, fontSize: fontSize * 1.9, fontWeight: F.bold, fontVariant: ['tabular-nums'] }}>{step}</Text>
        <Text style={{ color: C.muted, fontSize: fontSize * 1.25, fontWeight: F.medium }}> / {steps}</Text>
      </View>
    </View>
  );
}

// ------------------------------------------------------------------ duimwiel

const RIB_DEG = 11;

/**
 * Verticaal duimwiel (eindeloos). Omhoog scrollen = meer gas, omlaag = minder.
 * Bij vol gas of bij 0 doet verder scrollen niets; terugdraaien werkt meteen.
 */
export function ThumbWheel({
  step,
  steps,
  onChange,
  width = 64,
  height = 240,
  disabled,
  label = 'Snelheid',
}: {
  step: number;
  steps: number;
  onChange: (step: number) => void;
  width?: number;
  height?: number;
  disabled?: boolean;
  label?: string;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  // het hele bereik in ongeveer anderhalve wiellengte
  const pxPerStep = Math.max(3, (height * 1.5) / steps);
  const { offset, handlers } = useGasScroll({ value: step, max: steps, onChange, disabled, pxPerStep, axis: 'vertical', hapticEvery: steps > 40 ? 6 : 1 });
  const inner = width - 8;
  const h = height - 8;
  const rad = h / 2;
  // het oppervlak loopt met de vinger mee: d pixels = d/rad radialen
  const turn = ((offset / rad) * 180) / Math.PI;
  const ribs: { y: number; c: number }[] = [];
  const start = ((turn % RIB_DEG) + RIB_DEG) % RIB_DEG;
  for (let a = start - 90; a < 90; a += RIB_DEG) {
    if (a <= -88) continue;
    const t = (a * Math.PI) / 180;
    ribs.push({ y: rad - rad * Math.sin(t), c: Math.cos(t) });
  }

  return (
    <View
      {...handlers}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={`${label}: scroll omhoog voor meer gas`}
      accessibilityValue={{ min: 0, max: steps, now: step }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => onChange(Math.max(0, Math.min(steps, step + (e.nativeEvent.actionName === 'increment' ? 1 : -1))))}
      style={[{ width, height, padding: 4, borderRadius: 16, backgroundColor: C.bgDeep, opacity: disabled ? 0.5 : 1 }, NO_SELECT]}
    >
      <Svg width={inner} height={h}>
        <Defs>
          <LinearGradient id={`tw${uid}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={C.wheelLo} />
            <Stop offset="0.5" stopColor={C.wheelHi} />
            <Stop offset="1" stopColor={C.wheelLo} />
          </LinearGradient>
          <LinearGradient id={`ts${uid}`} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#000000" stopOpacity={0.22} />
            <Stop offset="0.25" stopColor="#000000" stopOpacity={0} />
            <Stop offset="0.75" stopColor="#000000" stopOpacity={0} />
            <Stop offset="1" stopColor="#000000" stopOpacity={0.22} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={inner} height={h} rx={12} fill={`url(#tw${uid})`} />
        {ribs.map((r, i) => (
          <Line key={i} x1={5} x2={inner - 5} y1={r.y} y2={r.y} stroke={C.wheelTick} strokeWidth={Math.max(0.6, 3 * r.c)} opacity={0.25 + 0.75 * r.c} strokeLinecap="round" />
        ))}
        <Rect x={0} y={0} width={inner} height={h} rx={12} fill={`url(#ts${uid})`} />
      </Svg>
    </View>
  );
}

// ------------------------------------------------------------------ knoppen

/** Tik = één keer; vasthouden = blijven herhalen tot je loslaat. */
function useRepeat(action: () => void) {
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const act = useRef(action);
  act.current = action;
  const stop = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  };
  useEffect(() => stop, []);
  return {
    onPress: () => act.current(),
    onLongPress: () => {
      stop();
      act.current();
      timer.current = setInterval(() => act.current(), 90);
    },
    onPressOut: stop,
    delayLongPress: 380,
  };
}

function CabButton({
  label,
  onPress,
  repeat,
  active,
  children,
  w,
  h,
}: {
  label: string;
  onPress?: () => void;
  repeat?: () => void;
  active?: boolean;
  children: React.ReactNode;
  w: number;
  h: number;
}) {
  const rep = useRepeat(repeat ?? (() => {}));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={active != null ? { selected: active } : undefined}
      aria-pressed={active}
      {...(repeat ? rep : { onPress })}
      style={({ pressed }) => [
        { width: w, height: h, borderRadius: h / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: active ? C.blue : C.panel2 },
        pressed ? { opacity: 0.7, transform: [{ scale: 0.96 }] } : null,
      ]}
    >
      {children}
    </Pressable>
  );
}

function Ringed({ text, color, size }: { text: string; color: string; size: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: color, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color, fontSize: size * 0.56, fontWeight: F.bold, lineHeight: size * 0.7 }}>{text}</Text>
    </View>
  );
}

/**
 * ← → / − + / H ! — als raster van 2 kolommen ('grid') of 3 kolommen ('compact').
 * H = loc rustig laten stoppen (rijstap 0), ! = noodstop van deze loc.
 */
export function CabButtons({ id, loco, steps, layout = 'grid', w = 68, h = 52 }: { id: number; loco: LocoInfo; steps: number; layout?: 'grid' | 'compact'; w?: number; h?: number }) {
  const neutral = useEcos((s) => !!s.neutral[id]);
  const step = toStep(loco.speed, steps);
  const bump = (d: number) => {
    const l = useEcos.getState().locos[id];
    if (!l) return;
    const cur = toStep(l.speed, steps);
    setSpeed(id, fromStep(cur + d, steps));
  };
  const icon = Math.round(h * 0.44);
  const fwd = !neutral && loco.dir === 0;
  const rev = !neutral && loco.dir === 1;
  const b = {
    rev: (
      <CabButton key="rev" label="Achteruit" active={rev} onPress={() => setDirection(id, 1)} w={w} h={h}>
        <Icon name="arrowLeft" size={icon} color={rev ? '#FFFFFF' : C.text} strokeWidth={2.4} />
      </CabButton>
    ),
    fwd: (
      <CabButton key="fwd" label="Vooruit" active={fwd} onPress={() => setDirection(id, 0)} w={w} h={h}>
        <Icon name="arrowRight" size={icon} color={fwd ? '#FFFFFF' : C.text} strokeWidth={2.4} />
      </CabButton>
    ),
    minus: (
      <CabButton key="minus" label="Een rijstap langzamer" repeat={() => bump(-1)} w={w} h={h}>
        <Icon name="minus" size={icon} color={step > 0 ? C.text : C.muted} strokeWidth={2.6} />
      </CabButton>
    ),
    plus: (
      <CabButton key="plus" label="Een rijstap sneller" repeat={() => bump(1)} w={w} h={h}>
        <Icon name="plus" size={icon} color={step < steps && !neutral ? C.text : C.muted} strokeWidth={2.6} />
      </CabButton>
    ),
    halt: (
      <CabButton key="halt" label={`${loco.name} laten stoppen`} onPress={() => setSpeed(id, 0)} w={w} h={h}>
        <Ringed text="H" color={C.text} size={icon * 1.15} />
      </CabButton>
    ),
    stop: (
      <CabButton key="stop" label={`Noodstop ${loco.name}`} onPress={() => stopLoco(id)} w={w} h={h}>
        <Ringed text="!" color={C.red} size={icon * 1.15} />
      </CabButton>
    ),
  };
  const rows = layout === 'grid' ? [[b.rev, b.fwd], [b.minus, b.plus], [b.halt, b.stop]] : [[b.rev, b.fwd, b.halt], [b.minus, b.plus, b.stop]];
  const gap = layout === 'grid' ? 10 : 6;
  return (
    <View style={{ gap }}>
      {rows.map((r, i) => (
        <View key={i} style={{ flexDirection: 'row', gap }}>
          {r}
        </View>
      ))}
    </View>
  );
}

// ------------------------------------------------------------------ kop

/** Richtingspijl + balk met "stap/stappen" in het midden. */
export function StepBar({ id, loco, steps, height = 24 }: { id: number; loco: LocoInfo; steps: number; height?: number }) {
  const neutral = useEcos((s) => !!s.neutral[id]);
  const step = toStep(loco.speed, steps);
  const frac = step / steps;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Icon name={neutral ? 'neutral' : loco.dir === 0 ? 'arrowRight' : 'arrowLeft'} size={height * 0.85} color={neutral ? C.muted : C.blue} strokeWidth={2.6} />
      <View style={{ flex: 1, height, borderRadius: height / 2, backgroundColor: C.track, overflow: 'hidden', justifyContent: 'center' }}>
        <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${frac * 100}%`, backgroundColor: C.blue, opacity: 0.85 }} />
        <View style={{ alignSelf: 'center', paddingHorizontal: 10, height: height - 6, borderRadius: (height - 6) / 2, backgroundColor: C.panel, justifyContent: 'center' }}>
          <Text style={{ color: C.text, fontSize: height * 0.52, fontWeight: F.semi, fontVariant: ['tabular-nums'] }}>
            {step}/{steps}
          </Text>
        </View>
      </View>
    </View>
  );
}

function CabHeader({ id, loco, meta, steps, onSwitch, slotLabel, narrow }: { id: number; loco: LocoInfo; meta: LocoMeta; steps: number; onSwitch: () => void; slotLabel?: string; narrow?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      <LocoPhoto ecosId={id} uri={meta.photo} style={narrow ? { width: 96, height: 60 } : { width: 128, height: 76 }} rounded={12} />
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        {slotLabel ? <Text style={{ color: C.muted, fontSize: 12, fontWeight: F.bold }}>{slotLabel.toUpperCase()}</Text> : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ flex: 1, color: C.text, fontSize: 22, fontWeight: F.bold }} numberOfLines={1}>
            {loco.name}
          </Text>
          <LocoSwitchButton onPress={onSwitch} compact={narrow} />
        </View>
        <Text style={{ color: C.muted, fontSize: 14 }} numberOfLines={1}>
          {cabSubtitle(loco, meta)}
        </Text>
        <View style={{ marginTop: 4 }}>
          <StepBar id={id} loco={loco} steps={steps} />
        </View>
      </View>
    </View>
  );
}

// ------------------------------------------------------------------ functies

function fnHandlers(id: number, f: FunctionView) {
  if (f.moment) return { onPressIn: () => setFunction(id, f.n, true), onPressOut: () => setFunction(id, f.n, false) };
  return { onPress: () => toggleFunction(id, f.n) };
}

/** Eén functie: vierkante tegel met icoon en nummer, label ernaast. */
export function FunctionCell({ id, f, width, tile = 52 }: { id: number; f: FunctionView; width: number; tile?: number }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: f.on }}
      aria-pressed={f.on}
      accessibilityLabel={`F${f.n} ${f.label}${f.moment ? ', vasthouden' : ''}`}
      {...fnHandlers(id, f)}
      style={({ pressed }) => [{ width, flexDirection: 'row', alignItems: 'center', gap: 10 }, pressed ? { opacity: 0.75 } : null]}
    >
      {({ pressed }) => (
        <>
          <View
            style={{
              width: tile,
              height: tile,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: f.on ? C.accent : C.panel2,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: f.on ? C.accentDark : C.border,
              transform: pressed ? [{ scale: 0.94 }] : undefined,
            }}
          >
            {f.icon === 'button' ? (
              <Text style={{ color: f.on ? C.ink : C.blue, fontSize: tile * 0.46, fontWeight: F.bold }}>F</Text>
            ) : (
              <Icon name={f.icon} size={tile * 0.5} color={f.on ? C.ink : C.text} strokeWidth={1.9} />
            )}
            <Text style={{ position: 'absolute', right: 5, bottom: 2, color: f.on ? C.ink : C.muted, fontSize: 11, fontWeight: F.bold, fontVariant: ['tabular-nums'] }}>{f.n}</Text>
            {f.moment ? (
              <View style={{ position: 'absolute', left: 4, top: 4 }}>
                <Icon name="hand" size={11} color={f.on ? C.ink : C.muted} />
              </View>
            ) : null}
          </View>
          <Text style={{ flex: 1, color: C.text, fontSize: 14, fontWeight: F.medium }} numberOfLines={2}>
            {f.label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

/** Functielijst in kolommen (max 4), past zich aan de breedte aan. */
export function FunctionList({ id, funcs, maxColumns = 4, minCell = 150 }: { id: number; funcs: FunctionView[]; maxColumns?: number; minCell?: number }) {
  const [w, setW] = useState(0);
  const gapX = 12;
  const cols = Math.max(1, Math.min(maxColumns, Math.floor((w + gapX) / (minCell + gapX))));
  const cellW = w > 0 ? Math.floor((w - gapX * (cols - 1)) / cols) : 0;
  return (
    <View onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)} style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: gapX, rowGap: 10 }}>
      {cellW > 0 ? funcs.map((f) => <FunctionCell key={f.n} id={id} f={f} width={cellW} />) : null}
    </View>
  );
}

// ------------------------------------------------------------------ geheel

/** Volledige cab: kop, meter + duimwiel + knoppen, functies. */
export function CabControl({
  id,
  loco,
  meta,
  funcs,
  onSwitch,
  slotLabel,
  maxGauge = 300,
}: {
  id: number;
  loco: LocoInfo;
  meta: LocoMeta;
  funcs: FunctionView[];
  onSwitch: () => void;
  slotLabel?: string;
  maxGauge?: number;
}) {
  const neutral = useEcos((s) => !!s.neutral[id]);
  const steps = protocolSteps(loco.protocol);
  const step = toStep(loco.speed, steps);
  const [w, setW] = useState(0);
  const narrow = w > 0 && w < 470;
  const btnW = narrow ? 58 : 68;
  const btnH = btnW < 68 ? 46 : 54;
  const wheelW = btnW < 68 ? 56 : 68;
  // meter vult de rest van de breedte
  const gauge = Math.round(Math.max(150, Math.min(maxGauge, w - wheelW - (btnW * 2 + 10) - 56)));
  return (
    <View style={[card(), { padding: 18, gap: 18 }]}>
      <CabHeader id={id} loco={loco} meta={meta} steps={steps} onSwitch={onSwitch} slotLabel={slotLabel} narrow={narrow} />
      <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly', gap: 12, minHeight: gauge }}>
        {w > 0 ? (
          <>
            <SpeedGauge step={step} steps={steps} size={gauge} />
            <ThumbWheel step={step} steps={steps} onChange={(s) => setSpeed(id, fromStep(s, steps))} width={wheelW} height={Math.round(gauge * (narrow ? 1.3 : 0.96))} disabled={neutral} label={`Snelheid ${loco.name}`} />
            <CabButtons id={id} loco={loco} steps={steps} w={btnW} h={btnH} />
          </>
        ) : null}
      </View>
      {neutral ? <Text style={{ color: C.muted, fontSize: 14, textAlign: 'center', marginTop: -8 }}>Kies eerst een rijrichting met ← of →</Text> : null}
      <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: C.border }} />
      {!loco.detailsLoaded ? <Text style={{ color: C.muted, fontSize: 15 }}>Functies laden…</Text> : null}
      <FunctionList id={id} funcs={funcs} />
    </View>
  );
}

const card = themed(() => ({ backgroundColor: C.panel, borderRadius: R.xl, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border }) as const);
