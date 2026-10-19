import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

/** Laat de gebruiker een foto kiezen of maken en bewaar die blijvend in de app. */
export async function pickLocoPhoto(source: 'library' | 'camera'): Promise<string | null> {
  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) throw new Error('Geen toegang tot de camera. Sta dit toe in Instellingen.');
  } else if (Platform.OS !== 'web') {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) throw new Error('Geen toegang tot je foto’s. Sta dit toe in Instellingen.');
  }
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: true, aspect: [16, 9], quality: 0.8 };
  const res = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (res.canceled || !res.assets?.length) return null;
  const uri = res.assets[0].uri;
  if (Platform.OS === 'web') return uri;
  // kopiëren naar de documentenmap, want de cache kan worden opgeruimd
  const dir = new Directory(Paths.document, 'loc-fotos');
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  const ext = uri.split('.').pop()?.split('?')[0] || 'jpg';
  const dest = new File(dir, `loc-${Date.now()}.${ext}`);
  await new File(uri).copy(dest);
  return dest.uri;
}

export function deleteLocoPhoto(uri?: string) {
  if (!uri || Platform.OS === 'web' || !uri.includes('loc-fotos')) return;
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {
    // niet erg als het opruimen mislukt
  }
}
