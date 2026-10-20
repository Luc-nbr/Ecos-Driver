import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { AppState, View, useColorScheme } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Sidebar, ToastHost, TopBar } from '../components/Chrome';
import { connect, onAppActive } from '../store/actions';
import { useEcos } from '../store/ecos';
import { useSettings } from '../store/settings';
import { applyTheme, C } from '../theme';

function useHydrated() {
  const [done, setDone] = useState(useSettings.persist.hasHydrated());
  useEffect(() => {
    const unsub = useSettings.persist.onFinishHydration(() => setDone(true));
    if (useSettings.persist.hasHydrated()) setDone(true);
    return unsub;
  }, []);
  return done;
}

export default function RootLayout() {
  const hydrated = useHydrated();
  const keepAwake = useSettings((s) => s.keepAwake);
  const themePref = useSettings((s) => s.theme) ?? 'auto';
  const system = useColorScheme();
  const theme = themePref === 'auto' ? (system === 'light' ? 'light' : 'dark') : themePref;
  // kleuren bijwerken vóór het tekenen; de key hieronder tekent alles opnieuw
  applyTheme(theme);
  const connected = useEcos((s) => s.conn === 'connected');

  // bij openen automatisch verbinden met de laatst gebruikte ECoS
  useEffect(() => {
    if (!hydrated) return;
    const { autoConnect, lastMode } = useSettings.getState();
    if (autoConnect && lastMode && useEcos.getState().conn === 'disconnected') connect(lastMode);
  }, [hydrated]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => st === 'active' && onAppActive());
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const tag = 'ecos-driver';
    if (keepAwake && connected) activateKeepAwakeAsync(tag).catch(() => {});
    else deactivateKeepAwake(tag).catch(() => {});
  }, [keepAwake, connected]);

  return (
    <SafeAreaProvider>
      <StatusBar style={theme === 'light' ? 'dark' : 'light'} />
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'left', 'right', 'bottom']}>
        <View key={theme} style={{ flex: 1, flexDirection: 'row' }}>
          <Sidebar />
          <View style={{ flex: 1 }}>
            <TopBar />
            <View style={{ flex: 1 }}>{hydrated ? <Slot /> : null}</View>
          </View>
        </View>
        <ToastHost />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
