import { useState } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Colors } from '@/constants/colors';
import { useBookStore } from '@/store/bookStore';
import { MonthNavigator } from '@/components/calendar/MonthNavigator';
import { CalendarGrid } from '@/components/calendar/CalendarGrid';
import { shiftMonth, useCalendarMatrix, type DayCell } from '@/hooks/useCalendar';

export default function CalendarScreen() {
  const { books } = useBookStore();
  const [month, setMonth] = useState(() => new Date());
  const weeks = useCalendarMatrix(month, books);

  const onPressDay = (cell: DayCell) => {
    const seen = new Set<number>();
    const all = [
      ...cell.finishedBooks,
      ...cell.startedBooks,
      ...cell.rangeBooks.map((r) => r.book),
    ].filter((b) => {
      if (seen.has(b.id)) return false;
      seen.add(b.id);
      return true;
    });
    if (!all.length) {
      Alert.alert(cell.dateKey, '기록 없음', [
        { text: '취소', style: 'cancel' },
        {
          text: '+ 추가',
          onPress: () => router.push('/book-form'),
        },
      ]);
      return;
    }
    Alert.alert(
      cell.dateKey,
      all.map((b) => `• ${b.title}${b.finish_date ? '' : ' (읽는 중)'}`).join('\n'),
      [
        { text: '닫기', style: 'cancel' },
        {
          text: '+ 추가',
          onPress: () => router.push('/book-form'),
        },
        ...all.slice(0, 2).map((b) => ({
          text: b.title,
          onPress: () =>
            router.push({ pathname: '/book-detail', params: { id: String(b.id) } }),
        })),
      ]
    );
  };

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
        <View style={styles.footer}>
          <Text style={styles.footerText}>총 {books.length}권 기록됨</Text>
        </View>
      </ScrollView>
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
  footer: { padding: 24, alignItems: 'center' },
  footerText: { fontSize: 12, color: Colors.textSecondary },
});
