import React from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { NotConnected } from '../components/Chrome';
import { CompactThrottle, DuoThrottle } from '../components/Throttles';
import { useGutter } from '../lib/layout';
import { useEcos } from '../store/ecos';
import { useScrollEnabled } from '../store/ui';

export default function DuoScreen() {
  const conn = useEcos((s) => s.conn);
  const scrollEnabled = useScrollEnabled();
  const { width } = useWindowDimensions();
  const gutter = useGutter();
  if (conn !== 'connected') return <NotConnected />;
  // telefoon staand: twee compacte regelaars naast elkaar over de hele hoogte
  if (width < 600) {
    return (
      <View style={{ flex: 1, flexDirection: 'row', gap: 8, paddingHorizontal: 8, paddingBottom: 8 }}>
        <CompactThrottle kind="duo" slot={0} />
        <CompactThrottle kind="duo" slot={1} />
      </View>
    );
  }
  return (
    <ScrollView scrollEnabled={scrollEnabled} contentContainerStyle={{ paddingHorizontal: gutter, paddingBottom: gutter }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: gutter === 24 ? 16 : 10 }}>
        <DuoThrottle slot={0} />
        <DuoThrottle slot={1} />
      </View>
    </ScrollView>
  );
}
