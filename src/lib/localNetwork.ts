import { PermissionsAndroid, Platform } from 'react-native';

/** Vanaf Android 17 (API 37) mag een app alleen met toestemming het lokale netwerk op. */
const FIRST_ENFORCED_SDK = 37;

let asked: Promise<void> | null = null;

/**
 * Vraagt op Android 17+ eenmalig toestemming voor het lokale netwerk (de ECoS).
 * Weigert de gebruiker, dan proberen we toch te verbinden: de foutmelding van de socket legt het verder uit.
 */
export function ensureLocalNetworkAccess(): Promise<void> {
  if (Platform.OS !== 'android' || (Platform.Version as number) < FIRST_ENFORCED_SDK) return Promise.resolve();
  if (!asked) {
    asked = (async () => {
      const perm = PermissionsAndroid.PERMISSIONS.ACCESS_LOCAL_NETWORK;
      if (!perm || (await PermissionsAndroid.check(perm))) return;
      const result = await PermissionsAndroid.request(perm, {
        title: 'Toegang tot het lokale netwerk',
        message: 'ECoS Driver maakt verbinding met je ESU ECoS in het lokale netwerk om je treinen te besturen.',
        buttonPositive: 'Sta toe',
        buttonNegative: 'Niet nu',
      });
      // Bij weigeren later opnieuw kunnen vragen.
      if (result !== PermissionsAndroid.RESULTS.GRANTED) asked = null;
    })().catch(() => {
      asked = null;
    });
  }
  return asked ?? Promise.resolve();
}
