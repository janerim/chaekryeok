import { router } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';

type Resolver = (path: string | null) => void;

let pending: Resolver | null = null;

export function pickWebImage(query?: string): Promise<string | null> {
  return new Promise((resolve) => {
    pending = resolve;
    router.push({
      pathname: '/image-search',
      params: query ? { q: query } : {},
    });
  });
}

export function resolveWebImagePick(path: string | null) {
  const fn = pending;
  pending = null;
  if (fn) fn(path);
}

const COVERS_DIR = FileSystem.documentDirectory + 'covers/';

export async function ensureCoversDir() {
  const info = await FileSystem.getInfoAsync(COVERS_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(COVERS_DIR, { intermediates: true });
  }
}

function extFromUrl(url: string): string {
  const clean = url.split('?')[0].split('#')[0].toLowerCase();
  const m = clean.match(/\.(jpe?g|png|webp|gif)$/);
  return m ? `.${m[1].replace('jpeg', 'jpg')}` : '.jpg';
}

export async function downloadImageToLocal(url: string): Promise<string> {
  await ensureCoversDir();
  const filename = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}${extFromUrl(url)}`;
  const dest = COVERS_DIR + filename;
  const result = await FileSystem.downloadAsync(url, dest);
  if (result.status !== 200) {
    throw new Error(`다운로드 실패 (status ${result.status})`);
  }
  return result.uri;
}

export async function deleteLocalImage(uri: string): Promise<void> {
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {}
}
