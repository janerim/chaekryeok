import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors } from '@/constants/colors';
import { getWishlistItem, type WishlistInput } from '@/db/database';
import { useWishlistStore } from '@/store/wishlistStore';
import { GenreSelector } from '@/components/book/GenreTag';
import { deleteLocalImage, pickWebImage } from '@/hooks/useImagePicker';

const EMPTY: WishlistInput = {
  title: '',
  author: '',
  publisher: '',
  genre: null,
  memo: '',
  cover_local_path: null,
};

export default function WishlistFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editId = id ? Number(id) : null;
  const isEdit = editId !== null;

  const { add, edit } = useWishlistStore();
  const [form, setForm] = useState<WishlistInput>(EMPTY);
  const [originalCover, setOriginalCover] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const memoY = useRef(0);

  useEffect(() => {
    if (!isEdit || editId === null) return;
    getWishlistItem(editId).then((w) => {
      if (!w) return;
      setForm({
        title: w.title,
        author: w.author ?? '',
        publisher: w.publisher ?? '',
        genre: w.genre,
        memo: w.memo ?? '',
        cover_local_path: w.cover_local_path ?? null,
      });
      setOriginalCover(w.cover_local_path ?? null);
    });
  }, [editId, isEdit]);

  const update = <K extends keyof WishlistInput>(k: K, v: WishlistInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const onPickCover = async () => {
    const path = await pickWebImage(form.title || '');
    if (path) update('cover_local_path', path);
  };

  const onSave = async () => {
    if (!form.title.trim()) {
      Alert.alert('제목을 입력해주세요');
      return;
    }
    setSaving(true);
    try {
      const payload: WishlistInput = {
        title: form.title.trim(),
        author: form.author?.trim() || null,
        publisher: form.publisher?.trim() || null,
        genre: form.genre,
        memo: form.memo?.trim() || null,
        cover_local_path: form.cover_local_path ?? null,
      };
      if (isEdit && editId !== null) {
        if (originalCover && originalCover !== payload.cover_local_path) {
          await deleteLocalImage(originalCover);
        }
        await edit(editId, payload);
      } else {
        await add(payload);
      }
      router.back();
    } catch (e: any) {
      Alert.alert('저장 실패', e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
      >
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
        <View onLayout={(e) => { memoY.current = e.nativeEvent.layout.y; }}>
          <Field label="메모">
            <TextInput
              value={form.memo ?? ''}
              onChangeText={(v) => update('memo', v)}
              style={[styles.input, styles.multiline]}
              placeholder="왜 읽고 싶은지, 어디서 봤는지 등"
              placeholderTextColor={Colors.textSecondary}
              multiline
              textAlignVertical="top"
              onFocus={() => {
                setTimeout(() => {
                  scrollRef.current?.scrollTo({ y: memoY.current - 20, animated: true });
                }, 300);
              }}
            />
          </Field>
        </View>

        <Pressable
          style={[styles.primaryBtn, saving && { opacity: 0.5 }]}
          disabled={saving}
          onPress={onSave}
        >
          <Text style={styles.primaryBtnText}>저장하기</Text>
        </Pressable>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
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
  primaryBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  coverWrap: { alignSelf: 'center', marginBottom: 4 },
  coverImg: {
    width: 140,
    height: 200,
    borderRadius: 6,
    backgroundColor: Colors.surface,
  },
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
  coverPlaceholderText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  coverHint: { fontSize: 11, color: Colors.textSecondary },
});
