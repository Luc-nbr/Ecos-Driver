import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Platform } from 'react-native';
import { useScrollLock } from '../store/ui';

// op web: slepen met de muis mag geen tekst selecteren (dat breekt de veeg af)
export const NO_SELECT = (Platform.OS === 'web' ? { userSelect: 'none' } : {}) as object;

/**
 * Eindeloos scrollen voor gas: positief = meer gas. Bij max (of 0) geeft verder
 * scrollen niets meer en wordt er niets opgespaard; zodra je terugdraait neemt
 * het gas meteen af. `offset` loopt mee met de vinger zodat het wiel draait.
 */
export function useGasScroll({
  value,
  max,
  onChange,
  disabled,
  pxPerStep,
  axis = 'both',
  hapticEvery = 6,
}: {
  value: number;
  max: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  pxPerStep: number;
  /** 'vertical': alleen omhoog/omlaag; 'both': ook naar rechts telt als meer gas. */
  axis?: 'vertical' | 'both';
  hapticEvery?: number;
}) {
  const [offset, setOffset] = useState(0);
  const off = useRef(0);
  const acc = useRef(0);
  const val = useRef(value);
  const lastEmitted = useRef(value);
  const atEnd = useRef(false);
  const cb = useRef(onChange);
  cb.current = onChange;
  const dis = useRef(disabled);
  dis.current = disabled;
  const cfg = useRef({ max, pxPerStep, axis, hapticEvery });
  cfg.current = { max, pxPerStep, axis, hapticEvery };
  const scrollLock = useScrollLock();
  const releaseLock = useRef(scrollLock.release);
  releaseLock.current = scrollLock.release;

  // waarde van buitenaf veranderd (stop, rem, ECoS)
  useEffect(() => {
    if (value === lastEmitted.current) return;
    lastEmitted.current = value;
    val.current = value;
    acc.current = 0;
  }, [value]);
  useEffect(() => () => releaseLock.current(), []);

  /** Scroll d pixels (positief = meer gas). */
  const scroll = (d: number) => {
    const { max: m, pxPerStep: px, hapticEvery: every } = cfg.current;
    if (dis.current || d === 0) return;
    const v = Math.min(val.current, m);
    if ((v >= m && d > 0) || (v <= 0 && d < 0)) {
      // aan het eind: niets meer doen, en niets opsparen
      acc.current = 0;
      if (!atEnd.current && Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      atEnd.current = true;
      return;
    }
    atEnd.current = false;
    off.current += d;
    setOffset(off.current);
    acc.current += d / px;
    const steps = acc.current > 0 ? Math.floor(acc.current) : Math.ceil(acc.current);
    if (steps === 0) return;
    acc.current -= steps;
    const next = Math.max(0, Math.min(m, v + steps));
    if (next === v) return;
    if (Platform.OS !== 'web' && Math.floor(next / every) !== Math.floor(v / every)) Haptics.selectionAsync().catch(() => {});
    val.current = next;
    lastEmitted.current = next;
    cb.current(next);
  };
  const scrollRef = useRef(scroll);
  scrollRef.current = scroll;

  const responder = useMemo(() => {
    let last = { x: 0, y: 0 };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => !dis.current,
      onStartShouldSetPanResponderCapture: () => !dis.current,
      onMoveShouldSetPanResponder: () => !dis.current,
      onMoveShouldSetPanResponderCapture: () => !dis.current,
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: () => {
        last = { x: 0, y: 0 };
        atEnd.current = false;
      },
      onPanResponderMove: (_, g) => {
        // omhoog (en bij 'both' ook naar rechts) is meer gas
        const dy = -(g.dy - last.y);
        const dx = cfg.current.axis === 'both' ? g.dx - last.x : 0;
        last = { x: g.dx, y: g.dy };
        scrollRef.current(dx + dy);
      },
      onPanResponderRelease: () => releaseLock.current(),
      onPanResponderTerminate: () => releaseLock.current(),
    });
  }, []);

  const handlers = {
    ...responder.panHandlers,
    onTouchStart: scrollLock.onTouchStart,
    onTouchEnd: scrollLock.onTouchEnd,
    onTouchCancel: scrollLock.onTouchCancel,
    // muiswiel / trackpad op web
    ...(Platform.OS === 'web'
      ? {
          onWheel: (e: { deltaY: number; nativeEvent?: { deltaY: number } }) => {
            scrollRef.current(-(e.nativeEvent?.deltaY ?? e.deltaY) * 0.5);
          },
        }
      : {}),
  };
  return { offset, handlers, scroll };
}
