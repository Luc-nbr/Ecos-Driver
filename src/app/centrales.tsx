import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ConfirmDialog, Sheet } from '../components/Dialogs';
import { Icon } from '../components/Icon';
import { StatTile } from '../components/Panels';
import { Button, Panel } from '../components/ui';
import { connect, disconnect } from '../store/actions';
import { useEcos } from '../store/ecos';
import { Profile, useSettings } from '../store/settings';
import { C, F, R, themed } from '../theme';

const input = themed(() => ({ backgroundColor: C.panel2, borderRadius: 12, color: C.text, fontSize: 17, paddingHorizontal: 14, height: 48 }) as const);

function ProfileSheet({ profile, onClose }: { profile: Profile | null; onClose: () => void }) {
  const s = useSettings();
  const isNew = !s.profiles.some((p) => p.id === profile?.id);
  const [name, setName] = useState(profile?.name ?? '');
  const [host, setHost] = useState(profile?.host ?? '');
  const [port, setPort] = useState(String(profile?.port ?? 15471));
  const [vncPort, setVncPort] = useState(String(profile?.vncPort ?? 5900));
  const [vncPassword, setVncPassword] = useState(profile?.vncPassword ?? '');
  const vncPortNum = Number(vncPort);
  const vncOk = Number.isInteger(vncPortNum) && vncPortNum > 0 && vncPortNum < 65536;
  const hostOk = /^[a-zA-Z0-9.-]+$/.test(host.trim());
  const portNum = Number(port);
  const portOk = Number.isInteger(portNum) && portNum > 0 && portNum < 65536;
  const ok = name.trim().length > 0 && hostOk && portOk && vncOk;

  const save = () => {
    if (!ok || !profile) return;
    const p: Profile = { id: profile.id, name: name.trim(), host: host.trim(), port: portNum, vncPort: vncPortNum, vncPassword };
    s.set({ profiles: isNew ? [...s.profiles, p] : s.profiles.map((x) => (x.id === p.id ? p : x)) });
    onClose();
  };

  return (
    <Sheet visible={!!profile} onClose={onClose} maxWidth={520}>
      <Text style={{ color: C.text, fontSize: 22, fontWeight: F.bold }}>{isNew ? 'Nieuwe centrale' : 'Centrale bewerken'}</Text>
      <View style={{ gap: 6 }}>
        <Text style={{ color: C.muted, fontSize: 14, fontWeight: F.semi }}>Naam</Text>
        <TextInput value={name} onChangeText={setName} placeholder="bijv. Thuisbaan" placeholderTextColor={C.muted} style={input()} accessibilityLabel="Naam centrale" maxLength={30} />
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 3, gap: 6 }}>
          <Text style={{ color: C.muted, fontSize: 14, fontWeight: F.semi }}>IP-adres</Text>
          <TextInput
            value={host}
            onChangeText={setHost}
            placeholder="192.168.1.50"
            placeholderTextColor={C.muted}
            keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
            autoCapitalize="none"
            autoCorrect={false}
            style={[input(), host && !hostOk ? { borderWidth: 1, borderColor: C.red } : null]}
            accessibilityLabel="IP-adres van de ECoS"
          />
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={{ color: C.muted, fontSize: 14, fontWeight: F.semi }}>Poort</Text>
          <TextInput value={port} onChangeText={(t) => setPort(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" style={input()} accessibilityLabel="Poort" maxLength={5} />
        </View>
      </View>
      <Text style={{ color: C.muted, fontSize: 13 }}>Het IP-adres staat op de ECoS onder Setup › Netwerk. De poort is meestal 15471.</Text>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={{ color: C.muted, fontSize: 14, fontWeight: F.semi }}>VNC-poort (live scherm)</Text>
          <TextInput value={vncPort} onChangeText={(t) => setVncPort(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" style={input()} accessibilityLabel="VNC-poort" maxLength={5} />
        </View>
        <View style={{ flex: 2, gap: 6 }}>
          <Text style={{ color: C.muted, fontSize: 14, fontWeight: F.semi }}>VNC-wachtwoord (als dat nodig is)</Text>
          <TextInput value={vncPassword} onChangeText={setVncPassword} secureTextEntry autoCapitalize="none" autoCorrect={false} placeholder="leeg laten als er geen is" placeholderTextColor={C.muted} style={input()} accessibilityLabel="VNC-wachtwoord" maxLength={8} />
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button title="Annuleren" onPress={onClose} style={{ flex: 1 }} />
        <Button title="Bewaren" kind="primary" onPress={save} disabled={!ok} style={{ flex: 1 }} />
      </View>
    </Sheet>
  );
}

export default function CentralesScreen() {
  const s = useSettings();
  const conn = useEcos((x) => x.conn);
  const mode = useEcos((x) => x.mode);
  const error = useEcos((x) => x.error);
  const info = useEcos((x) => x.info);
  const locoCount = useEcos((x) => x.locoIds.length);
  const accCount = useEcos((x) => x.accessoryIds.length);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [removing, setRemoving] = useState<Profile | null>(null);
  const busy = conn === 'connecting' || conn === 'reconnecting';
  const connected = conn === 'connected';

  const connectTo = (p: Profile) => {
    s.set({ activeProfileId: p.id });
    setTimeout(() => connect('tcp'), 0);
  };

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24, gap: 16 }} keyboardShouldPersistTaps="handled">
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <StatTile value={String(s.profiles.length)} label={s.profiles.length === 1 ? 'Centrale' : 'Centrales'} icon="server" />
        <StatTile
          value={connected ? (mode === 'demo' ? 'Demo' : '1') : '0'}
          label={connected ? (mode === 'demo' ? 'Demo-modus actief' : 'Verbonden') : 'Verbonden'}
          icon="wifi"
          color={connected ? C.green : C.text}
        />
        {connected ? <StatTile value={`${locoCount}`} label={`Locs · ${accCount} wissels/rijwegen`} icon="train" /> : null}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
        <Text style={{ color: C.text, fontSize: 20, fontWeight: F.bold }}>Mijn centrales</Text>
        <Button title="Centrale toevoegen" icon="plus" kind="tinted" small onPress={() => setEditing({ id: `p${Date.now()}`, name: '', host: '', port: 15471 })} />
      </View>
      <View style={{ backgroundColor: C.panel, borderRadius: R.lg, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: C.border }}>
        {s.profiles.map((p, i) => {
          const active = p.id === s.activeProfileId && mode === 'tcp';
          const online = active && connected;
          return (
            <View
              key={p.id}
              style={[
                { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 12, minHeight: 68 },
                i < s.profiles.length - 1 ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border } : null,
              ]}
            >
              <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: C.panel2, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="server" size={20} color={online ? C.green : C.muted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.text, fontSize: 17, fontWeight: F.semi }}>{p.name}</Text>
                <Text style={{ color: C.muted, fontSize: 14 }}>
                  {p.host}:{p.port}
                  {online && info?.model ? ` · ${info.model}` : ''}
                  {online && info?.applicationVersion ? ` · firmware ${info.applicationVersion}` : ''}
                </Text>
              </View>
              {online ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.green }} />
                  <Text style={{ color: C.green, fontSize: 14, fontWeight: F.semi }}>Online</Text>
                </View>
              ) : (
                <Button title={active && busy ? 'Verbinden…' : 'Verbinden'} kind="tinted" small loading={active && busy} onPress={() => connectTo(p)} />
              )}
              <Pressable accessibilityRole="button" accessibilityLabel={`${p.name} bewerken`} onPress={() => setEditing(p)} hitSlop={8} style={{ padding: 8 }}>
                <Icon name="edit" size={20} color={C.muted} />
              </Pressable>
              {s.profiles.length > 1 ? (
                <Pressable accessibilityRole="button" accessibilityLabel={`${p.name} verwijderen`} onPress={() => setRemoving(p)} hitSlop={8} style={{ padding: 8 }}>
                  <Icon name="trash" size={20} color={C.muted} />
                </Pressable>
              ) : null}
            </View>
          );
        })}
      </View>

      {error && !connected && !busy ? (
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', padding: 14, borderRadius: R.md, backgroundColor: C.redSoft }}>
          <Icon name="warning" size={20} color={C.red} />
          <Text style={{ color: C.text, fontSize: 15, flex: 1 }}>{error}</Text>
        </View>
      ) : null}

      <Panel style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: C.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="play" size={18} color={C.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.text, fontSize: 17, fontWeight: F.semi }}>Demo-modus</Text>
          <Text style={{ color: C.muted, fontSize: 14 }}>Probeer alles uit met een ingebouwde ECoS, zonder centrale.</Text>
        </View>
        <Button title={mode === 'demo' && connected ? 'Actief' : 'Start demo'} kind="tinted" small disabled={mode === 'demo' && connected} onPress={() => connect('demo')} />
      </Panel>

      {connected || busy ? <Button title="Verbinding verbreken" icon="close" kind="ghost" onPress={() => disconnect()} style={{ alignSelf: 'flex-start' }} /> : null}

      <Text style={{ color: C.muted, fontSize: 13, lineHeight: 19 }}>
        Zet de iPad op hetzelfde netwerk als de ECoS. Vraagt iOS om toegang tot het lokale netwerk, kies dan Sta toe. De app praat met de ECoS via TCP-poort 15471.
      </Text>

      {editing ? <ProfileSheet profile={editing} onClose={() => setEditing(null)} /> : null}
      <ConfirmDialog
        visible={!!removing}
        title={`${removing?.name ?? 'Centrale'} verwijderen?`}
        message="Alleen het profiel in deze app wordt verwijderd. Op de ECoS verandert niets."
        confirmText="Verwijderen"
        danger
        onCancel={() => setRemoving(null)}
        onConfirm={() => {
          const r = removing;
          setRemoving(null);
          if (!r) return;
          const profiles = s.profiles.filter((p) => p.id !== r.id);
          s.set({ profiles, activeProfileId: s.activeProfileId === r.id ? profiles[0].id : s.activeProfileId });
        }}
      />
    </ScrollView>
  );
}
