import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/colors';
import type { Book } from '@/db/database';
import { finishedCountInYear, goalProgress } from '@/lib/goal';
import { useGoalStore } from '@/store/goalStore';
import { GoalEditor } from './GoalEditor';
import { GoalProgressBar } from './GoalProgressBar';

// 통계 탭 맨 위 카드. 다음 해 목표를 미리 세울 수 있도록 내년까지 이동된다.
export function GoalCard({ books }: { books: Book[] }) {
  const today = new Date();
  const currentYear = today.getFullYear();
  const [year, setYear] = useState(currentYear);
  const [editing, setEditing] = useState(false);
  const target = useGoalStore((s) => s.goals[year]);

  const minYear = useMemo(
    () =>
      books.reduce((min, b) => {
        const y = b.finish_date ? Number(b.finish_date.slice(0, 4)) : min;
        return y < min ? y : min;
      }, currentYear),
    [books, currentYear]
  );
  const maxYear = currentYear + 1;
  const finished = finishedCountInYear(books, year);
  const progress = target ? goalProgress(finished, target, year, today) : null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.yearNav}>
          <YearArrow
            label="‹"
            disabled={year <= minYear}
            onPress={() => setYear((y) => y - 1)}
          />
          <Text style={styles.title}>{year}년 독서 목표</Text>
          <YearArrow
            label="›"
            disabled={year >= maxYear}
            onPress={() => setYear((y) => y + 1)}
          />
        </View>
        {progress && (
          <Pressable onPress={() => setEditing(true)} hitSlop={8}>
            <Text style={styles.editText}>변경</Text>
          </Pressable>
        )}
      </View>

      {progress ? (
        <>
          <View style={styles.countRow}>
            <Text style={styles.finished}>{finished}</Text>
            <Text style={styles.target}> / {target}권</Text>
            <Text style={styles.pct}>{Math.round(progress.ratio * 100)}%</Text>
          </View>
          <GoalProgressBar ratio={progress.ratio} height={10} />
          <Text style={styles.message}>{progress.message}</Text>
        </>
      ) : (
        <>
          <Text style={styles.noGoal}>
            {year > currentYear
              ? '내년 목표를 미리 세워 보세요'
              : `이 해에 ${finished}권 완독했어요`}
          </Text>
          <Pressable
            onPress={() => setEditing(true)}
            style={({ pressed }) => [styles.setBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.setBtnText}>목표 세우기</Text>
          </Pressable>
        </>
      )}

      <GoalEditor
        visible={editing}
        year={year}
        current={target ?? null}
        onClose={() => setEditing(false)}
      />
    </View>
  );
}

function YearArrow({
  label,
  disabled,
  onPress,
}: {
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} disabled={disabled} hitSlop={10}>
      <Text style={[styles.arrow, disabled && styles.arrowDisabled]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 10,
    padding: 14,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  yearNav: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  arrow: { fontSize: 22, lineHeight: 24, color: Colors.textPrimary },
  arrowDisabled: { color: Colors.border },
  editText: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  countRow: { flexDirection: 'row', alignItems: 'baseline' },
  finished: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.primary,
    fontVariant: ['tabular-nums'],
  },
  target: { fontSize: 15, color: Colors.textSecondary, fontWeight: '600' },
  pct: {
    marginLeft: 'auto',
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  message: { fontSize: 13, color: Colors.textSecondary },
  noGoal: { fontSize: 13, color: Colors.textSecondary },
  setBtn: {
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: Colors.primary,
  },
  setBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
