import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy';
import { resolveCoverUri, toCoverFilename } from '@/lib/covers';

async function deleteCoverFile(stored: string | null): Promise<void> {
  const uri = resolveCoverUri(stored);
  if (!uri || /^(https?:|data:)/.test(uri)) return;
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {}
}

export type Book = {
  id: number;
  title: string;
  author: string | null;
  publisher: string | null;
  genre: string | null;
  cover_local_path: string | null;
  start_date: string | null;
  finish_date: string | null;
  is_owned: number;
  is_stopped: number;
  stopped_date: string | null;
  from_wishlist: number;
  wishlist_added_date: string | null;
  rating: number | null;
  short_review: string | null;
  short_review_updated_at: string | null;
  memo: string | null;
  memo_updated_at: string | null;
  read_count: number;
  created_at: string;
  updated_at: string;
};

// 작성 시각은 저장할 때 본문 변경 여부를 보고 자동으로 채우므로 입력에서는 선택값이다.
// (백업 복원처럼 원래 시각을 그대로 살려야 할 때만 명시적으로 넘긴다.)
export type BookInput = Omit<
  Book,
  | 'id'
  | 'created_at'
  | 'updated_at'
  | 'short_review_updated_at'
  | 'memo'
  | 'memo_updated_at'
> & {
  short_review_updated_at?: string | null;
};

// 책 한 권에 시간순으로 쌓이는 메모/독후감 기록.
export type BookNote = {
  id: number;
  book_id: number;
  body: string;
  created_at: string;
  updated_at: string | null;
};

// 본문이 비면 시각도 지우고, 내용이 바뀌었을 때만 현재 시각으로 갱신한다.
function resolveWrittenAt(
  next: string | null | undefined,
  prevText: string | null | undefined,
  prevAt: string | null | undefined
): string | null {
  const text = next?.trim() || null;
  if (!text) return null;
  if ((prevText?.trim() || null) === text) return prevAt ?? null;
  return new Date().toISOString();
}

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDB(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;
  dbInstance = await SQLite.openDatabaseAsync('reading_calendar.db');
  await dbInstance.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT,
      publisher TEXT,
      genre TEXT,
      cover_local_path TEXT,
      start_date TEXT,
      finish_date TEXT,
      is_owned INTEGER DEFAULT 0,
      rating REAL,
      short_review TEXT,
      memo TEXT,
      read_count INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_books_finish_date ON books(finish_date);
    CREATE INDEX IF NOT EXISTS idx_books_start_date ON books(start_date);
  `);
  try {
    await dbInstance.execAsync(
      'ALTER TABLE books ADD COLUMN is_stopped INTEGER DEFAULT 0'
    );
  } catch {}
  try {
    await dbInstance.execAsync(
      'ALTER TABLE books ADD COLUMN from_wishlist INTEGER DEFAULT 0'
    );
  } catch {}
  try {
    await dbInstance.execAsync(
      'ALTER TABLE books ADD COLUMN stopped_date TEXT'
    );
  } catch {}
  try {
    await dbInstance.execAsync(
      'ALTER TABLE books ADD COLUMN wishlist_added_date TEXT'
    );
  } catch {}
  try {
    await dbInstance.execAsync(
      'ALTER TABLE books ADD COLUMN short_review_updated_at TEXT'
    );
  } catch {}
  try {
    await dbInstance.execAsync(
      'ALTER TABLE books ADD COLUMN memo_updated_at TEXT'
    );
  } catch {}
  await dbInstance.execAsync(`
    CREATE TABLE IF NOT EXISTS book_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_book_notes_book
      ON book_notes(book_id, created_at);
  `);
  await dbInstance.execAsync(`
    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);
  await migrateMemoToNotes(dbInstance);
  return dbInstance;
}

// 앱 동작에 쓰는 소소한 설정값 저장소 (사용자 데이터가 아니라 백업 대상은 아니다)
export async function getMeta(key: string): Promise<string | null> {
  const db = await getDB();
  const row = await db.getFirstAsync<{ value: string | null }>(
    'SELECT value FROM app_meta WHERE key = ?',
    key
  );
  return row?.value ?? null;
}

