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

export type BackupFile = {
  version: 2;
  app: 'chaengnyeok';
  exportedAt: string;
  books: Book[];
  wishlist: Wishlist[];
};

export async function buildBackupJson(): Promise<{
  json: string;
  path: string;
}> {
  const [books, wishlist] = await Promise.all([listBooks(), listWishlist()]);
  const payload: BackupFile = {
    version: 2,
    app: 'chaengnyeok',
    exportedAt: new Date().toISOString(),
    books,
    wishlist,
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
  if (parsed.version !== 1 && parsed.version !== 2) {
    throw new Error(`지원하지 않는 버전입니다 (v${parsed.version}).`);
  }
  if (!Array.isArray(parsed.books)) {
    throw new Error('books 배열을 찾을 수 없습니다.');
  }
  const wishlist = Array.isArray(parsed.wishlist) ? parsed.wishlist : [];
  return {
    version: 2,
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
  mode: 'replace' | 'append'
): Promise<{ books: number; wishlist: number }> {
  if (mode === 'replace') {
    const db = await getDB();
    await db.runAsync('DELETE FROM books');
    try {
      await db.runAsync('DELETE FROM wishlist');
    } catch {}
  }
  let bookCount = 0;
  for (const b of file.books) {
    const input: BookInput = {
      title: b.title,
      author: b.author ?? null,
      publisher: b.publisher ?? null,
      genre: b.genre ?? null,
      cover_local_path: b.cover_local_path ?? null,
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
    const input: WishlistInput = {
      title: w.title,
      author: w.author ?? null,
      publisher: w.publisher ?? null,
      genre: w.genre ?? null,
      memo: w.memo ?? null,
      cover_local_path: w.cover_local_path ?? null,
    };
    if (!input.title) continue;
    await insertWishlist(input);
    wishlistCount++;
  }
  return { books: bookCount, wishlist: wishlistCount };
}
