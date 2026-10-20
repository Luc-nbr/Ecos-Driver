// Panelen die op meerdere schermen terugkomen: tellers, wissels en rijwegen.
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { switchAccessory } from '../store/actions';
import { useEcos } from '../store/ecos';
import { C, F, R } from '../theme';
import { Icon, IconName } from './Icon';
import { Panel, SectionTitle } from './ui';

/** Klein telvak zoals bovenaan ECoS CAB, maar rustiger. */
export function StatTile({ value, label, icon, color = C.text, onPress }: { value: string; label: string; icon: IconName; color?: string; onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${value} ${label}`}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        { flex: 1, minWidth: 140, backgroundColor: C.panel, borderRadius: R.lg, padding: 16, gap: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border },
        pressed ? { opacity: 0.8 } : null,
      ]}
    >
      <Icon name={icon} size={20} color={color === C.text ? C.muted : color} />
      <Text style={{ color, fontSize: 34, fontWeight: F.bold, fontVariant: ['tabular-nums'] }}>{value}</Text>
      <Text style={{ color: C.muted, fontSize: 15, fontWeight: F.medium }}>{label}</Text>
    </Pressable>
  );
}

function TurnoutGlyph({ state, route }: { state: number; route: boolean }) {
  if (route) return <Icon name="route" size={26} color={C.accent} />;
  return (
    <Svg width={34} height={24} viewBox="0 0 56 40">
      <Path d="M4 32 H52" stroke={state === 0 ? C.accent : C.inactiveLine} strokeWidth={5} strokeLinecap="round" fill="none" />
      <Path d="M4 32 C24 32 32 10 52 6" stroke={state !== 0 ? C.accent : C.inactiveLine} strokeWidth={5} strokeLinecap="round" fill="none" />
    </Svg>
  );
}

export function accessoryStateText(type: string, state: number) {
  if (type === 'ROUTE') return 'Rijweg';
  return state === 0 ? 'Rechtdoor' : state === 1 ? 'Afbuigend' : `Stand ${state}`;
}

/** Eén wissel of rijweg als rij; tik om te schakelen. */
export function AccessoryRow({ id, last }: { id: number; last?: boolean }) {
  const a = useEcos((s) => s.accessories[id]);
  if (!a) return null;
  const route = a.type === 'ROUTE';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${a.name} schakelen`}
      onPress={() => switchAccessory(id)}
      style={({ pressed }) => [
        { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, minHeight: 56 },
        !last ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border } : null,
        pressed ? { backgroundColor: C.panel2 } : null,
      ]}
    >
      <View style={{ width: 40, alignItems: 'center' }}>
        <TurnoutGlyph state={a.state} route={route} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: C.text, fontSize: 16, fontWeight: F.medium }} numberOfLines={1}>
          {a.name}
        </Text>
        {a.name2 ? (
          <Text style={{ color: C.muted, fontSize: 13 }} numberOfLines={1}>
            {a.name2}
          </Text>
        ) : null}
      </View>
      <Text style={{ color: C.muted, fontSize: 14 }}>{a.addr ? `Adres ${a.addr}` : ''}</Text>
      <View style={{ minWidth: 96, alignItems: 'flex-end' }}>
        <View style={{ paddingHorizontal: 10, height: 28, borderRadius: 14, justifyContent: 'center', backgroundColor: route ? C.accentSoft : C.panel2 }}>
          <Text style={{ color: route ? C.accent : C.textSoft, fontSize: 13, fontWeight: F.semi }}>{route ? 'Instellen' : accessoryStateText(a.type, a.state)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

/** Rijwegen en wissels als horizontale strook (overzicht). */
export function RoutesPanel() {
  const ids = useEcos((s) => s.accessoryIds);
  const acc = useEcos((s) => s.accessories);
  return (
    <Panel>
      <SectionTitle title="Rijwegen en wissels" right={<Text style={{ color: C.muted, fontSize: 14 }}>Tik om te schakelen</Text>} />
      {ids.length === 0 ? (
        <Text style={{ color: C.muted, fontSize: 15 }}>Er staan geen wissels of rijwegen in de ECoS.</Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
          {ids.map((id) => {
            const a = acc[id];
            const route = a.type === 'ROUTE';
            return (
              <Pressable
                key={id}
                accessibilityRole="button"
                accessibilityLabel={`${a.name}: ${accessoryStateText(a.type, a.state)}`}
                onPress={() => switchAccessory(id)}
                style={({ pressed }) => [
                  { width: 170, borderRadius: 14, backgroundColor: C.panel2, padding: 14, gap: 10 },
                  pressed ? { opacity: 0.75 } : null,
                ]}
              >
                <TurnoutGlyph state={a.state} route={route} />
                <View>
                  <Text style={{ color: C.text, fontSize: 15, fontWeight: F.semi }} numberOfLines={1}>
                    {a.name}
                  </Text>
                  <Text style={{ color: C.muted, fontSize: 13 }} numberOfLines={1}>
                    {route ? 'Rijweg instellen' : accessoryStateText(a.type, a.state)}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </Panel>
  );
}
