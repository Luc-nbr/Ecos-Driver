import { useWindowDimensions } from 'react-native';

/** Kortste schermkant waaronder we de telefoonindeling gebruiken (tablets zijn minstens ~600 breed). */
const PHONE_MAX = 600;

/** Telefoon (staand of liggend): tabbalk onderin, compacte bovenbalk en smallere schermen. */
export function usePhone() {
  const { width, height } = useWindowDimensions();
  return Math.min(width, height) < PHONE_MAX;
}

/** Zijmarge van de schermen: op een telefoon smaller. */
export function useGutter() {
  return usePhone() ? 12 : 24;
}
