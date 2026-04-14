import { useEffect, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { differenceInCalendarDays } from 'date-fns';
import { Colors } from '@/constants/colors';
import { getBook, type Book } from '@/db/database';
import { useBookStore } from '@/store/bookStore';
import { StarRating } from '@/components/book/StarRating';

export default function BookDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const bookId = id ? Number(id) : null;
  const { books } = useBookStore();
  const [book, setBook] = useState<Book | null>(null);

  useEffect(() => {
    if (bookId === null) return;
    getBook(bookId).then(setBook);
  }, [bookId, books]);

  if (!book) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>불러오는 중...</Text>
      </View>
    );
  }

  const period =
    book.start_date && book.finish_date
      ? differenceInCalendarDays(
          new Date(book.finish_date),
          new Date(book.start_date)
        ) + 1
      : null;
  const isStopped = book.is_stopped === 1;
  const isReading = !!book.start_date && !book.finish_date && !isStopped;
  const status = isStopped ? '중단' : isReading ? '읽는 중' : book.finish_date ? '완독' : '기록';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/book-form',
                  params: { id: String(book.id) },
                })
              }
              hitSlop={10}
            >
              <Text style={styles.headerBtn}>편집</Text>
            </Pressable>
          ),
        }}
      />
      <View style={styles.coverWrap}>
        {book.cover_local_path ? (
          <Image source={{ uri: book.cover_local_path }} style={styles.cover} />
        ) : (
          <View style={[styles.cover, styles.coverEmpty]}>
            <Text style={styles.muted}>표지 없음</Text>
          </View>
        )}
      </View>

      <Text style={styles.title}>{book.title}</Text>
      {!!book.author && <Text style={styles.sub}>{book.author}</Text>}

      <View style={styles.badges}>
        <View
          style={[
            styles.badge,
            {
              backgroundColor: isReading
                ? Colors.accent
                : isStopped
                  ? Colors.textSecondary
                  : book.finish_date
                    ? Colors.primary
                    : Colors.textSecondary,
            },
          ]}
        >
          <Text style={styles.badgeText}>{status}</Text>
        </View>
        {!!book.genre && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{book.genre}</Text>
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Row label="제목" value={book.title} />
        <Row label="저자" value={book.author} />
        <Row label="출판사" value={book.publisher} />
        <Row label="장르" value={book.genre} />
      </View>

      <View style={styles.card}>
        <Row label="시작일" value={book.start_date} />
        <Row
          label="완독일"
          value={
            book.finish_date ?? (isReading ? '읽는 중' : isStopped ? '중단됨' : null)
          }
        />
        <Row label="기간" value={period !== null ? `${period}일` : null} />
        <Row label="읽는 중" value={isReading ? '예' : '아니오'} />
        <Row label="읽다가 멈춤" value={isStopped ? '예' : '아니오'} />
      </View>

      <View style={styles.card}>
        <Row label="소장 여부" value={book.is_owned === 1 ? '소장' : '미소장'} />
        <Row label="읽은 횟수" value={`${book.read_count}회`} />
        <View style={styles.row}>
          <Text style={styles.rowLabel}>평점</Text>
          <View style={styles.rowValueWrap}>
            {book.rating ? (
              <StarRating value={book.rating} readonly size={18} />
            ) : (
              <Text style={styles.rowValueMuted}>—</Text>
            )}
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Block label="한줄 감상" value={book.short_review} />
        <Block label="메모/독후감" value={book.memo} />
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text
        style={[styles.rowValue, !value && styles.rowValueMuted]}
        numberOfLines={2}
      >
        {value || '—'}
      </Text>
    </View>
  );
}

function Block({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <View style={styles.block}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.blockValue, !value && styles.rowValueMuted]}>
        {value || '—'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, gap: 14 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  muted: { fontSize: 13, color: Colors.textSecondary },
  coverWrap: { alignItems: 'center', marginTop: 8 },
  cover: {
    width: 160,
    height: 230,
    borderRadius: 8,
    backgroundColor: Colors.surface,
  },
  coverEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  sub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
    marginTop: 4,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: Colors.textSecondary,
  },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 11,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    alignItems: 'center',
  },
  rowLabel: {
    width: 96,
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  rowValue: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
    textAlign: 'right',
  },
  rowValueMuted: {
    color: Colors.textSecondary,
    opacity: 0.7,
  },
  rowValueWrap: { flex: 1, alignItems: 'flex-end' },
  block: {
    paddingVertical: 11,
    gap: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  blockValue: {
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 21,
  },
  headerBtn: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '600',
    paddingHorizontal: 8,
  },
});
