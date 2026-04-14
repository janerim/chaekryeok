import { useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  SafeAreaView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Colors } from '@/constants/colors';
import { useBookStore } from '@/store/bookStore';
import type { Book } from '@/db/database';

type Filter = 'all' | 'reading' | 'finished' | 'stopped';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'reading', label: '읽는 중' },
  { key: 'finished', label: '완독' },
  { key: 'stopped', label: '중단' },
];

export default function AllRecordsScreen() {
  const { books } = useBookStore();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  const { sections, totalCount } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = books.filter((b) => {
      const isStopped = b.is_stopped === 1;
      if (filter === 'reading' && (b.finish_date || !b.start_date || isStopped))
        return false;
      if (filter === 'finished' && !b.finish_date) return false;
      if (filter === 'stopped' && !isStopped) return false;
      if (!q) return true;
      return (
        b.title.toLowerCase().includes(q) ||
        (b.author ?? '').toLowerCase().includes(q) ||
        (b.publisher ?? '').toLowerCase().includes(q)
      );
    });

    const groupKey = (b: Book) => {
      const d = b.finish_date ?? b.start_date ?? b.created_at;
      return (d ?? '').slice(0, 7); // yyyy-MM
    };
    const map = new Map<string, Book[]>();
    for (const b of filtered) {
      const k = groupKey(b) || '날짜 없음';
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(b);
    }
    const sortedKeys = [...map.keys()].sort((a, b) => (a < b ? 1 : -1));
    const sections = sortedKeys.map((k) => {
      const [y, m] = k.split('-');
      const title = y && m ? `${y}년 ${Number(m)}월` : '날짜 없음';
      return { key: k, title, year: y, data: map.get(k)! };
    });
    return { sections, totalCount: filtered.length };
  }, [books, filter, query]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="제목, 저자, 출판사 검색"
          placeholderTextColor={Colors.textSecondary}
          style={styles.search}
        />
        <View style={styles.tabs}>
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={() => setFilter(f.key)}
                style={[styles.tab, active && styles.tabActive]}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.count}>{totalCount}권</Text>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(b) => String(b.id)}
        renderItem={({ item }) => <Row book={item} />}
        renderSectionHeader={({ section }) => {
          const prevIdx = sections.findIndex((s) => s.key === section.key) - 1;
          const prevYear = prevIdx >= 0 ? sections[prevIdx].year : null;
          const yearChanged = !!section.year && section.year !== prevYear;
          return (
            <View style={styles.sectionHeader}>
              {yearChanged && (
                <View style={styles.yearDivider}>
                  <View style={styles.yearLine} />
                  <Text style={styles.yearText}>{section.year}</Text>
                  <View style={styles.yearLine} />
                </View>
              )}
              <View style={styles.monthRow}>
                <Text style={styles.monthTitle}>{section.title}</Text>
                <Text style={styles.monthCount}>{section.data.length}권</Text>
              </View>
            </View>
          );
        }}
        contentContainerStyle={
          sections.length === 0 ? styles.emptyWrap : styles.list
        }
        ListEmptyComponent={<Text style={styles.empty}>기록이 없어요</Text>}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        SectionSeparatorComponent={() => <View style={{ height: 8 }} />}
        stickySectionHeadersEnabled={false}
      />
    </SafeAreaView>
  );
}

function Row({ book }: { book: Book }) {
  const isStopped = book.is_stopped === 1;
  const isReading = !!book.start_date && !book.finish_date && !isStopped;
  return (
    <Pressable
      style={styles.row}
      onPress={() =>
        router.push({ pathname: '/book-detail', params: { id: String(book.id) } })
      }
    >
      {book.cover_local_path ? (
        <Image source={{ uri: book.cover_local_path }} style={styles.cover} />
      ) : (
        <View style={[styles.cover, styles.coverEmpty]}>
          <Text style={styles.coverEmptyText} numberOfLines={2}>
            {book.title}
          </Text>
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>
          {book.title}
        </Text>
        {!!book.author && (
          <Text style={styles.sub} numberOfLines={1}>
            {book.author}
          </Text>
        )}
        <Text style={styles.date} numberOfLines={1}>
          {book.finish_date
            ? `완독 · ${book.finish_date}`
            : isStopped
              ? `중단 · ${book.start_date ?? '—'}부터`
              : isReading
                ? `읽는 중 · ${book.start_date}부터`
                : '날짜 미설정'}
        </Text>
        <View style={styles.meta}>
          {!!book.genre && (
            <View style={styles.chip}>
              <Text style={styles.chipText}>{book.genre}</Text>
            </View>
          )}
          {!!book.rating && (
            <Text style={styles.rating}>★ {book.rating.toFixed(1)}</Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  search: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
  },
  tabs: { flexDirection: 'row', gap: 6 },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  tabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabText: { fontSize: 13, color: Colors.textPrimary },
  tabTextActive: { color: '#fff', fontWeight: '600' },
  count: { fontSize: 12, color: Colors.textSecondary },
  list: { padding: 16 },
  sep: { height: 12 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  empty: { fontSize: 14, color: Colors.textSecondary },
  row: {
    flexDirection: 'row',
    gap: 12,
    padding: 10,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cover: {
    width: 56,
    height: 80,
    borderRadius: 4,
    backgroundColor: Colors.background,
  },
  coverEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  coverEmptyText: {
    fontSize: 9,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  info: { flex: 1, gap: 3, justifyContent: 'center' },
  title: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  sub: { fontSize: 13, color: Colors.textSecondary },
  date: { fontSize: 12, color: Colors.textSecondary },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipText: { fontSize: 11, color: Colors.textSecondary },
  rating: { fontSize: 12, color: Colors.star, fontWeight: '600' },
  sectionHeader: { backgroundColor: Colors.background, paddingTop: 4 },
  yearDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 10,
  },
  yearLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
  },
  yearText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: 0.5,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingVertical: 6,
    marginBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  monthTitle: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  monthCount: { fontSize: 11, color: Colors.textSecondary },
});
