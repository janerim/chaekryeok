import { create } from 'zustand';
import { deleteGoal, listGoals, saveGoal } from '@/db/database';

type GoalStore = {
  goals: Record<number, number>; // 연도 → 목표 권수
  refresh: () => Promise<void>;
  setGoal: (year: number, target: number) => Promise<void>;
  clearGoal: (year: number) => Promise<void>;
};

export const useGoalStore = create<GoalStore>((set, get) => ({
  goals: {},
  refresh: async () => {
    const rows = await listGoals();
    set({ goals: Object.fromEntries(rows.map((g) => [g.year, g.target])) });
  },
  setGoal: async (year, target) => {
    await saveGoal(year, target);
    await get().refresh();
  },
  clearGoal: async (year) => {
    await deleteGoal(year);
    await get().refresh();
  },
}));
