import type { IconName } from '../components/Icon';

// ECoS functiesymbolen (uit de ESU PC-interface specificatie, tabel 8.2)
// vertaald naar een icoon en een Nederlands label.
const EXACT: Record<number, { icon: IconName; label: string }> = {
  2: { icon: 'more', label: 'Functie' },
  3: { icon: 'headlight', label: 'Frontseinen' },
  4: { icon: 'headlight', label: 'Licht voor' },
  5: { icon: 'taillight', label: 'Licht achter' },
  7: { icon: 'sound', label: 'Geluid' },
  8: { icon: 'sound', label: 'Muziek' },
  9: { icon: 'speaker', label: 'Omroep' },
  10: { icon: 'shunting', label: 'Rangeerstand' },
  11: { icon: 'gauge', label: 'Optrekvertraging uit' },
  32: { icon: 'coupling', label: 'Koppeling' },
  33: { icon: 'steam', label: 'Stoom' },
  34: { icon: 'pantograph', label: 'Pantograaf' },
  35: { icon: 'headlight', label: 'Grootlicht' },
  36: { icon: 'bell', label: 'Bel' },
  37: { icon: 'horn', label: 'Tyfoon' },
  38: { icon: 'horn', label: 'Fluit' },
  39: { icon: 'door', label: 'Deuren' },
  40: { icon: 'fan', label: 'Ventilatoren' },
  42: { icon: 'sound', label: 'Kolen scheppen' },
  44: { icon: 'shunting', label: 'Schakelen' },
  260: { icon: 'light', label: 'Cabinelicht' },
  261: { icon: 'light', label: 'Nummerverlichting' },
  263: { icon: 'brake', label: 'Remgeluid' },
  299: { icon: 'arrowUp', label: 'Kraan' },
  555: { icon: 'coupling', label: 'Haak' },
  773: { icon: 'light', label: 'Wielverlichting' },
  811: { icon: 'refresh', label: 'Draaien' },
  1031: { icon: 'steam', label: 'Stoom afblazen' },
  1033: { icon: 'speaker', label: 'Radio' },
  1287: { icon: 'coupling', label: 'Koppelgeluid' },
  1543: { icon: 'track', label: 'Railgeluid' },
  1607: { icon: 'arrowUp', label: 'Notch omhoog' },
  1608: { icon: 'arrowDown', label: 'Notch omlaag' },
  2055: { icon: 'horn', label: 'Fluit' },
  3847: { icon: 'sound', label: 'Buffergeluid' },
};

/** Keuzelijst voor het bewerken van functies in de bibliotheek. */
export const FUNCTION_ICON_CHOICES: IconName[] = [
  'headlight', 'taillight', 'light', 'horn', 'sound', 'speaker', 'bell', 'fan', 'compressor', 'pantograph',
  'coupling', 'driver', 'cabin', 'door', 'shunting', 'brake', 'steam', 'smoke', 'snow', 'gauge', 'more',
];

export function describeSymbol(symbol: number | undefined, n: number): { icon: IconName; label: string } {
  if (symbol !== undefined && symbol > 0) {
    if (EXACT[symbol]) return EXACT[symbol];
    const low = symbol & 0xff;
    if (EXACT[low]) return EXACT[low];
  }
  if (n === 0) return { icon: 'headlight', label: 'Licht' };
  return { icon: 'more', label: `Functie ${n}` };
}
