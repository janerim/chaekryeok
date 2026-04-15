import { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors } from '@/constants/colors';
import { useBookStore } from '@/store/bookStore';
import { useWishlistStore } from '@/store/wishlistStore';
import { getBook, getWishlistItem, type BookInput, type Wishlist } from '@/db/database';
import { StarRating } from '@/components/book/StarRating';
import { GenreSelector } from '@/components/book/GenreTag';
import { DatePickerButton } from '@/components/common/DatePickerButton';
import { deleteLocalImage, pickWebImage } from '@/hooks/useImagePicker';

const EMPTY: BookInput = {
  title: '',
  author: '',
  publisher: '',
  genre: null,
  cover_local_path: null,
  start_date: null,
  finish_date: null,
  is_owned: 0,
  is_stopped: 0,
  stopped_date: null,
  from_wishlist: 0,
  wishlist_added_date: null,
  rating: 0,
  short_review: '',
  memo: '',
  read_count: 1,
};

export default function BookFormScreen() {
  const { id, wishlistId, startDate } = useLocalSearchParams<{
    id?: string;
    wishlistId?: string;
    startDate?: string;
  }>();
  const editId = id ? Number(id) : null;
  const isEdit = editId !== null;
  const initialWishlistId = wishlistId ? Number(wishlistId) : null;

  const { addBook, editBook, removeBook } = useBookStore();
  const {
    items: wishlistItems,
    refresh: refreshWishlist,
    remove: removeWishlist,
  } = useWishlistStore();
  const [form, setForm] = useState<BookInput>(() =>
    startDate ? { ...EMPTY, start_date: startDate } : EMPTY
  );
  const [isReading, setIsReading] = useState(false);
  const [originalCover, setOriginalCover] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [fromWishlistId, setFromWishlistId] = useState<number | null>(
    initialWishlistId
  );
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (isEdit || initialWishlistId === null) return;
    getWishlistItem(initialWishlistId).then((w) => {
      if (!w) return;
      applyWishlist(w);
    });
  }, [initialWishlistId, isEdit]);

  useEffect(() => {
    if (!isEdit) refreshWishlist().catch(console.error);
  }, [isEdit, refreshWishlist]);

  const applyWishlist = (w: Wishlist) => {
    setForm((f) => ({
      ...f,
      title: w.title,
      author: w.author ?? '',
      publisher: w.publisher ?? '',
      genre: w.genre,
      memo: w.memo ?? '',
      cover_local_path: w.cover_local_path ?? f.cover_local_path,
      wishlist_added_date: w.created_at ?? null,
    }));
    setFromWishlistId(w.id);
  };

  useEffect(() => {
    if (!isEdit || editId === null) return;
    getBook(editId).then((b) => {
      if (!b) return;
      setForm({
        title: b.title,
        author: b.author ?? '',
        publisher: b.publisher ?? '',
        genre: b.genre,
        cover_local_path: b.cover_local_path,
        start_date: b.start_date,
        finish_date: b.finish_date,
        is_owned: b.is_owned,
        is_stopped: b.is_stopped ?? 0,
        stopped_date: b.stopped_date ?? null,
        from_wishlist: b.from_wishlist ?? 0,
        wishlist_added_date: b.wishlist_added_date ?? null,
        rating: b.rating ?? 0,
        short_review: b.short_review ?? '',
        memo: b.memo ?? '',
        read_count: b.read_count,
      });
      setIsReading(
        !b.finish_date && !!b.start_date && (b.is_stopped ?? 0) !== 1
      );
      setOriginalCover(b.cover_local_path);
    });
  }, [editId, isEdit]);

  const update = <K extends keyof BookInput>(k: K, v: BookInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const onPickCover = async () => {
    const path = await pickWebImage(form.title || '');
    if (path) update('cover_local_path', path);
  };

  const onToggleReading = (v: boolean) => {
    setIsReading(v);
    if (v) {
      update('finish_date', null);
      update('is_stopped', 0);
    }
  };

  const onToggleStopped = (v: boolean) => {
    update('is_stopped', v ? 1 : 0);
    if (v) {
      update('finish_date', null);
      setIsReading(false);
      setForm((f) =>
        f.stopped_date
          ? f
          : { ...f, stopped_date: new Date().toISOString().slice(0, 10) }
      );
    } else {
      update('stopped_date', null);
    }
  };

  const onSave = async () => {
    if (!form.title.trim()) {
      Alert.alert('제목을 입력해주세요');
      return;
    }
    if (form.short_review && form.short_review.length > 200) {
      Alert.alert('한줄 감상은 200자 이내로 입력해주세요');
      return;
    }
    setSaving(true);
    try {
      const payload: BookInput = {
        ...form,
        title: form.title.trim(),
        author: form.author?.trim() || null,
        publisher: form.publisher?.trim() || null,
        short_review: form.short_review?.trim() || null,
        memo: form.memo?.trim() || null,
        rating: form.rating || null,
        finish_date: isReading || form.is_stopped ? null : form.finish_date,
        stopped_date: form.is_stopped ? form.stopped_date : null,
        from_wishlist:
          fromWishlistId !== null ? 1 : form.from_wishlist ?? 0,
      };
      if (isEdit && editId !== null) {
        if (originalCover && originalCover !== payload.cover_local_path) {
          await deleteLocalImage(originalCover);
        }
        await editBook(editId, payload);
      } else {
        await addBook(payload);
        if (fromWishlistId !== null) {
          await removeWishlist(fromWishlistId, { keepCover: true }).catch(
            () => {}
          );
        }
      }
      router.back();
    } catch (e: any) {
      Alert.alert('저장 실패', e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  };

  const onDelete = () => {
    if (!isEdit || editId === null) return;
    Alert.alert('삭제 확인', '이 기록을 삭제할까요? 되돌릴 수 없습니다.', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          await removeBook(editId);
          router.back();
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: Colors.background }}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {!isEdit && wishlistItems.length > 0 && (
          <View style={styles.wishlistBanner}>
            {fromWishlistId !== null ? (
              <View style={styles.wishlistBannerRow}>
                <Text style={styles.wishlistBannerText}>
                  🔖 읽고 싶은 책에서 가져왔어요
                </Text>
                <Pressable
                  onPress={() => setFromWishlistId(null)}
                  hitSlop={8}
                >
                  <Text style={styles.wishlistClear}>해제</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={() => setPickerOpen(true)}
                style={({ pressed }) => [
                  styles.wishlistBtn,
                  pressed && { opacity: 0.6 },
                ]}
              >
                <Text style={styles.wishlistBtnText}>
                  🔖 읽고 싶은 책에서 가져오기 ({wishlistItems.length})
                </Text>
              </Pressable>
            )}
          </View>
        )}

        <Modal
          visible={pickerOpen}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setPickerOpen(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>읽고 싶은 책 선택</Text>
              <Pressable onPress={() => setPickerOpen(false)} hitSlop={8}>
                <Text style={styles.modalClose}>닫기</Text>
              </Pressable>
            </View>
            <FlatList
              data={wishlistItems}
              keyExtractor={(it) => String(it.id)}
              ItemSeparatorComponent={() => (
                <View style={styles.modalSep} />
              )}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    applyWishlist(item);
                    setPickerOpen(false);
                  }}
                  style={({ pressed }) => [
                    styles.modalRow,
                    pressed && { opacity: 0.6 },
                  ]}
                >
                  {item.cover_local_path ? (
                    <Image
                      source={{ uri: item.cover_local_path }}
                      style={styles.modalThumb}
                    />
                  ) : (
                    <View style={[styles.modalThumb, styles.modalThumbEmpty]} />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalRowTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    {!!item.author && (
                      <Text style={styles.modalRowSub} numberOfLines={1}>
                        {item.author}
                      </Text>
                    )}
                  </View>
                  {!!item.genre && (
                    <Text style={styles.modalRowGenre}>{item.genre}</Text>
                  )}
                </Pressable>
              )}
            />
          </View>
        </Modal>

        <Pressable style={styles.coverWrap} onPress={onPickCover}>
          {form.cover_local_path ? (
            <Image source={{ uri: form.cover_local_path }} style={styles.coverImg} />
          ) : (
            <View style={styles.coverPlaceholder}>
              <Text style={styles.coverPlaceholderText}>+ 표지 선택</Text>
              <Text style={styles.coverHint}>탭하여 웹 이미지 검색</Text>
            </View>
          )}
        </Pressable>

        <Field label="제목 *">
          <TextInput
            value={form.title}
            onChangeText={(v) => update('title', v)}
            style={styles.input}
            placeholder="책 제목"
            placeholderTextColor={Colors.textSecondary}
          />
        </Field>

        <Field label="저자">
          <TextInput
            value={form.author ?? ''}
            onChangeText={(v) => update('author', v)}
            style={styles.input}
            placeholder="저자"
            placeholderTextColor={Colors.textSecondary}
          />
        </Field>

        <Field label="출판사">
          <TextInput
            value={form.publisher ?? ''}
            onChangeText={(v) => update('publisher', v)}
            style={styles.input}
            placeholder="출판사"
            placeholderTextColor={Colors.textSecondary}
          />
        </Field>

        <Field label="장르">
          <GenreSelector value={form.genre} onChange={(v) => update('genre', v)} />
        </Field>

        <DatePickerButton
          label="읽기 시작한 날짜"
          value={form.start_date}
          onChange={(v) => update('start_date', v)}
        />

        <View style={styles.readingRow}>
          <Text style={styles.readingLabel}>읽는 중</Text>
          <Switch value={isReading} onValueChange={onToggleReading} />
        </View>

        <View style={styles.readingRow}>
          <Text style={styles.readingLabel}>읽다가 멈춤</Text>
          <Switch
            value={form.is_stopped === 1}
            onValueChange={onToggleStopped}
          />
        </View>

        {form.is_stopped === 1 && (
          <DatePickerButton
            label="중단한 날짜"
            value={form.stopped_date}
            onChange={(v) => update('stopped_date', v)}
          />
        )}

        <DatePickerButton
          label="다 읽은 날짜"
          value={form.finish_date}
          onChange={(v) => update('finish_date', v)}
          disabled={isReading || form.is_stopped === 1}
        />

        <View style={styles.toggleRow}>
          <Text style={styles.fieldLabel}>소장 여부</Text>
          <Switch
            value={form.is_owned === 1}
            onValueChange={(v) => update('is_owned', v ? 1 : 0)}
          />
        </View>

        <Field label="평점">
          <StarRating
            value={form.rating ?? 0}
            onChange={(v) => update('rating', v)}
          />
        </Field>

        <Field label={`한줄 감상 (${form.short_review?.length ?? 0}/200)`}>
          <TextInput
            value={form.short_review ?? ''}
            onChangeText={(v) => v.length <= 200 && update('short_review', v)}
            style={styles.input}
            placeholder="한 줄로 남기기"
            placeholderTextColor={Colors.textSecondary}
          />
        </Field>

        <Field label="메모/독후감">
          <TextInput
            value={form.memo ?? ''}
            onChangeText={(v) => update('memo', v)}
            style={[styles.input, styles.multiline]}
            placeholder="자유롭게 기록"
            placeholderTextColor={Colors.textSecondary}
            multiline
            textAlignVertical="top"
          />
        </Field>

        <Field label="읽은 횟수">
          <View style={styles.counterRow}>
            <Pressable
              style={styles.counterBtn}
              onPress={() => update('read_count', Math.max(1, form.read_count - 1))}
            >
              <Text style={styles.counterBtnText}>−</Text>
            </Pressable>
            <Text style={styles.counterValue}>{form.read_count}</Text>
            <Pressable
              style={styles.counterBtn}
              onPress={() => update('read_count', form.read_count + 1)}
            >
              <Text style={styles.counterBtnText}>+</Text>
            </Pressable>
          </View>
        </Field>

        <Pressable
          style={[styles.primaryBtn, saving && { opacity: 0.5 }]}
          disabled={saving}
          onPress={onSave}
        >
          <Text style={styles.primaryBtnText}>저장하기</Text>
        </Pressable>

        {isEdit && (
          <Pressable style={styles.deleteBtn} onPress={onDelete}>
            <Text style={styles.deleteBtnText}>삭제하기</Text>
          </Pressable>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 16 },
  coverWrap: { alignSelf: 'center', marginBottom: 4 },
  coverImg: { width: 140, height: 200, borderRadius: 6, backgroundColor: Colors.surface },
  coverPlaceholder: {
    width: 140,
    height: 200,
    borderRadius: 6,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  coverPlaceholderText: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  coverHint: { fontSize: 11, color: Colors.textSecondary },
  fieldLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: 15,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
  },
  multiline: { minHeight: 100 },
  readingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  readingLabel: { fontSize: 14, color: Colors.textPrimary, fontWeight: '500' },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  counterRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  counterBtn: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterBtnText: { fontSize: 18, color: Colors.textPrimary, fontWeight: '600' },
  counterValue: { fontSize: 16, color: Colors.textPrimary, minWidth: 24, textAlign: 'center' },
  primaryBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  deleteBtn: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.sunday,
  },
  deleteBtnText: { color: Colors.sunday, fontSize: 15, fontWeight: '600' },
  wishlistBanner: { marginBottom: 4 },
  wishlistBtn: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    backgroundColor: Colors.primaryLight ?? Colors.surface,
    alignItems: 'center',
  },
  wishlistBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  wishlistBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: Colors.primaryLight ?? Colors.surface,
  },
  wishlistBannerText: {
    fontSize: 13,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  wishlistClear: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
  },
  modalContainer: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  modalClose: { fontSize: 15, color: Colors.primary, fontWeight: '600' },
  modalSep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  modalRowTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  modalRowSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  modalThumb: {
    width: 36,
    height: 50,
    borderRadius: 4,
    backgroundColor: Colors.surface,
  },
  modalThumbEmpty: { borderWidth: 1, borderColor: Colors.border },
  modalRowGenre: {
    fontSize: 11,
    color: Colors.textPrimary,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
});
