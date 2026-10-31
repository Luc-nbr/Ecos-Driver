import { Platform } from 'react-native';

/** Hoe we het toestel noemen in teksten: op iOS de iPad, op Android het toestel (tablet of telefoon). */
export const DEVICE = Platform.OS === 'android' ? 'toestel' : 'iPad';

/** Met lidwoord: "de iPad" of "het toestel". */
export const THE_DEVICE = Platform.OS === 'android' ? 'het toestel' : 'de iPad';

/** Uitleg over de toestemming voor het lokale netwerk, per platform. */
export const LOCAL_NETWORK_HINT =
  Platform.OS === 'android'
    ? 'Vraagt Android om toegang tot het lokale netwerk of apparaten in de buurt, kies dan Sta toe.'
    : 'Vraagt iOS om toegang tot het lokale netwerk, kies dan Sta toe.';