export async function setMeta(key: string, value: string): Promise<void> {
  const db = await getDB();
  await db.runAsync(
    `INSERT INTO app_meta (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    key,
    value
  );
}

async function migrateMemoToNotes(db: SQLite.SQLiteDatabase): Promise<void> {
  const rows = await db.getAllAsync<{
    id: number;
    memo: string;
    memo_updated_at: string | null;
    created_at: string | null;
  }>(
    `SELECT id, memo, memo_updated_at, created_at FROM books
     WHERE memo IS NOT NULL AND TRIM(memo) <> ''`
  );
  if (rows.length === 0) return;
  await db.withTransactionAsync(async () => {
    for (const r of rows) {
      await db.runAsync(
        'INSERT INTO book_notes (book_id, body, created_at) VALUES (?, ?, ?)',
        r.id,
        r.memo,
        r.memo_updated_at ?? r.created_at ?? new Date().toISOString()
      );
      await db.runAsync(
        'UPDATE books SET memo = NULL, memo_updated_at = NULL WHERE id = ?',
        r.id
      );
    }
  });
}

export async function listNotes(bookId: number): Promise<BookNote[]> {
  const db = await getDB();
  return db.getAllAsync<BookNote>(
    'SELECT * FROM book_notes WHERE book_id = ? ORDER BY created_at ASC, id ASC',
    bookId
  );
}

export async function insertNote(
  bookId: number,
  body: string,
  createdAt?: string
): Promise<number> {
  const db = await getDB();
  const result = await db.runAsync(
    'INSERT INTO book_notes (book_id, body, created_at) VALUES (?, ?, ?)',
    bookId,
    body,
    createdAt ?? new Date().toISOString()
  );
  return result.lastInsertRowId;
}

export async function updateNote(id: number, body: string): Promise<void> {
  const db = await getDB();
  await db.runAsync(
    'UPDATE book_notes SET body = ?, updated_at = ? WHERE id = ?',
    body,
    new Date().toISOString(),
    id
  );
}

export async function deleteNote(id: number): Promise<void> {
  const db = await getDB();
  await db.runAsync('DELETE FROM book_notes WHERE id = ?', id);
}

export async function listBooks(): Promise<Book[]> {
  const db = await getDB();
  return db.getAllAsync<Book>(
    'SELECT * FROM books ORDER BY COALESCE(finish_date, start_date, created_at) DESC'
  );
}

export async function getBook(id: number): Promise<Book | null> {
  const db = await getDB();
  const row = await db.getFirstAsync<Book>('SELECT * FROM books WHERE id = ?', id);
  return row ?? null;
}

export async function getBooksInDateRange(
  startISO: string,
  endISO: string
): Promise<Book[]> {
  const db = await getDB();
  return db.getAllAsync<Book>(
    `SELECT * FROM books
     WHERE (finish_date BETWEEN ? AND ?)
        OR (start_date BETWEEN ? AND ? AND finish_date IS NULL)`,
    startISO,
    endISO,
    startISO,
    endISO
  );
}

export async function insertBook(input: BookInput): Promise<number> {
  const db = await getDB();
  const shortReviewAt =
    input.short_review_updated_at !== undefined
      ? input.short_review_updated_at
      : resolveWrittenAt(input.short_review, null, null);
  const result = await db.runAsync(
    `INSERT INTO books
      (title, author, publisher, genre, cover_local_path, start_date, finish_date,
       is_owned, is_stopped, stopped_date, from_wishlist, wishlist_added_date, rating,
       short_review, short_review_updated_at, read_count)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    input.title,
    input.author,
    input.publisher,
    input.genre,
    toCoverFilename(input.cover_local_path),
    input.start_date,
    input.finish_date,
    input.is_owned,
    input.is_stopped,
    input.stopped_date ?? null,
    input.from_wishlist ?? 0,
    input.wishlist_added_date ?? null,
    input.rating,
    input.short_review,
    shortReviewAt,
    input.read_count
  );
  return result.lastInsertRowId;
}

export async function updateBook(id: number, input: BookInput): Promise<void> {
  const db = await getDB();
  const prev = await db.getFirstAsync<
    Pick<Book, 'short_review' | 'short_review_updated_at'>
  >('SELECT short_review, short_review_updated_at FROM books WHERE id = ?', id);
  const shortReviewAt =
    input.short_review_updated_at !== undefined
      ? input.short_review_updated_at
      : resolveWrittenAt(
          input.short_review,
          prev?.short_review,
          prev?.short_review_updated_at
        );
  await db.runAsync(
    `UPDATE books SET
       title = ?, author = ?, publisher = ?, genre = ?, cover_local_path = ?,
       start_date = ?, finish_date = ?, is_owned = ?, is_stopped = ?,
       stopped_date = ?, from_wishlist = ?, wishlist_added_date = ?, rating = ?,
       short_review = ?, short_review_updated_at = ?,
       read_count = ?, updated_at = datetime('now')
     WHERE id = ?`,
    input.title,
    input.author,
    input.publisher,
    input.genre,
    toCoverFilename(input.cover_local_path),
    input.start_date,
    input.finish_date,
    input.is_owned,
    input.is_stopped,
    input.stopped_date ?? null,
    input.from_wishlist ?? 0,
    input.wishlist_added_date ?? null,
    input.rating,
    input.short_review,
    shortReviewAt,
    input.read_count,
    id
  );
}

