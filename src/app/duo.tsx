import React from 'react';
import { ScrollView, View } from 'react-native';
import { NotConnected } from '../components/Chrome';
import { LiveStatusPanel } from '../components/Panels';
import { DuoThrottle } from '../components/Throttles';
import { useEcos } from '../store/ecos';

export default function DuoScreen() {
  const conn = useEcos((s) => s.conn);
  if (conn !== 'connected') return <NotConnected />;
  return (
    <ScrollView contentContainerStyle={{ padding: 18, gap: 16 }}>
      <View style={{ flexDirection: 'row', gap: 16 }}>
        <DuoThrottle slot={0} />
        <DuoThrottle slot={1} />
      </View>
      <LiveStatusPanel />
    </ScrollView>
  );
}
