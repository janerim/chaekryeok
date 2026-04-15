import { create } from 'zustand';
import {
  Wishlist,
  WishlistInput,
  deleteWishlist as dbDelete,
  insertWishlist as dbInsert,
  listWishlist,
  updateWishlist as dbUpdate,
} from '@/db/database';

type WishlistStore = {
  items: Wishlist[];
  loading: boolean;
  refresh: () => Promise<void>;
  add: (input: WishlistInput) => Promise<number>;
  edit: (id: number, input: WishlistInput) => Promise<void>;
  remove: (id: number, opts?: { keepCover?: boolean }) => Promise<void>;
};

export const useWishlistStore = create<WishlistStore>((set, get) => ({
  items: [],
  loading: false,
  refresh: async () => {
    set({ loading: true });
    const items = await listWishlist();
    set({ items, loading: false });
  },
  add: async (input) => {
    const id = await dbInsert(input);
    await get().refresh();
    return id;
  },
  edit: async (id, input) => {
    await dbUpdate(id, input);
    await get().refresh();
  },
  remove: async (id, opts) => {
    await dbDelete(id, opts);
    await get().refresh();
  },
}));
