import React, { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { describeSymbol, FUNCTION_ICON_CHOICES } from '../ecos/symbols';
import { ECOS_MAX_FUNCTIONS, LOCO_PROTOCOLS } from '../ecos/protocol';
import { deleteLocoPhoto, pickLocoPhoto } from '../lib/photos';
import { createLoco, LocoForm, updateLoco } from '../store/actions';
import { showToast } from '../store/ecos';
import { useLoco, useLocoMeta } from '../store/hooks';
import type { FuncOverride, LocoMeta } from '../store/settings';
import { C, F, R } from '../theme';
import { Icon } from './Icon';
import { LocoPhoto } from './Loco';
import { Button, Toggle } from './ui';

export const LOCO_KINDS = ['Elektrische locomotief', 'Diesellocomotief', 'Stoomlocomotief', 'Treinstel', 'Overig'];

const PROTOCOL_LABEL: Record<string, string> = {
  DCC14: 'DCC 14', DCC28: 'DCC 28', DCC128: 'DCC 128', MM14: 'MM 14', MM27: 'MM 27', MM28: 'MM 28', SX32: 'SX 32', MMFKT: 'MM functie',
};

function maxAddr(protocol: string) {
  if (protocol.startsWith('MM')) return 255;
  if (protocol.startsWith('SX')) return 111;
  return 10239;
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: C.textSoft, fontSize: 16, fontWeight: F.semi }}>{label}</Text>
      {children}
      {hint ? <Text style={{ color: C.muted, fontSize: 14 }}>{hint}</Text> : null}
    </View>
  );
}

const inputStyle = {
  backgroundColor: C.bgDeep,
  borderRadius: R.md,
  borderWidth: 1,
  borderColor: C.border,
  color: C.text,
  fontSize: 18,
  paddingHorizontal: 14,
  height: 52,
} as const;

