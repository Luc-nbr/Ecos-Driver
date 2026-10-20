// Live ECoS-scherm via VNC: beeld tonen en aanraken doorgeven als klikken.
import { router } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, PanResponder, Text, View } from 'react-native';
import { useEcos } from '../store/ecos';
import { useActiveProfile } from '../store/settings';
import { useScrollLock } from '../store/ui';
import { C, F, R } from '../theme';
import { framebufferToBmp, RfbClient, RfbStatus } from '../vnc/rfb';
import { SimVncTransport } from '../vnc/sim';
import { TcpBinaryTransport } from '../vnc/tcpBinary';
import { Icon } from './Icon';
import { Button, Pill } from './ui';

export function VncView({ maxHeight }: { maxHeight: number }) {
  const mode = useEcos((s) => s.mode);
  const profile = useActiveProfile();
  const host = profile.host;
  const port = profile.vncPort ?? 5900;
  const password = profile.vncPassword ?? '';
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<RfbStatus>('connecting');
  const [error, setError] = useState<string | null>(null);
  const [size, setSize] = useState({ w: 800, h: 480 });
  const [shown, setShown] = useState<string | null>(null);
  const [next, setNext] = useState<string | null>(null);
  const [boxW, setBoxW] = useState(0);
  const client = useRef<RfbClient | null>(null);
  const dirty = useRef(false);
  const busy = useRef(false);

  // verbinden (opnieuw bij ander profiel, andere modus of "Opnieuw")
  useEffect(() => {
    const transport = mode === 'demo' ? new SimVncTransport() : new TcpBinaryTransport(host, port);
    const c = new RfbClient(transport, mode === 'demo' ? '' : password);
    client.current = c;
    setStatus('connecting');
    setError(null);
    setShown(null);
    setNext(null);
    c.onStatus = (s) => {
      setStatus(s);
      setError(c.error);
    };
    c.onResize = (w, h) => setSize({ w, h });
    c.onUpdate = () => {
      dirty.current = true;
    };
    c.connect();
    // beeld hooguit ~8 keer per seconde opnieuw opbouwen, en nooit twee tegelijk
    const timer = setInterval(() => {
      if (!dirty.current || busy.current || !c.width) return;
      dirty.current = false;
      busy.current = true;
      setNext(framebufferToBmp(c.fb, c.width, c.height));
    }, 120);
    return () => {
      clearInterval(timer);
      c.onStatus = () => {};
      c.close();
      client.current = null;
      busy.current = false;
    };
  }, [mode, host, port, password, attempt]);

  // weergavegrootte: zo breed mogelijk, maar niet hoger dan maxHeight
  const scale = boxW ? Math.min(boxW / size.w, maxHeight / size.h) : 0;
  const dispW = size.w * scale;
  const dispH = size.h * scale;

  const view = useRef<React.ComponentRef<typeof View>>(null);
  const scrollLock = useScrollLock();
  const origin = useRef({ x: 0, y: 0, s: 1 });
  origin.current.s = scale;
  const responder = useMemo(() => {
    const map = (px: number, py: number) => {
      const o = origin.current;
      return [(px - o.x) / (o.s || 1), (py - o.y) / (o.s || 1)] as const;
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        const { pageX, pageY } = e.nativeEvent;
        view.current?.measureInWindow((x, y) => {
          origin.current.x = x;
          origin.current.y = y;
          const [fx, fy] = map(pageX, pageY);
          client.current?.pointer(fx, fy, true);
        });
      },
      onPanResponderMove: (e) => {
        const [fx, fy] = map(e.nativeEvent.pageX, e.nativeEvent.pageY);
        client.current?.pointer(fx, fy, true);
      },
      onPanResponderRelease: (e) => {
        const [fx, fy] = map(e.nativeEvent.pageX, e.nativeEvent.pageY);
        client.current?.pointer(fx, fy, false);
      },
      onPanResponderTerminate: (e) => {
        const [fx, fy] = map(e.nativeEvent.pageX, e.nativeEvent.pageY);
        client.current?.pointer(fx, fy, false);
      },
    });
  }, []);

  const statusText =
    status === 'connected' ? `Live · ${size.w}×${size.h}` : status === 'connecting' ? 'Verbinden…' : status === 'error' ? 'Geen verbinding' : 'Verbroken';
  const statusColor = status === 'connected' ? C.green : status === 'connecting' ? C.accent : C.red;

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Pill text={statusText} color={statusColor} />
        <Text style={{ color: C.muted, fontSize: 14, flex: 1 }} numberOfLines={1}>
          {mode === 'demo' ? 'Demo-scherm (nagebouwde VNC-server)' : `${host}:${port}`}
        </Text>
        <Button title="Opnieuw verbinden" icon="refresh" small kind="tinted" onPress={() => setAttempt((a) => a + 1)} />
      </View>

      <View onLayout={(e) => setBoxW(e.nativeEvent.layout.width)} style={{ alignItems: 'center' }}>
        <View
          ref={view}
          {...(status === 'connected' ? responder.panHandlers : {})}
          onTouchStart={scrollLock.onTouchStart}
          onTouchEnd={scrollLock.onTouchEnd}
          onTouchCancel={scrollLock.onTouchCancel}
          accessibilityLabel="ECoS-scherm via VNC. Tik om te bedienen."
          style={{ width: dispW || '100%', height: dispH || 300, borderRadius: R.md, overflow: 'hidden', backgroundColor: '#000', borderWidth: 6, borderColor: '#111' }}
        >
          {shown ? <Image source={{ uri: shown }} style={{ width: '100%', height: '100%' }} resizeMode="stretch" fadeDuration={0} /> : null}
          {next && next !== shown ? (
            <Image
              source={{ uri: next }}
              style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}
              fadeDuration={0}
              onLoad={() => {
                setShown(next);
                busy.current = false;
              }}
              onError={() => {
                busy.current = false;
              }}
            />
          ) : null}
          {status !== 'connected' ? (
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 10, backgroundColor: 'rgba(0,0,0,0.65)' }}>
              {status === 'connecting' ? <ActivityIndicator color="#fff" /> : <Icon name="warning" size={30} color="#FF453A" />}
              <Text style={{ color: '#fff', fontSize: 17, fontWeight: F.semi, textAlign: 'center' }}>
                {status === 'connecting' ? 'Verbinden met het ECoS-scherm…' : error || 'De VNC-verbinding is verbroken'}
              </Text>
              {status !== 'connecting' ? (
                <Text style={{ color: '#D1D1D6', fontSize: 14, textAlign: 'center', maxWidth: 460 }}>
                  Controleer of de VNC-server op de ECoS aan staat en welke poort en welk wachtwoord hij gebruikt (meestal poort 5900). Die stel je in bij Centrales.
                </Text>
              ) : null}
              {status !== 'connecting' ? (
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                  <Button title="Opnieuw" icon="refresh" small kind="primary" onPress={() => setAttempt((a) => a + 1)} />
                  {mode !== 'demo' ? <Button title="VNC-instellingen" icon="settings" small onPress={() => router.navigate('/centrales')} /> : null}
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
      <Text style={{ color: C.muted, fontSize: 13 }}>
        Tik op het scherm om te bedienen; slepen werkt ook (bijv. schuifregelaars op de ECoS). De draaiknoppen en STOP/GO van het apparaat zelf vind je bij Nagebouwd.
      </Text>
    </View>
  );
}
