import React from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { NotConnected, useCompactSidebar } from '../components/Chrome';
import { CompactThrottle } from '../components/Throttles';
import { useEcos } from '../store/ecos';

/** Multi-weergave: 2 rijen van 5 locs, 10 in totaal. */
export default function MultiScreen() {
  const conn = useEcos((s) => s.conn);
  const { width, height } = useWindowDimensions();
  const compactSidebar = useCompactSidebar();
  const contentW = width - (compactSidebar ? 92 : 250);
  const dense = height < 1100; // liggend: geen foto's, zodat beide rijen passen
  const wheelSize = Math.max(104, Math.min(dense ? 150 : 160, (contentW - 40 - 40) / 5 - 22));
  if (conn !== 'connected') return <NotConnected />;
  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingBottom: 20, gap: 10 }}>
      {[0, 1].map((row) => (
        <View key={row} style={{ flex: 1, minHeight: dense ? 360 : 460, flexDirection: 'row', gap: 10 }}>
          {[0, 1, 2, 3, 4].map((col) => (
            <CompactThrottle key={col} slot={row * 5 + col} dense={dense} wheelSize={wheelSize} />
          ))}
        </View>
      ))}
    </ScrollView>
  );
}
