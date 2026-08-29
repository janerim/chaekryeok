import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { differenceInCalendarDays } from 'date-fns';
import { Colors } from '@/constants/colors';
import { resolveCoverUri } from '@/lib/covers';
import { formatWrittenAt } from '@/lib/datetime';
import {
  deleteNote,
  getBook,
  insertNote,
  listNotes,
  updateNote,
  type Book,
  type BookNote,
} from '@/db/database';
import { useBookStore } from '@/store/bookStore';
import { StarRating } from '@/components/book/StarRating';

export default function BookDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const bookId = id ? Number(id) : null;
  const { books } = useBookStore();
  const insets = useSafeAreaInsets();
  const [book, setBook] = useState<Book | null>(null);
  const [notes, setNotes] = useState<BookNote[]>([]);
  // editing: null = 닫힘, 'new' = 새 기록, 숫자 = 해당 기록 수정
  const [editing, setEditing] = useState<number | 'new' | null>(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  const reloadNotes = useCallback(async () => {
    if (bookId === null) return;
    setNotes(await listNotes(bookId));
  }, [bookId]);

  useEffect(() => {
    if (bookId === null) return;
    getBook(bookId).then(setBook);
    reloadNotes();
  }, [bookId, books, reloadNotes]);

  const openNew = () => {
    setDraft('');
    setEditing('new');
  };

  const openEdit = (note: BookNote) => {
    setDraft(note.body);
    setEditing(note.id);
  };

  const onSaveNote = async () => {
    const body = draft.trim();
    if (!body || bookId === null || editing === null) return;
    setBusy(true);
    try {
      if (editing === 'new') {
        await insertNote(bookId, body);
      } else {
        await updateNote(editing, body);
      }
      await reloadNotes();
      setEditing(null);
    } catch (e: any) {
      Alert.alert('저장 실패', e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  };

  const onDeleteNote = (note: BookNote) => {
    Alert.alert('이 기록을 지울까요?', '되돌릴 수 없습니다.', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          await deleteNote(note.id);
          await reloadNotes();
          setEditing(null);
        },
      },
    ]);
  };

  if (!book) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>불러오는 중...</Text>
      </View>
    );
  }

  const endForPeriod = book.finish_date ?? (book.is_stopped === 1 ? book.stopped_date : null);
  const period =
    book.start_date && endForPeriod
      ? differenceInCalendarDays(
          new Date(endForPeriod),
          new Date(book.start_date)
        ) + 1
      : null;
  const isStopped = book.is_stopped === 1;
  const isReading = !!book.start_date && !book.finish_date && !isStopped;
  const status = isStopped ? '중단' : isReading ? '읽는 중' : book.finish_date ? '완독' : '기록';

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
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
                hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
                style={({ pressed }) => [
                  styles.headerBtnWrap,
                  pressed && { opacity: 0.45 },
                ]}
              >
                <Text style={styles.headerBtn}>편집</Text>
              </Pressable>
            ),
          }}
        />
        <View style={styles.coverWrap}>
          {book.cover_local_path ? (
            <Image source={{ uri: resolveCoverUri(book.cover_local_path)! }} style={styles.cover} />
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
          {book.from_wishlist === 1 && (
            <View style={[styles.badge, { backgroundColor: Colors.accent }]}>
              <Text style={styles.badgeText}>🔖 위시리스트</Text>
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
          {book.from_wishlist === 1 && (
            <Row
              label="읽고 싶어한 날"
              value={book.wishlist_added_date?.slice(0, 10) ?? null}
            />
          )}
          <Row label="시작일" value={book.start_date} />
          <Row
            label="완독일"
            value={
              book.finish_date ?? (isReading ? '읽는 중' : isStopped ? '중단됨' : null)
            }
          />
          {isStopped && <Row label="중단일" value={book.stopped_date} />}
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
          <Block
            label="한줄 감상"
            value={book.short_review}
            writtenAt={book.short_review_updated_at}
          />
        </View>

        <View style={styles.card}>
          <View style={styles.notesHeader}>
            <Text style={styles.rowLabel}>메모/독후감</Text>
            {notes.length > 0 && (
              <Text style={styles.notesCount}>기록 {notes.length}개</Text>
            )}
          </View>

          {notes.length === 0 ? (
            <Text style={[styles.blockValue, styles.rowValueMuted]}>
              아직 기록이 없습니다.
            </Text>
          ) : (
            notes.map((n) => (
              <Pressable
                key={n.id}
                onPress={() => openEdit(n)}
                style={({ pressed }) => [styles.note, pressed && { opacity: 0.6 }]}
              >
                <Text style={styles.noteStamp}>
                  {formatWrittenAt(n.created_at)}
                  {n.updated_at ? ' · 수정됨' : ''}
                </Text>
                <Text style={styles.blockValue}>{n.body}</Text>
              </Pressable>
            ))
          )}

          <Pressable
            onPress={openNew}
            style={({ pressed }) => [styles.addNote, pressed && { opacity: 0.6 }]}
          >
            <Text style={styles.addNoteText}>＋ 기록 추가</Text>
          </Pressable>
        </View>

        <View style={{ height: 32 }} />

      </ScrollView>

      <Modal
        visible={editing !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setEditing(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View
            style={[
              styles.modalCard,
              { paddingBottom: Math.max(insets.bottom, 12) + 16 },
            ]}
          >
            <Text style={styles.modalTitle}>
              {editing === 'new' ? '새 기록' : '기록 수정'}
            </Text>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              style={styles.modalInput}
              placeholder="자유롭게 기록"
              placeholderTextColor={Colors.textSecondary}
              multiline
              autoFocus
              textAlignVertical="top"
            />
            <View style={styles.modalActions}>
              <Pressable onPress={() => setEditing(null)} style={styles.modalBtn}>
                <Text style={styles.modalBtnText}>취소</Text>
              </Pressable>
              <Pressable
                onPress={onSaveNote}
                disabled={busy || !draft.trim()}
                style={[
                  styles.modalBtn,
                  styles.modalSave,
                  (busy || !draft.trim()) && { opacity: 0.5 },
                ]}
              >
                <Text style={[styles.modalBtnText, styles.modalSaveText]}>
                  저장
                </Text>
              </Pressable>
            </View>

            {typeof editing === 'number' && (
              <Pressable
                onPress={() => {
                  const target = notes.find((n) => n.id === editing);
                  if (target) onDeleteNote(target);
                }}
                style={({ pressed }) => [
                  styles.modalDelete,
                  pressed && { opacity: 0.6 },
                ]}
              >
                <Text style={styles.modalDeleteText}>이 기록 삭제</Text>
              </Pressable>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
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

function Block({
  label,
  value,
  writtenAt,
}: {
  label: string;
  value: string | null | undefined;
  writtenAt?: string | null;
}) {
  const stamp = value ? formatWrittenAt(writtenAt) : null;
  return (
    <View style={styles.block}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.blockValue, !value && styles.rowValueMuted]}>
        {value || '—'}
      </Text>
      {!!stamp && <Text style={styles.blockStamp}>{stamp} 작성</Text>}
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
  blockStamp: {
    fontSize: 11,
    color: Colors.textSecondary,
    opacity: 0.8,
    textAlign: 'right',
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingBottom: 4,
  },
  notesCount: { fontSize: 11, color: Colors.textSecondary, opacity: 0.8 },
  note: {
    paddingVertical: 10,
    gap: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  noteStamp: { fontSize: 11, color: Colors.textSecondary, opacity: 0.8 },
  addNote: {
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  addNoteText: { fontSize: 14, color: Colors.primary, fontWeight: '600' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  modalInput: {
    minHeight: 140,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    lineHeight: 21,
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 4,
  },
  modalBtn: { paddingVertical: 12, paddingHorizontal: 18, borderRadius: 8 },
  modalBtnText: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  modalSave: { backgroundColor: Colors.primary },
  modalSaveText: { color: '#fff' },
  modalDelete: {
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    marginTop: 4,
  },
  modalDeleteText: { fontSize: 14, fontWeight: '600', color: '#C0392B' },
  // 터치 영역은 Pressable 쪽에서 확보한다 (Text 패딩만으로는 세로가 너무 얇다)
  headerBtnWrap: { paddingVertical: 10, paddingHorizontal: 12, marginRight: -4 },
  headerBtn: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});
