import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy';

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
  memo: string | null;
  read_count: number;
  created_at: string;
  updated_at: string;
};

export type BookInput = Omit<Book, 'id' | 'created_at' | 'updated_at'>;

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
  return dbInstance;
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
  const result = await db.runAsync(
    `INSERT INTO books
      (title, author, publisher, genre, cover_local_path, start_date, finish_date,
       is_owned, is_stopped, stopped_date, from_wishlist, wishlist_added_date, rating,
       short_review, memo, read_count)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    input.title,
    input.author,
    input.publisher,
    input.genre,
    input.cover_local_path,
    input.start_date,
    input.finish_date,
    input.is_owned,
    input.is_stopped,
    input.stopped_date ?? null,
    input.from_wishlist ?? 0,
    input.wishlist_added_date ?? null,
    input.rating,
    input.short_review,
    input.memo,
    input.read_count
  );
  return result.lastInsertRowId;
}

export async function updateBook(id: number, input: BookInput): Promise<void> {
  const db = await getDB();
  await db.runAsync(
    `UPDATE books SET
       title = ?, author = ?, publisher = ?, genre = ?, cover_local_path = ?,
       start_date = ?, finish_date = ?, is_owned = ?, is_stopped = ?,
       stopped_date = ?, from_wishlist = ?, wishlist_added_date = ?, rating = ?,
       short_review = ?, memo = ?, read_count = ?, updated_at = datetime('now')
     WHERE id = ?`,
    input.title,
    input.author,
    input.publisher,
    input.genre,
    input.cover_local_path,
    input.start_date,
    input.finish_date,
    input.is_owned,
    input.is_stopped,
    input.stopped_date ?? null,
    input.from_wishlist ?? 0,
    input.wishlist_added_date ?? null,
    input.rating,
    input.short_review,
    input.memo,
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
  cover_local_path: string | null;
  created_at: string;
};

export type WishlistInput = Omit<Wishlist, 'id' | 'created_at'> & {
  created_at?: string;
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
  const result = input.created_at
    ? await db.runAsync(
        `INSERT INTO wishlist (title, author, publisher, genre, memo, cover_local_path, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        input.title,
        input.author,
        input.publisher,
        input.genre,
        input.memo,
        input.cover_local_path,
        input.created_at
      )
    : await db.runAsync(
        `INSERT INTO wishlist (title, author, publisher, genre, memo, cover_local_path)
         VALUES (?, ?, ?, ?, ?, ?)`,
        input.title,
        input.author,
        input.publisher,
        input.genre,
        input.memo,
        input.cover_local_path
      );
  return result.lastInsertRowId;
}

export async function updateWishlist(
  id: number,
  input: WishlistInput
): Promise<void> {
  const db = await getDB();
  await ensureWishlistTable(db);
  await db.runAsync(
    `UPDATE wishlist SET title = ?, author = ?, publisher = ?, genre = ?, memo = ?, cover_local_path = ? WHERE id = ?`,
    input.title,
    input.author,
    input.publisher,
    input.genre,
    input.memo,
    input.cover_local_path,
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
      try {
        await FileSystem.deleteAsync(row.cover_local_path, {
          idempotent: true,
        });
      } catch {}
    }
  }
  await db.runAsync('DELETE FROM wishlist WHERE id = ?', id);
}

export async function deleteBook(id: number): Promise<void> {
  const db = await getDB();
  const book = await getBook(id);
  if (book?.cover_local_path) {
    try {
      await FileSystem.deleteAsync(book.cover_local_path, { idempotent: true });
    } catch {}
  }
  await db.runAsync('DELETE FROM books WHERE id = ?', id);
}
