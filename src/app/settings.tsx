import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Segmented, Toggle } from '../components/ui';
import { useEcos } from '../store/ecos';
import { useSettings } from '../store/settings';
import { C, F, R } from '../theme';

function Group({ title, children, footer }: { title: string; children: React.ReactNode; footer?: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: C.muted, fontSize: 13, fontWeight: F.semi, marginLeft: 16, textTransform: 'uppercase', letterSpacing: 0.4 }}>{title}</Text>
      <View style={{ backgroundColor: C.panel, borderRadius: R.lg, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: C.border }}>{children}</View>
      {footer ? <Text style={{ color: C.muted, fontSize: 13, marginHorizontal: 16, lineHeight: 18 }}>{footer}</Text> : null}
    </View>
  );
}

function Row({ title, sub, children, last }: { title: string; sub?: string; children?: React.ReactNode; last?: boolean }) {
  return (
    <View
      style={[
        { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 16, paddingVertical: 12, minHeight: 52 },
        !last ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border } : null,
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ color: C.text, fontSize: 17 }}>{title}</Text>
        {sub ? <Text style={{ color: C.muted, fontSize: 13 }}>{sub}</Text> : null}
      </View>
      {children}
    </View>
  );
}

export default function SettingsScreen() {
  const s = useSettings();
  const info = useEcos((x) => x.info);
  const connected = useEcos((x) => x.conn === 'connected');
  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24, gap: 22, maxWidth: 820 }}>
      <Group title="Weergave" footer="Automatisch volgt de instelling van je iPad (licht of donker).">
        <View style={{ padding: 12 }}>
          <Segmented
            label="Thema"
            value={s.theme ?? 'auto'}
            onChange={(v) => s.set({ theme: v })}
            options={[
              { value: 'auto', label: 'Automatisch' },
              { value: 'light', label: 'Licht', icon: 'light' },
              { value: 'dark', label: 'Donker', icon: 'dot' },
            ]}
          />
        </View>
      </Group>

      <Group title="Algemeen">
        <Row title="Automatisch verbinden" sub="Bij openen verbinden met de laatst gebruikte centrale (of demo)">
          <Toggle value={s.autoConnect} onChange={(v) => s.set({ autoConnect: v })} label="Automatisch verbinden" />
        </Row>
        <Row title="Scherm aan houden" sub="De iPad gaat niet op slot zolang je verbonden bent" last>
          <Toggle value={s.keepAwake} onChange={(v) => s.set({ keepAwake: v })} label="Scherm aan houden" />
        </Row>
      </Group>

      {connected && info ? (
        <Group title="Centrale">
          <Row title="Model">
            <Text style={{ color: C.muted, fontSize: 17 }}>ESU {info.model}</Text>
          </Row>
          {info.applicationVersion ? (
            <Row title="Firmware">
              <Text style={{ color: C.muted, fontSize: 17 }}>{info.applicationVersion}</Text>
            </Row>
          ) : null}
          <Row title="Protocolversie" last>
            <Text style={{ color: C.muted, fontSize: 17 }}>{info.protocolVersion ?? '–'}</Text>
          </Row>
        </Group>
      ) : null}

      <Group title="Over" footer="Snelheid regel je met het draaiwiel: met de klok mee is sneller. Functies die alleen werken zolang je drukt (zoals een tyfoon) hebben een handje.">
        <Row title="ECoS Driver">
          <Text style={{ color: C.muted, fontSize: 17 }}>1.0</Text>
        </Row>
        <Row title="Protocol" sub="ESU ECoS netwerkprotocol via TCP 15471" last />
      </Group>
    </ScrollView>
  );
}
