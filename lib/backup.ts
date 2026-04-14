import * as FileSystem from 'expo-file-system/legacy';
import { format } from 'date-fns';
import {
  getDB,
  insertBook,
  listBooks,
  type BookInput,
  type Book,
} from '@/db/database';

export type BackupFile = {
  version: 1;
  app: 'chaengnyeok';
  exportedAt: string;
  books: Book[];
};

export async function buildBackupJson(): Promise<{
  json: string;
  path: string;
}> {
  const books = await listBooks();
  const payload: BackupFile = {
    version: 1,
    app: 'chaengnyeok',
    exportedAt: new Date().toISOString(),
    books,
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
  if (parsed.version !== 1) {
    throw new Error(`지원하지 않는 버전입니다 (v${parsed.version}).`);
  }
  if (!Array.isArray(parsed.books)) {
    throw new Error('books 배열을 찾을 수 없습니다.');
  }
  return parsed as BackupFile;
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
}

export async function importBooks(
  file: BackupFile,
  mode: 'replace' | 'append'
): Promise<number> {
  if (mode === 'replace') {
    const db = await getDB();
    await db.runAsync('DELETE FROM books');
  }
  let count = 0;
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
      rating: b.rating ?? null,
      short_review: b.short_review ?? null,
      memo: b.memo ?? null,
      read_count: b.read_count ?? 1,
    };
    if (!input.title) continue;
    await insertBook(input);
    count++;
  }
  return count;
}
