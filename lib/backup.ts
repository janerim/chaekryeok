import * as FileSystem from 'expo-file-system/legacy';
import { format } from 'date-fns';
import {
  getDB,
  insertBook,
  insertWishlist,
  listBooks,
  listWishlist,
  type Book,
  type BookInput,
  type Wishlist,
  type WishlistInput,
} from '@/db/database';
import {
  COVERS_DIR,
  ensureCoversDir,
  isRemoteCover,
  resolveCoverUri,
} from '@/lib/covers';

// 백업/복원 시 표지 이미지 데이터를 함께 담기 위한 필드
type WithCover<T> = T & { cover_b64?: string | null };

export type BackupFile = {
  version: 3;
  app: 'chaengnyeok';
  exportedAt: string;
  books: WithCover<Book>[];
  wishlist: WithCover<Wishlist>[];
};

// 저장된 표지의 실제 파일을 읽어 base64로 붙인다. (원격 URL/파일 없음이면 생략)
export type ProgressFn = (done: number, total: number) => void;

async function attachCoverData<T extends { cover_local_path: string | null }>(
  rows: T[],
  onItem?: () => void
): Promise<WithCover<T>[]> {
  const out: WithCover<T>[] = [];
  for (const r of rows) {
    let cover_b64: string | null = null;
    const uri = resolveCoverUri(r.cover_local_path);
    if (uri && !isRemoteCover(uri)) {
      try {
        const info = await FileSystem.getInfoAsync(uri);
        if (info.exists) {
          cover_b64 = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
        }
      } catch {}
    }
    out.push({ ...r, cover_b64 });
    onItem?.();
  }
  return out;
}

function extOf(name: string | null | undefined): string {
  const m = (name ?? '').toLowerCase().match(/\.(jpe?g|png|webp|gif)$/);
  return m ? `.${m[1].replace('jpeg', 'jpg')}` : '.jpg';
}

// 백업에 담긴 base64 이미지를 새 파일로 복원하고 파일명을 돌려준다.
async function restoreCoverData(
  b64: string | null | undefined,
  originalPath: string | null
): Promise<string | null> {
  if (!b64) return originalPath;
  await ensureCoversDir();
  const filename = `${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 8)}${extOf(originalPath)}`;
  try {
    await FileSystem.writeAsStringAsync(COVERS_DIR + filename, b64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return filename;
  } catch {
    return originalPath;
  }
}

export async function buildBackupJson(onProgress?: ProgressFn): Promise<{
  json: string;
  path: string;
}> {
  const [books, wishlist] = await Promise.all([listBooks(), listWishlist()]);
  const total = books.length + wishlist.length;
  let done = 0;
  onProgress?.(0, total);
  const tick = () => {
    done += 1;
    onProgress?.(done, total);
  };
  const [booksWithCover, wishlistWithCover] = await Promise.all([
    attachCoverData(books, tick),
    attachCoverData(wishlist, tick),
  ]);
  const payload: BackupFile = {
    version: 3,
    app: 'chaengnyeok',
    exportedAt: new Date().toISOString(),
    books: booksWithCover,
    wishlist: wishlistWithCover,
  };
  const json = JSON.stringify(payload, null, 2);
  const filename = `chaengnyeok_backup_${format(new Date(), 'yyyyMMdd_HHmmss')}.json`;
  const path = FileSystem.documentDirectory + filename;
  await FileSystem.writeAsStringAsync(path, json);
  return { json, path };
}

export function parseBackupJson(raw: string): BackupFile {
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('올바른 JSON 형식이 아닙니다.');
  }
  if (!parsed || parsed.app !== 'chaengnyeok') {
    throw new Error('책력 백업 파일이 아닙니다.');
  }
  if (parsed.version !== 1 && parsed.version !== 2 && parsed.version !== 3) {
    throw new Error(`지원하지 않는 버전입니다 (v${parsed.version}).`);
  }
  if (!Array.isArray(parsed.books)) {
    throw new Error('books 배열을 찾을 수 없습니다.');
  }
  const wishlist = Array.isArray(parsed.wishlist) ? parsed.wishlist : [];
  return {
    version: 3,
    app: 'chaengnyeok',
    exportedAt: parsed.exportedAt ?? new Date().toISOString(),
    books: parsed.books,
    wishlist,
  };
}

export async function wipeAllData(): Promise<void> {
  const db = await getDB();
  const coversDir = FileSystem.documentDirectory + 'covers/';
  try {
    const info = await FileSystem.getInfoAsync(coversDir);
    if (info.exists) {
      await FileSystem.deleteAsync(coversDir, { idempotent: true });
    }
  } catch {}
  await db.runAsync('DELETE FROM books');
  try {
    await db.runAsync('DELETE FROM wishlist');
  } catch {}
}

export async function importBackup(
  file: BackupFile,
  mode: 'replace' | 'append',
  onProgress?: ProgressFn
): Promise<{ books: number; wishlist: number }> {
  if (mode === 'replace') {
    const db = await getDB();
    await db.runAsync('DELETE FROM books');
    try {
      await db.runAsync('DELETE FROM wishlist');
    } catch {}
  }
  const total = file.books.length + file.wishlist.length;
  let done = 0;
  onProgress?.(0, total);
  let bookCount = 0;
  for (const b of file.books) {
    done += 1;
    onProgress?.(done, total);
    const coverPath = await restoreCoverData(b.cover_b64, b.cover_local_path ?? null);
    const input: BookInput = {
      title: b.title,
      author: b.author ?? null,
      publisher: b.publisher ?? null,
      genre: b.genre ?? null,
      cover_local_path: coverPath,
      start_date: b.start_date ?? null,
      finish_date: b.finish_date ?? null,
      is_owned: b.is_owned ?? 0,
      is_stopped: b.is_stopped ?? 0,
      stopped_date: b.stopped_date ?? null,
      from_wishlist: b.from_wishlist ?? 0,
      wishlist_added_date: b.wishlist_added_date ?? null,
      rating: b.rating ?? null,
      short_review: b.short_review ?? null,
      memo: b.memo ?? null,
      read_count: b.read_count ?? 1,
    };
    if (!input.title) continue;
    await insertBook(input);
    bookCount++;
  }
  let wishlistCount = 0;
  for (const w of file.wishlist) {
    done += 1;
    onProgress?.(done, total);
    const coverPath = await restoreCoverData(w.cover_b64, w.cover_local_path ?? null);
    const input: WishlistInput = {
      title: w.title,
      author: w.author ?? null,
      publisher: w.publisher ?? null,
      genre: w.genre ?? null,
      memo: w.memo ?? null,
      cover_local_path: coverPath,
    };
    if (!input.title) continue;
    await insertWishlist(input);
    wishlistCount++;
  }
  return { books: bookCount, wishlist: wishlistCount };
}
