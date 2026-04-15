import { useMemo, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { useBookStore } from '@/store/bookStore';
import { MonthNavigator } from '@/components/calendar/MonthNavigator';
import { CalendarGrid } from '@/components/calendar/CalendarGrid';
import { shiftMonth, useCalendarMatrix, type DayCell } from '@/hooks/useCalendar';
import type { Book } from '@/db/database';

type DayEntry = { book: Book; status: '완독' | '시작' | '읽는 중' | '중단' };

export default function CalendarScreen() {
  const { books } = useBookStore();
  const [month, setMonth] = useState(() => new Date());
  const [selected, setSelected] = useState<DayCell | null>(null);
  const weeks = useCalendarMatrix(month, books);

  const entries = useMemo<DayEntry[]>(() => {
    if (!selected) return [];
    const seen = new Map<number, DayEntry>();
    for (const b of selected.finishedBooks) {
      seen.set(b.id, { book: b, status: b.is_stopped === 1 ? '중단' : '완독' });
    }
    for (const b of selected.startedBooks) {
      if (!seen.has(b.id)) seen.set(b.id, { book: b, status: '시작' });
    }
    for (const r of selected.rangeBooks) {
      if (!seen.has(r.book.id)) {
        seen.set(r.book.id, {
          book: r.book,
          status: r.kind === 'stopped' ? '중단' : '읽는 중',
        });
      }
    }
    return Array.from(seen.values());
  }, [selected]);

  const onPressDay = (cell: DayCell) => setSelected(cell);
  const close = () => setSelected(null);

  const prettyDate = (key: string) =>
    format(parseISO(key), 'yyyy년 M월 d일 (EEE)', { locale: ko });

  const statusColor = (s: DayEntry['status']) =>
    s === '완독'
      ? Colors.primary
      : s === '중단'
        ? Colors.textSecondary
        : Colors.accent;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <MonthNavigator
          date={month}
          onPrev={() => setMonth((d) => shiftMonth(d, -1))}
          onNext={() => setMonth((d) => shiftMonth(d, 1))}
        />
        <View style={styles.topRight}>
          <Pressable
            onPress={() => setMonth(new Date())}
            style={({ pressed }) => [styles.todayBtn, pressed && styles.pressed]}
            hitSlop={8}
          >
            <Text style={styles.todayBtnText}>오늘</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/book-form')}
            style={({ pressed }) => [styles.addBtn, pressed && styles.pressed]}
            hitSlop={8}
          >
            <Text style={styles.addBtnText}>＋</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <CalendarGrid
          weeks={weeks}
          onPressDay={onPressDay}
          onSwipeLeft={() => setMonth((d) => shiftMonth(d, 1))}
          onSwipeRight={() => setMonth((d) => shiftMonth(d, -1))}
        />
      </ScrollView>

      <Modal
        visible={selected !== null}
        transparent
        animationType="fade"
        onRequestClose={close}
      >
        <Pressable style={styles.backdrop} onPress={close}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            {selected && (
              <>
                <Text style={styles.sheetDate}>{prettyDate(selected.dateKey)}</Text>
                <Text style={styles.sheetCount}>
                  {entries.length > 0
                    ? `${entries.length}권의 기록`
                    : '기록이 없는 날'}
                </Text>

                {entries.length > 0 && (
                  <ScrollView
                    style={styles.entryList}
                    showsVerticalScrollIndicator={false}
                  >
                    {entries.map(({ book, status }) => (
                      <Pressable
                        key={book.id}
                        onPress={() => {
                          close();
                          router.push({
                            pathname: '/book-detail',
                            params: { id: String(book.id) },
                          });
                        }}
                        style={({ pressed }) => [
                          styles.entryRow,
                          pressed && { opacity: 0.6 },
                        ]}
                      >
                        {book.cover_local_path ? (
                          <Image
                            source={{ uri: book.cover_local_path }}
                            style={styles.entryCover}
                          />
                        ) : (
                          <View style={[styles.entryCover, styles.entryCoverEmpty]}>
                            <Text style={styles.entryCoverEmptyText}>📖</Text>
                          </View>
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={styles.entryTitle} numberOfLines={2}>
                            {book.from_wishlist === 1 ? '🔖 ' : ''}
                            {book.title}
                          </Text>
                          {!!book.author && (
                            <Text style={styles.entryAuthor} numberOfLines={1}>
                              {book.author}
                            </Text>
                          )}
                          <View
                            style={[
                              styles.statusBadge,
                              { backgroundColor: statusColor(status) },
                            ]}
                          >
                            <Text style={styles.statusBadgeText}>{status}</Text>
                          </View>
                        </View>
                        <Text style={styles.chevron}>›</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                )}

                <Pressable
                  onPress={() => {
                    const dateKey = selected.dateKey;
                    close();
                    router.push({
                      pathname: '/book-form',
                      params: { startDate: dateKey },
                    });
                  }}
                  style={({ pressed }) => [
                    styles.sheetAddBtn,
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Text style={styles.sheetAddBtnText}>＋ 이 날에 책 기록 추가</Text>
                </Pressable>
                <Pressable onPress={close} hitSlop={8} style={styles.sheetClose}>
                  <Text style={styles.sheetCloseText}>닫기</Text>
                </Pressable>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  topRight: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  todayBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: Colors.surface,
  },
  todayBtnText: { fontSize: 13, color: Colors.textPrimary, fontWeight: '600' },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: { fontSize: 20, color: '#fff', fontWeight: '600', lineHeight: 22 },
  pressed: { opacity: 0.6 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
    maxHeight: '80%',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    marginBottom: 14,
  },
  sheetDate: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  sheetCount: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
    marginBottom: 12,
  },
  entryList: { maxHeight: 360 },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 8,
  },
  entryCover: {
    width: 44,
    height: 62,
    borderRadius: 4,
    backgroundColor: Colors.background,
  },
  entryCoverEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  entryCoverEmptyText: { fontSize: 20 },
  entryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  entryAuthor: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 6,
  },
  statusBadgeText: { fontSize: 11, color: '#fff', fontWeight: '700' },
  chevron: { fontSize: 22, color: Colors.textSecondary, marginLeft: 4 },
  sheetAddBtn: {
    marginTop: 12,
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: Colors.primary,
  },
  sheetAddBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  sheetClose: {
    marginTop: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  sheetCloseText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
});
