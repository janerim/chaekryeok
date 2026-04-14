import { create } from 'zustand';
import {
  Book,
  BookInput,
  deleteBook as dbDelete,
  getDB,
  insertBook as dbInsert,
  listBooks,
  updateBook as dbUpdate,
} from '@/db/database';

type BookStore = {
  books: Book[];
  loading: boolean;
  initialized: boolean;
  init: () => Promise<void>;
  refresh: () => Promise<void>;
  addBook: (input: BookInput) => Promise<number>;
  editBook: (id: number, input: BookInput) => Promise<void>;
  removeBook: (id: number) => Promise<void>;
};

export const useBookStore = create<BookStore>((set, get) => ({
  books: [],
  loading: false,
  initialized: false,
  init: async () => {
    if (get().initialized) return;
    await getDB();
    await get().refresh();
    set({ initialized: true });
  },
  refresh: async () => {
    set({ loading: true });
    const books = await listBooks();
    set({ books, loading: false });
  },
  addBook: async (input) => {
    const id = await dbInsert(input);
    await get().refresh();
    return id;
  },
  editBook: async (id, input) => {
    await dbUpdate(id, input);
    await get().refresh();
  },
  removeBook: async (id) => {
    await dbDelete(id);
    await get().refresh();
  },
}));
