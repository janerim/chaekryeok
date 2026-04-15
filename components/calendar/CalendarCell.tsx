import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/colors';
import type { DayCell } from '@/hooks/useCalendar';
import type { Book } from '@/db/database';

type Props = {
  cell: DayCell;
  width: number;
  onPress: (cell: DayCell) => void;
};

type Slot = {
  book: Book;
  kind: 'finished' | 'starting-finished' | 'reading' | 'stopped';
};

const MAX_SLOTS = 4;

export function CalendarCell({ cell, width, onPress }: Props) {
  const { date, inMonth, isToday, weekday, finishedBooks, startedBooks, rangeBooks } = cell;
  const day = date.getDate();

  const dayColor = !inMonth
    ? Colors.textSecondary
    : weekday === 0
      ? Colors.sunday
      : weekday === 6
        ? Colors.saturday
        : Colors.textPrimary;

  const slots: Slot[] = [];
  for (const b of finishedBooks) {
    slots.push({ book: b, kind: b.is_stopped === 1 ? 'stopped' : 'finished' });
  }
  for (const b of startedBooks) {
    slots.push({
      book: b,
      kind:
        b.is_stopped === 1
          ? 'stopped'
          : b.finish_date
            ? 'starting-finished'
            : 'reading',
    });
  }
  const visible = slots.slice(0, MAX_SLOTS);
  const extraCount = Math.max(0, slots.length - MAX_SLOTS);

  return (
    <Pressable
      onPress={() => onPress(cell)}
      style={({ pressed }) => [
        styles.cell,
        { width },
        isToday && styles.today,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.day, { color: dayColor, opacity: inMonth ? 1 : 0.35 }]}>
        {day}
      </Text>
      {visible.length > 0 && (
        <View style={styles.coverArea}>
          {visible.length === 1 ? (
            <View style={styles.singleWrap}>
              <Cover slot={visible[0]} />
            </View>
          ) : (
            <View style={styles.grid}>
              {visible.map((s, i) => (
                <View key={`${s.book.id}-${i}`} style={styles.gridItem}>
                  <Cover slot={s} compact />
                </View>
              ))}
            </View>
          )}
          {extraCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>+{extraCount}</Text>
            </View>
          )}
        </View>
      )}
      {rangeBooks.length > 0 && (
        <View style={styles.rangeBars}>
          {rangeBooks.slice(0, 3).map((r, i) => (
            <View
              key={`${r.book.id}-${i}`}
              style={[
                styles.rangeBar,
                {
                  backgroundColor:
                    r.kind === 'reading'
                      ? Colors.accent
                      : r.kind === 'stopped'
                        ? Colors.textSecondary
                        : Colors.primary,
                },
              ]}
            />
          ))}
        </View>
      )}
    </Pressable>
  );
}

function Cover({ slot, compact }: { slot: Slot; compact?: boolean }) {
  const { book, kind } = slot;
  return (
    <View
      style={[
        styles.coverBox,
        kind === 'reading' && styles.coverReading,
        kind === 'starting-finished' && styles.coverStarting,
        kind === 'stopped' && styles.coverStopped,
      ]}
    >
      {book.cover_local_path ? (
        <Image
          source={{ uri: book.cover_local_path }}
          style={[
            styles.coverImg,
            kind === 'starting-finished' && { opacity: 0.75 },
          ]}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.coverFallback}>
          <Text style={styles.coverText} numberOfLines={2}>
            {book.title}
          </Text>
        </View>
      )}
      {!compact && kind !== 'finished' && kind !== 'stopped' && (
        <View
          style={[
            styles.marker,
            styles.markerStart,
            {
              backgroundColor:
                kind === 'reading' ? Colors.accent : Colors.primary,
            },
          ]}
        >
          <Text style={styles.markerText}>시작</Text>
        </View>
      )}
      {!compact && kind === 'stopped' && (
        <View
          style={[
            styles.marker,
            styles.markerStart,
            { backgroundColor: Colors.textSecondary },
          ]}
        >
          <Text style={styles.markerText}>중단</Text>
        </View>
      )}
      {!compact && kind === 'finished' && (
        <View style={[styles.marker, styles.markerEnd]}>
          <Text style={styles.markerText}>✓</Text>
        </View>
      )}
      {compact && kind !== 'finished' && (
        <View
          style={[
            styles.cornerDot,
            {
              backgroundColor:
                kind === 'reading'
                  ? Colors.accent
                  : kind === 'stopped'
                    ? Colors.textSecondary
                    : Colors.primary,
            },
          ]}
        />
      )}
      {book.from_wishlist === 1 && (
        <View style={styles.wishMark}>
          <Text style={styles.wishMarkText}>🔖</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cell: {
    minHeight: 120,
    paddingTop: 4,
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  today: {
    backgroundColor: Colors.todayBg,
  },
  pressed: { opacity: 0.6 },
  day: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 3,
  },
  coverArea: {
    flex: 1,
    width: '92%',
    marginBottom: 4,
  },
  singleWrap: { flex: 1 },
  grid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
  },
  gridItem: {
    width: '48.5%',
    height: '49%',
  },
  cornerDot: {
    position: 'absolute',
    top: 2,
    left: 2,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  coverBox: {
    flex: 1,
    minHeight: 32,
    borderRadius: 4,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  coverReading: {
    borderColor: Colors.accent,
    borderWidth: 2,
  },
  coverStopped: {
    borderColor: Colors.textSecondary,
    borderWidth: 1.5,
    opacity: 0.7,
  },
  coverStarting: {
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    borderWidth: 1.5,
  },
  coverImg: {
    width: '100%',
    height: '100%',
  },
  coverFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  coverText: {
    fontSize: 9,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  marker: {
    position: 'absolute',
    paddingHorizontal: 3,
    paddingVertical: 1,
    minWidth: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerStart: {
    top: 0,
    left: 0,
    borderBottomRightRadius: 4,
  },
  markerEnd: {
    top: 0,
    right: 0,
    backgroundColor: Colors.primary,
    borderBottomLeftRadius: 4,
  },
  markerText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '700',
  },
  badge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 4,
    minWidth: 18,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  rangeBars: {
    width: '100%',
    marginTop: 'auto',
    paddingBottom: 3,
    gap: 2,
  },
  wishMark: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 6,
    paddingHorizontal: 1,
  },
  wishMarkText: { fontSize: 9, lineHeight: 11 },
  rangeBar: {
    width: '100%',
    height: 3,
    opacity: 0.85,
  },
});
