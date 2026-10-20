import React from 'react';
import { ScrollView, View } from 'react-native';
import { NotConnected } from '../components/Chrome';
import { DuoThrottle } from '../components/Throttles';
import { useEcos } from '../store/ecos';
import { useScrollEnabled } from '../store/ui';

export default function DuoScreen() {
  const conn = useEcos((s) => s.conn);
  const scrollEnabled = useScrollEnabled();
  if (conn !== 'connected') return <NotConnected />;
  return (
    <ScrollView scrollEnabled={scrollEnabled} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 16 }}>
        <DuoThrottle slot={0} />
        <DuoThrottle slot={1} />
      </View>
    </ScrollView>
  );
}
