import { router } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import {
  COVERS_DIR,
  ensureCoversDir,
  isRemoteCover,
  resolveCoverUri,
} from '@/lib/covers';

export { COVERS_DIR, ensureCoversDir } from '@/lib/covers';

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

function extFromUrl(url: string): string {
  const clean = url.split('?')[0].split('#')[0].toLowerCase();
  const m = clean.match(/\.(jpe?g|png|webp|gif)$/);
  return m ? `.${m[1].replace('jpeg', 'jpg')}` : '.jpg';
}

// 이미지를 covers 폴더에 내려받고, DB에 저장할 "파일명"을 반환한다.
export async function downloadImageToLocal(url: string): Promise<string> {
  await ensureCoversDir();
  const filename = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}${extFromUrl(url)}`;
  const dest = COVERS_DIR + filename;
  const result = await FileSystem.downloadAsync(url, dest);
  if (result.status !== 200) {
    throw new Error(`다운로드 실패 (status ${result.status})`);
  }
  return filename;
}

// 저장된 표지 값(파일명 또는 예전 절대경로)을 받아 실제 파일을 삭제한다.
export async function deleteLocalImage(stored: string): Promise<void> {
  if (!stored || isRemoteCover(stored)) return;
  const uri = resolveCoverUri(stored);
  if (!uri) return;
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {}
}
