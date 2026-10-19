import React, { useEffect, useState } from 'react';
import { Platform, ScrollView, Text, TextInput, View } from 'react-native';
import { Icon } from '../components/Icon';
import { Button, Panel, Pill, SectionTitle, Toggle } from '../components/ui';
import { connect, disconnect } from '../store/actions';
import { useEcos } from '../store/ecos';
import { useSettings } from '../store/settings';
import { C, F, R } from '../theme';

const input = {
  backgroundColor: C.bgDeep,
  borderRadius: R.md,
  borderWidth: 1,
  borderColor: C.border,
  color: C.text,
  fontSize: 19,
  paddingHorizontal: 14,
  height: 56,
} as const;

function Row({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 10 }}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: C.text, fontSize: 17, fontWeight: F.semi }}>{title}</Text>
        {sub ? <Text style={{ color: C.muted, fontSize: 14 }}>{sub}</Text> : null}
      </View>
      {children}
    </View>
  );
}

export default function SettingsScreen() {
  const s = useSettings();
  const conn = useEcos((x) => x.conn);
  const mode = useEcos((x) => x.mode);
  const error = useEcos((x) => x.error);
  const info = useEcos((x) => x.info);
  const latency = useEcos((x) => x.latency);
  const locoCount = useEcos((x) => x.locoIds.length);
  const accCount = useEcos((x) => x.accessoryIds.length);
  const [host, setHost] = useState(s.host);
  const [port, setPort] = useState(String(s.port));
  useEffect(() => {
    setHost(s.host);
    setPort(String(s.port));
  }, [s.host, s.port]);

  const busy = conn === 'connecting' || conn === 'reconnecting';
  const connected = conn === 'connected';
  const hostOk = /^[a-zA-Z0-9.-]+$/.test(host.trim());
  const portNum = Number(port);
  const portOk = Number.isInteger(portNum) && portNum > 0 && portNum < 65536;

  const doConnect = () => {
    s.set({ host: host.trim(), port: portNum });
    setTimeout(() => connect('tcp'), 0);
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 18 }} keyboardShouldPersistTaps="handled">
      <Panel>
        <SectionTitle
          icon="wifi"
          title="Verbinding met de ECoS"
          right={
            <Pill
              text={connected ? (mode === 'demo' ? 'Demo-modus actief' : 'Verbonden') : busy ? 'Bezig…' : 'Niet verbonden'}
              color={connected ? C.green : busy ? C.yellow : C.muted}
            />
          }
        />
        <Text style={{ color: C.textSoft, fontSize: 15, lineHeight: 21, marginBottom: 14 }}>
          Zet de iPad op hetzelfde (wifi-)netwerk als de ECoS. Het IP-adres staat op de ECoS onder Setup › Netwerk. De app praat met de ECoS via TCP-poort 15471.
        </Text>
        <View style={{ flexDirection: 'row', gap: 14, flexWrap: 'wrap' }}>
          <View style={{ flex: 3, minWidth: 240, gap: 6 }}>
            <Text style={{ color: C.textSoft, fontSize: 15, fontWeight: F.semi }}>IP-adres van de ECoS</Text>
            <TextInput
              value={host}
              onChangeText={setHost}
              placeholder="192.168.1.50"
              placeholderTextColor={C.muted}
              keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
              autoCapitalize="none"
              autoCorrect={false}
              style={[input, !hostOk ? { borderColor: C.red } : null]}
              accessibilityLabel="IP-adres van de ECoS"
            />
          </View>
          <View style={{ flex: 1, minWidth: 140, gap: 6 }}>
            <Text style={{ color: C.textSoft, fontSize: 15, fontWeight: F.semi }}>Poort</Text>
            <TextInput
              value={port}
              onChangeText={(t) => setPort(t.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              style={[input, !portOk ? { borderColor: C.red } : null]}
              accessibilityLabel="Poort"
              maxLength={5}
            />
          </View>
        </View>
        {error && !connected ? (
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 14, padding: 12, borderRadius: R.md, backgroundColor: '#3A1515' }}>
            <Icon name="warning" size={22} color="#FF8A80" />
            <Text style={{ color: '#FFD0CC', fontSize: 15, flex: 1 }}>{error}</Text>
          </View>
        ) : null}
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 18, flexWrap: 'wrap' }}>
          <Button title={connected && mode === 'tcp' ? 'Opnieuw verbinden' : 'Verbinden'} icon="link" kind="primary" onPress={doConnect} disabled={!hostOk || !portOk} loading={busy && mode === 'tcp'} style={{ flex: 1, minWidth: 200 }} />
          <Button title="Demo-modus (zonder ECoS)" icon="play" onPress={() => connect('demo')} loading={busy && mode === 'demo'} style={{ flex: 1, minWidth: 200 }} />
          {connected || busy ? <Button title="Verbreken" icon="close" kind="ghost" onPress={() => disconnect()} style={{ minWidth: 160 }} /> : null}
        </View>
      </Panel>

      {connected ? (
        <Panel>
          <SectionTitle icon="device" title="Centrale" />
          <Row title="Model">
            <Text style={{ color: C.text, fontSize: 17 }}>ESU {info?.model ?? 'ECoS'}</Text>
          </Row>
          {info?.applicationVersion ? (
            <Row title="Firmware">
              <Text style={{ color: C.text, fontSize: 17 }}>{info.applicationVersion}</Text>
            </Row>
          ) : null}
          {info?.protocolVersion ? (
            <Row title="Protocolversie">
              <Text style={{ color: C.text, fontSize: 17 }}>{info.protocolVersion}</Text>
            </Row>
          ) : null}
          <Row title="Locs / wissels en rijwegen">
            <Text style={{ color: C.text, fontSize: 17 }}>
              {locoCount} / {accCount}
            </Text>
          </Row>
          <Row title="Reactietijd">
            <Text style={{ color: C.text, fontSize: 17 }}>{latency === null ? '–' : `${latency} ms`}</Text>
          </Row>
        </Panel>
      ) : null}

      <Panel>
        <SectionTitle icon="settings" title="App" />
        <Row title="Automatisch verbinden bij openen" sub="Verbindt met de laatst gebruikte ECoS (of demo)">
          <Toggle value={s.autoConnect} onChange={(v) => s.set({ autoConnect: v })} label="Automatisch verbinden" />
        </Row>
        <Row title="Scherm aan houden" sub="De iPad gaat niet op slot zolang je verbonden bent">
          <Toggle value={s.keepAwake} onChange={(v) => s.set({ keepAwake: v })} label="Scherm aan houden" />
        </Row>
        <View style={{ flexDirection: 'row', gap: 14, flexWrap: 'wrap', marginTop: 10 }}>
          <View style={{ flex: 1, minWidth: 240, gap: 6 }}>
            <Text style={{ color: C.textSoft, fontSize: 15, fontWeight: F.semi }}>Titel bovenin</Text>
            <TextInput value={s.title} onChangeText={(t) => s.set({ title: t })} style={input} accessibilityLabel="Titel" maxLength={30} />
          </View>
          <View style={{ flex: 1, minWidth: 240, gap: 6 }}>
            <Text style={{ color: C.textSoft, fontSize: 15, fontWeight: F.semi }}>Ondertitel</Text>
            <TextInput value={s.subtitle} onChangeText={(t) => s.set({ subtitle: t })} style={input} accessibilityLabel="Ondertitel" maxLength={50} />
          </View>
        </View>
      </Panel>
    </ScrollView>
  );
}