export type Wishlist = {
  id: number;
  title: string;
  author: string | null;
  publisher: string | null;
  genre: string | null;
  memo: string | null;
  memo_updated_at: string | null;
  cover_local_path: string | null;
  created_at: string;
};

export type WishlistInput = Omit<
  Wishlist,
  'id' | 'created_at' | 'memo_updated_at'
> & {
  created_at?: string;
  memo_updated_at?: string | null;
};

async function ensureWishlistTable(db: SQLite.SQLiteDatabase) {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS wishlist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT,
      publisher TEXT,
      genre TEXT,
      memo TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  try {
    await db.execAsync(
      'ALTER TABLE wishlist ADD COLUMN cover_local_path TEXT'
    );
  } catch {}
  try {
    await db.execAsync(
      'ALTER TABLE wishlist ADD COLUMN memo_updated_at TEXT'
    );
  } catch {}
}

export async function listWishlist(): Promise<Wishlist[]> {
  const db = await getDB();
  await ensureWishlistTable(db);
  return db.getAllAsync<Wishlist>(
    'SELECT * FROM wishlist ORDER BY created_at DESC'
  );
}

export async function getWishlistItem(id: number): Promise<Wishlist | null> {
  const db = await getDB();
  await ensureWishlistTable(db);
  const row = await db.getFirstAsync<Wishlist>(
    'SELECT * FROM wishlist WHERE id = ?',
    id
  );
  return row ?? null;
}

export async function insertWishlist(input: WishlistInput): Promise<number> {
  const db = await getDB();
  await ensureWishlistTable(db);
  const memoAt =
    input.memo_updated_at !== undefined
      ? input.memo_updated_at
      : resolveWrittenAt(input.memo, null, null);
  const result = input.created_at
    ? await db.runAsync(
        `INSERT INTO wishlist (title, author, publisher, genre, memo, memo_updated_at, cover_local_path, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        input.title,
        input.author,
        input.publisher,
        input.genre,
        input.memo,
        memoAt,
        toCoverFilename(input.cover_local_path),
        input.created_at
      )
    : await db.runAsync(
        `INSERT INTO wishlist (title, author, publisher, genre, memo, memo_updated_at, cover_local_path)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        input.title,
        input.author,
        input.publisher,
        input.genre,
        input.memo,
        memoAt,
        toCoverFilename(input.cover_local_path)
      );
  return result.lastInsertRowId;
}

export async function updateWishlist(
  id: number,
  input: WishlistInput
): Promise<void> {
  const db = await getDB();
  await ensureWishlistTable(db);
  const prev = await db.getFirstAsync<Pick<Wishlist, 'memo' | 'memo_updated_at'>>(
    'SELECT memo, memo_updated_at FROM wishlist WHERE id = ?',
    id
  );
  const memoAt =
    input.memo_updated_at !== undefined
      ? input.memo_updated_at
      : resolveWrittenAt(input.memo, prev?.memo, prev?.memo_updated_at);
  await db.runAsync(
    `UPDATE wishlist SET title = ?, author = ?, publisher = ?, genre = ?, memo = ?, memo_updated_at = ?, cover_local_path = ? WHERE id = ?`,
    input.title,
    input.author,
    input.publisher,
    input.genre,
    input.memo,
    memoAt,
    toCoverFilename(input.cover_local_path),
    id
  );
}

export async function deleteWishlist(
  id: number,
  opts: { keepCover?: boolean } = {}
): Promise<void> {
  const db = await getDB();
  await ensureWishlistTable(db);
  if (!opts.keepCover) {
    const row = await db.getFirstAsync<Wishlist>(
      'SELECT * FROM wishlist WHERE id = ?',
      id
    );
    if (row?.cover_local_path) {
      await deleteCoverFile(row.cover_local_path);
    }
  }
  await db.runAsync('DELETE FROM wishlist WHERE id = ?', id);
}

export async function deleteBook(id: number): Promise<void> {
  const db = await getDB();
  const book = await getBook(id);
  if (book?.cover_local_path) {
    await deleteCoverFile(book.cover_local_path);
  }
  await db.runAsync('DELETE FROM book_notes WHERE book_id = ?', id);
  await db.runAsync('DELETE FROM books WHERE id = ?', id);
}
