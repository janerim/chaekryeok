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
       is_owned, is_stopped, rating, short_review, memo, read_count)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    input.title,
    input.author,
    input.publisher,
    input.genre,
    input.cover_local_path,
    input.start_date,
    input.finish_date,
    input.is_owned,
    input.is_stopped,
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
       start_date = ?, finish_date = ?, is_owned = ?, is_stopped = ?, rating = ?,
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
    input.rating,
    input.short_review,
    input.memo,
    input.read_count,
    id
  );
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
