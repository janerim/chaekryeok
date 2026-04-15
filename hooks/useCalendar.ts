import { useMemo } from 'react';
import {
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import type { Book } from '@/db/database';

export type DayCell = {
  date: Date;
  dateKey: string; // yyyy-MM-dd
  inMonth: boolean;
  isToday: boolean;
  weekday: number; // 0 Sun ~ 6 Sat
  finishedBooks: Book[];
  startedBooks: Book[];
  rangeBooks: { book: Book; kind: 'finished' | 'reading' | 'stopped' }[];
};

const WEEK_STARTS_ON = 1; // Monday

export function useCalendarMatrix(currentMonth: Date, books: Book[]) {
  return useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: WEEK_STARTS_ON });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: WEEK_STARTS_ON });
    const today = new Date();
    const todayKey = format(today, 'yyyy-MM-dd');

    const effectiveFinish = (b: Book): string | null =>
      b.is_stopped === 1
        ? b.stopped_date ?? b.updated_at?.slice(0, 10) ?? null
        : b.finish_date;

    const days: DayCell[] = [];
    const cursor = new Date(gridStart);
    while (cursor <= gridEnd) {
      const dateKey = format(cursor, 'yyyy-MM-dd');
      const finishedBooks = books.filter(
        (b) => effectiveFinish(b) === dateKey
      );
      const startedBooks = books.filter(
        (b) =>
          b.start_date === dateKey &&
          effectiveFinish(b) !== dateKey
      );
      const rangeBooks: DayCell['rangeBooks'] = [];
      for (const b of books) {
        if (!b.start_date) continue;
        const finish = effectiveFinish(b);
        const end = finish ?? todayKey;
        if (dateKey <= b.start_date || dateKey > end) continue;
        if (finish === dateKey) continue;
        rangeBooks.push({
          book: b,
          kind:
            b.is_stopped === 1
              ? 'stopped'
              : finish
                ? 'finished'
                : 'reading',
        });
      }
      days.push({
        date: new Date(cursor),
        dateKey,
        inMonth: isSameMonth(cursor, currentMonth),
        isToday: isSameDay(cursor, today),
        weekday: cursor.getDay(),
        finishedBooks,
        startedBooks,
        rangeBooks,
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    const weeks: DayCell[][] = [];
    for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
    return weeks;
  }, [currentMonth, books]);
}

export function shiftMonth(date: Date, delta: number): Date {
  return addMonths(date, delta);
}

export const WEEKDAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];