function Chips({ options, value, onChange, labels }: { options: readonly string[]; value: string; onChange: (v: string) => void; labels?: Record<string, string> }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((o) => {
        const on = o === value;
        return (
          <Pressable
            key={o}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            onPress={() => onChange(on && !labels ? '' : o)}
            style={{ paddingHorizontal: 16, height: 44, borderRadius: 22, justifyContent: 'center', backgroundColor: on ? C.accent : C.panel2, borderWidth: 1, borderColor: on ? C.accent : C.border }}
          >
            <Text style={{ color: on ? C.ink : C.text, fontSize: 15, fontWeight: F.semi }}>{labels?.[o] ?? o}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Formulier om een loc toe te voegen (id = null) of te bewerken. */
export function LocoEditor({ id, visible, onClose }: { id: number | null; visible: boolean; onClose: (savedId?: number) => void }) {
  const loco = useLoco(id);
  const meta = useLocoMeta(id);
  const [name, setName] = useState('');
  const [addr, setAddr] = useState('3');
  const [protocol, setProtocol] = useState('DCC128');
  const [m, setM] = useState<LocoMeta>({});
  const [openFn, setOpenFn] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setName(loco?.name ?? '');
    setAddr(String(loco?.addr ?? 3));
    setProtocol(loco?.protocol && loco.protocol !== '?' ? loco.protocol : 'DCC128');
    setM(id != null ? { ...meta } : {});
    setOpenFn(null);
    // alleen bij openen opnieuw vullen
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, id]);

  const fnNumbers = useMemo(() => {
    const set = new Set<number>();
    if (loco?.funcDesc.some((d) => d)) loco.funcDesc.forEach((d, n) => d && set.add(n));
    else for (let n = 0; n < 16; n++) set.add(n);
    Object.keys(m.funcs ?? {}).forEach((k) => set.add(Number(k)));
    return Array.from(set).sort((a, b) => a - b);
  }, [loco, m.funcs]);

  const fnBase = (n: number) => {
    const d = loco?.funcDesc[n];
    const b = describeSymbol(d?.symbol, n);
    return { ...b, moment: d?.moment ?? false };
  };
  const setFn = (n: number, patch: FuncOverride) => setM((x) => ({ ...x, funcs: { ...x.funcs, [n]: { ...x.funcs?.[n], ...patch } } }));

  const addrNum = Number(addr);
  const addrOk = Number.isInteger(addrNum) && addrNum >= (protocol.startsWith('SX') ? 0 : 1) && addrNum <= maxAddr(protocol);
  const vmaxNum = m.vmax ?? 0;
  const valid = name.trim().length > 0 && addrOk;

  const photo = async (source: 'library' | 'camera') => {
    try {
      const uri = await pickLocoPhoto(source);
      if (uri) setM((x) => ({ ...x, photo: uri }));
    } catch (e) {
      showToast((e as Error).message, 'error');
    }
  };

  const save = async () => {
    if (!valid) return;
    setSaving(true);
    const form: LocoForm = { name: name.trim(), addr: addrNum, protocol, meta: m };
    if (id == null) {
      const newId = await createLoco(form);
      setSaving(false);
      if (newId) onClose(newId);
    } else {
      const ok = await updateLoco(id, form);
      setSaving(false);
      if (ok) {
        if (meta.photo && meta.photo !== m.photo) deleteLocoPhoto(meta.photo);
        onClose(id);
      }
    }
  };

  const quick = m.quick ?? [];
  const toggleQuick = (n: number) => {
    const next = quick.includes(n) ? quick.filter((x) => x !== n) : [...quick, n].slice(-2);
    setM((x) => ({ ...x, quick: next }));
  };
  const nextFree = Array.from({ length: ECOS_MAX_FUNCTIONS }, (_, i) => i).find((n) => !fnNumbers.includes(n));

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => onClose()}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: C.bg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 18, gap: 12, borderBottomWidth: 1, borderBottomColor: C.borderSoft }}>
          <Button title="Annuleren" kind="ghost" onPress={() => onClose()} small />
          <Text style={{ flex: 1, textAlign: 'center', color: C.text, fontSize: 22, fontWeight: F.bold }}>{id == null ? 'Nieuwe loc' : 'Loc bewerken'}</Text>
          <Button title="Opslaan" kind="primary" icon="check" onPress={save} disabled={!valid} loading={saving} small />
        </View>
        <ScrollView contentContainerStyle={{ padding: 22, gap: 22, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
          <View style={{ flexDirection: 'row', gap: 20, flexWrap: 'wrap' }}>
            <View style={{ flex: 1, minWidth: 300, gap: 10 }}>
              <LocoPhoto uri={m.photo} style={{ height: 220 }} />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Button title="Kies foto" icon="image" onPress={() => photo('library')} style={{ flex: 1 }} small />
                {Platform.OS !== 'web' ? <Button title="Maak foto" icon="camera" onPress={() => photo('camera')} style={{ flex: 1 }} small /> : null}
                {m.photo ? <Button title="Weg" icon="trash" onPress={() => setM((x) => ({ ...x, photo: undefined }))} small /> : null}
              </View>
            </View>
            <View style={{ flex: 1, minWidth: 300, gap: 18 }}>
              <Field label="Naam (op de ECoS)">
                <TextInput value={name} onChangeText={setName} placeholder="bijv. NS 1774" placeholderTextColor={C.muted} style={inputStyle} accessibilityLabel="Naam" maxLength={40} />
              </Field>
              <Field label="Digitaal adres" hint={addrOk ? undefined : `Kies een adres van ${protocol.startsWith('SX') ? 0 : 1} t/m ${maxAddr(protocol)}`}>
                <TextInput
                  value={addr}
                  onChangeText={(t) => setAddr(t.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                  style={[inputStyle, !addrOk ? { borderColor: C.red } : null]}
                  accessibilityLabel="Adres"
                  maxLength={5}
                />
              </Field>
              <Field label="Omschrijving" hint="Bijv. ‘BR 1700’ of ‘TRAXX’">
                <TextInput value={m.subtitle ?? ''} onChangeText={(t) => setM((x) => ({ ...x, subtitle: t }))} style={inputStyle} accessibilityLabel="Omschrijving" />
              </Field>
            </View>
          </View>

          <Field label="Protocol" hint={id != null ? 'Let op: een ander protocol kan alleen als de decoder dat ook ondersteunt.' : undefined}>
            <Chips options={LOCO_PROTOCOLS} value={protocol} onChange={(v) => v && setProtocol(v)} labels={PROTOCOL_LABEL} />
          </Field>
          <Field label="Soort">
            <Chips options={LOCO_KINDS} value={m.kind ?? ''} onChange={(v) => setM((x) => ({ ...x, kind: v || undefined }))} />
          </Field>
          <Field label="Topsnelheid (km/h)" hint={`Wordt gebruikt om de schaalsnelheid te tonen.${loco?.speedIndicator ? ` De ECoS geeft ${loco.speedIndicator} km/h.` : ''}`}>
            <TextInput
              value={vmaxNum ? String(vmaxNum) : ''}
              onChangeText={(t) => setM((x) => ({ ...x, vmax: Number(t.replace(/[^0-9]/g, '')) || undefined }))}
              keyboardType="number-pad"
              placeholder={String(loco?.speedIndicator || 160)}
              placeholderTextColor={C.muted}
              style={[inputStyle, { maxWidth: 200 }]}
              accessibilityLabel="Topsnelheid"
              maxLength={3}
            />
          </Field>

          <View style={{ gap: 10 }}>
            <Text style={{ color: C.text, fontSize: 20, fontWeight: F.bold }}>Functies</Text>
            <Text style={{ color: C.muted, fontSize: 14 }}>
              Pas namen en iconen aan, laat een functie alleen werken zolang je drukt (zoals een tyfoon), verberg hem, of zet hem als snelknop (maximaal 2) op het rijscherm.
            </Text>
            {fnNumbers.map((n) => {
              const base = fnBase(n);
              const o = m.funcs?.[n] ?? {};
              const open = openFn === n;
              return (
                <View key={n} style={{ backgroundColor: C.panel, borderRadius: R.md, borderWidth: 1, borderColor: C.borderSoft }}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ expanded: open }}
                    onPress={() => setOpenFn(open ? null : n)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }}
                  >
                    <Text style={{ color: C.text, fontWeight: F.heavy, fontSize: 18, width: 44 }}>F{n}</Text>
                    <Icon name={o.icon || base.icon} size={26} color={o.hidden ? C.muted : C.accent} />
                    <Text style={{ color: o.hidden ? C.muted : C.text, fontSize: 17, flex: 1 }}>{o.label || base.label}</Text>
                    {quick.includes(n) ? <Text style={{ color: C.accent, fontSize: 13, fontWeight: F.bold }}>SNELKNOP</Text> : null}
                    {(o.moment ?? base.moment) ? <Text style={{ color: C.muted, fontSize: 13 }}>vasthouden</Text> : null}
                    <Icon name={open ? 'chevronDown' : 'chevronRight'} size={20} color={C.muted} />
                  </Pressable>
                  {open ? (
                    <View style={{ padding: 14, paddingTop: 0, gap: 14 }}>
                      <TextInput
                        value={o.label ?? ''}
                        onChangeText={(t) => setFn(n, { label: t || undefined })}
                        placeholder={base.label}
                        placeholderTextColor={C.muted}
                        style={inputStyle}
                        accessibilityLabel={`Naam F${n}`}
                      />
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                        {FUNCTION_ICON_CHOICES.map((ic) => {
                          const on = (o.icon || base.icon) === ic;
                          return (
                            <Pressable
                              key={ic}
                              accessibilityRole="radio"
                              accessibilityLabel={`Icoon ${ic}`}
                              accessibilityState={{ checked: on }}
                              onPress={() => setFn(n, { icon: ic })}
                              style={{ width: 52, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? C.accent : C.panel2, borderWidth: 1, borderColor: on ? C.accent : C.border }}
                            >
                              <Icon name={ic} size={26} color={on ? C.ink : C.text} />
                            </Pressable>
                          );
                        })}
                      </ScrollView>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 24 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <Toggle value={o.moment ?? base.moment} onChange={(v) => setFn(n, { moment: v })} label="Alleen actief zolang je drukt" />
                          <Text style={{ color: C.text, fontSize: 16 }}>Alleen actief zolang je drukt</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <Toggle value={quick.includes(n)} onChange={() => toggleQuick(n)} label="Snelknop" />
                          <Text style={{ color: C.text, fontSize: 16 }}>Snelknop</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <Toggle value={!!o.hidden} onChange={(v) => setFn(n, { hidden: v })} label="Verbergen" />
                          <Text style={{ color: C.text, fontSize: 16 }}>Verbergen</Text>
                        </View>
                      </View>
                    </View>
                  ) : null}
                </View>
              );
            })}
            {nextFree !== undefined ? (
              <Button
                title={`Functie F${nextFree} toevoegen`}
                icon="plus"
                onPress={() => {
                  setFn(nextFree, { label: `Functie ${nextFree}` });
                  setOpenFn(nextFree);
                }}
                small
                style={{ alignSelf: 'flex-start' }}
              />
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
