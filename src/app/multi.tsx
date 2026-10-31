import React from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { NotConnected } from '../components/Chrome';
import { CompactThrottle } from '../components/Throttles';
import { usePhone } from '../lib/layout';
import { useEcos } from '../store/ecos';
import { useScrollEnabled } from '../store/ui';

/** Multi-weergave: 10 locs. Tablet: 2 rijen van 5. Telefoon staand: 5 rijen van 2 om door te scrollen. */
export default function MultiScreen() {
  const conn = useEcos((s) => s.conn);
  const scrollEnabled = useScrollEnabled();
  const { width, height } = useWindowDimensions();
  const phone = usePhone();
  const dense = height < 1100; // liggend: geen foto's, zodat beide rijen passen
  if (conn !== 'connected') return <NotConnected />;
  const perRow = width < 600 ? 2 : 5;
  const rows = Array.from({ length: 10 / perRow }, (_, r) => r);
  const pad = phone ? 8 : 20;
  return (
    <ScrollView scrollEnabled={scrollEnabled} contentContainerStyle={{ flexGrow: 1, paddingHorizontal: pad, paddingBottom: pad, gap: phone ? 8 : 10 }}>
      {rows.map((row) => (
        <View key={row} style={{ flex: phone ? undefined : 1, minHeight: phone ? 400 : dense ? 360 : 460, flexDirection: 'row', gap: phone ? 8 : 10 }}>
          {Array.from({ length: perRow }, (_, col) => (
            <CompactThrottle key={col} slot={row * perRow + col} dense={dense} />
          ))}
        </View>
      ))}
    </ScrollView>
  );
}
