import { differenceInCalendarDays, isLeapYear } from 'date-fns';
import type { Book } from '@/db/database';

export const GOAL_MIN = 1;
export const GOAL_MAX = 999;

// 그 해에 완독한 권수. 중단한 책은 세지 않는다.
export function finishedCountInYear(
  books: Pick<Book, 'finish_date' | 'is_stopped'>[],
  year: number
): number {
  const prefix = `${year}-`;
  return books.filter(
    (b) => b.is_stopped !== 1 && !!b.finish_date?.startsWith(prefix)
  ).length;
}

export type GoalProgress = {
  finished: number;
  target: number;
  ratio: number; // 0~1, 초과 달성해도 1
  message: string;
};

export function goalProgress(
  finished: number,
  target: number,
  year: number,
  today: Date
): GoalProgress {
  return {
    finished,
    target,
    ratio: Math.min(1, finished / target),
    message: progressMessage(finished, target, year, today),
  };
}

function progressMessage(
  finished: number,
  target: number,
  year: number,
  today: Date
): string {
  const remaining = target - finished;
  if (remaining <= 0) {
    return remaining < 0
      ? `목표 달성! ${-remaining}권 더 읽었어요`
      : '목표 달성!';
  }
  const currentYear = today.getFullYear();
  if (year < currentYear) return `${remaining}권 모자랐어요`;
  if (year > currentYear) return `${year}년이 되면 집계가 시작돼요`;

  // 오늘을 포함해 올해 남은 날. 마지막 달은 월 단위가 어색해서 날짜로 보여 준다.
  const daysInYear = isLeapYear(today) ? 366 : 365;
  const daysLeft =
    daysInYear - differenceInCalendarDays(today, new Date(year, 0, 1));
  if (daysLeft <= 31) return `${remaining}권 남았어요 · 올해 ${daysLeft}일 남음`;

  const perMonth = remaining / (daysLeft / (daysInYear / 12));
  const pace =
    perMonth <= 1
      ? '한 달에 1권이면 충분해요'
      : `한 달에 약 ${Number(perMonth.toFixed(1))}권`;
  return `${remaining}권 남았어요 · ${pace}`;
}
