import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Colors } from '@/constants/colors';
import {
  buildBackupJson,
  importBackup,
  parseBackupJson,
  wipeAllData,
} from '@/lib/backup';
import { useBookStore } from '@/store/bookStore';
import { useWishlistStore } from '@/store/wishlistStore';
import { SAMPLE_BOOKS } from '@/constants/sampleBooks';
import { SAMPLE_WISHLIST } from '@/constants/sampleWishlist';

export default function BackupScreen() {
  const { books, refresh, addBook } = useBookStore();
  const {
    items: wishlistItems,
    refresh: refreshWishlist,
    add: addWishlist,
  } = useWishlistStore();
  const [busy, setBusy] = useState(false);
  const [pasted, setPasted] = useState('');

  useEffect(() => {
    refreshWishlist().catch(console.error);
  }, [refreshWishlist]);

  const onExport = async () => {
    setBusy(true);
    try {
      const { json, path } = await buildBackupJson();
      await Clipboard.setStringAsync(json);
      await Share.share({
        message: json,
        title: '책력 백업',
      });
      Alert.alert(
        '내보내기 완료',
        `기록 ${books.length}권 · 읽고싶은 ${wishlistItems.length}권을 내보냈습니다.\n클립보드에도 복사되었고, 파일은 다음 경로에 저장됐어요.\n\n${path}`
      );
    } catch (e: any) {
      Alert.alert('내보내기 실패', e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  };

  const onPasteClipboard = async () => {
    try {
      const s = await Clipboard.getStringAsync();
      if (!s) {
        Alert.alert('클립보드가 비어있습니다');
        return;
      }
      setPasted(s);
    } catch (e: any) {
      Alert.alert('붙여넣기 실패', e?.message ?? String(e));
    }
  };

  const runImport = async (mode: 'replace' | 'append') => {
    setBusy(true);
    try {
      const parsed = parseBackupJson(pasted);
      const n = await importBackup(parsed, mode);
      await refresh();
      await refreshWishlist();
      setPasted('');
      Alert.alert(
        '불러오기 완료',
        `기록 ${n.books}권 · 읽고싶은 ${n.wishlist}권을 ${mode === 'replace' ? '복원' : '추가'}했어요.`
      );
    } catch (e: any) {
      Alert.alert('불러오기 실패', e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  };

  const onImport = () => {
    if (!pasted.trim()) {
      Alert.alert('JSON을 먼저 붙여넣어 주세요');
      return;
    }
    Alert.alert(
      '불러오기 방식',
      `기존 기록 ${books.length}권 · 읽고싶은 ${wishlistItems.length}권에 대해 어떻게 할까요?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '추가 (중복 가능)',
          onPress: () => runImport('append'),
        },
        {
          text: '덮어쓰기 (전체 삭제 후 복원)',
          style: 'destructive',
          onPress: () => runImport('replace'),
        },
      ]
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.card}>
        <Text style={styles.cardTitle}>내보내기</Text>
        <Text style={styles.cardDesc}>
          현재 기록 {books.length}권과 읽고 싶은 책 {wishlistItems.length}권을
          JSON으로 저장합니다. 공유 시트에서 Files / 메일 / 메모 등으로 보관할 수
          있어요. 같은 내용이 클립보드에도 복사됩니다.
        </Text>
        <Pressable
          onPress={onExport}
          disabled={busy || (books.length === 0 && wishlistItems.length === 0)}
          style={({ pressed }) => [
            styles.primaryBtn,
            (pressed ||
              busy ||
              (books.length === 0 && wishlistItems.length === 0)) && {
              opacity: 0.5,
            },
          ]}
        >
          <Text style={styles.primaryBtnText}>백업 파일 내보내기</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>불러오기</Text>
        <Text style={styles.cardDesc}>
          백업해 둔 JSON을 붙여넣어 복원합니다. 표지 이미지 경로는 새 기기에서는
          비어 보일 수 있어요.
        </Text>
        <Pressable
          onPress={onPasteClipboard}
          disabled={busy}
          style={({ pressed }) => [
            styles.secondaryBtn,
            (pressed || busy) && { opacity: 0.5 },
          ]}
        >
          <Text style={styles.secondaryBtnText}>클립보드에서 붙여넣기</Text>
        </Pressable>
        <TextInput
          value={pasted}
          onChangeText={setPasted}
          placeholder="또는 여기에 직접 붙여넣기"
          placeholderTextColor={Colors.textSecondary}
          multiline
          textAlignVertical="top"
          style={styles.textarea}
        />
        <Pressable
          onPress={onImport}
          disabled={busy || !pasted.trim()}
          style={({ pressed }) => [
            styles.primaryBtn,
            (pressed || busy || !pasted.trim()) && { opacity: 0.5 },
          ]}
        >
          <Text style={styles.primaryBtnText}>불러오기 실행</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>전체 삭제</Text>
        <Text style={styles.cardDesc}>
          기록 {books.length}권과 읽고 싶은 책 {wishlistItems.length}권,
          저장된 표지 이미지를 모두 영구 삭제합니다. 되돌릴 수 없으니 먼저
          백업을 권장해요.
        </Text>
        <Pressable
          onPress={() => {
            const total = books.length + wishlistItems.length;
            if (total === 0) {
              Alert.alert('삭제할 데이터가 없어요');
              return;
            }
            Alert.alert(
              '전체 삭제 확인',
              `정말 기록 ${books.length}권 · 읽고싶은 ${wishlistItems.length}권을 모두 삭제할까요? 되돌릴 수 없습니다.`,
              [
                { text: '취소', style: 'cancel' },
                {
                  text: '전체 삭제',
                  style: 'destructive',
                  onPress: async () => {
                    setBusy(true);
                    try {
                      await wipeAllData();
                      await refresh();
                      await refreshWishlist();
                      Alert.alert('삭제 완료', '모든 데이터가 삭제되었습니다.', [
                        { text: '확인', onPress: () => router.back() },
                      ]);
                    } catch (e: any) {
                      Alert.alert('삭제 실패', e?.message ?? String(e));
                    } finally {
                      setBusy(false);
                    }
                  },
                },
              ]
            );
          }}
          disabled={busy}
          style={({ pressed }) => [
            styles.dangerBtn,
            (pressed || busy) && { opacity: 0.5 },
          ]}
        >
          <Text style={styles.dangerBtnText}>전체 데이터 삭제</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>샘플 데이터 넣기</Text>
        <Text style={styles.cardDesc}>
          스크린샷용 더미 데이터를 현재 DB에 추가합니다. 기록 {SAMPLE_BOOKS.length}권,
          읽고 싶은 책 {SAMPLE_WISHLIST.length}권이 들어갑니다.
        </Text>
        <Pressable
          onPress={() => {
            Alert.alert(
              '샘플 추가',
              '기존 데이터는 유지되고 샘플이 추가됩니다. 진행할까요?',
              [
                { text: '취소', style: 'cancel' },
                {
                  text: '추가',
                  onPress: async () => {
                    setBusy(true);
                    try {
                      for (const b of SAMPLE_BOOKS) await addBook(b);
                      for (const w of SAMPLE_WISHLIST) await addWishlist(w);
                      await refresh();
                      await refreshWishlist();
                      Alert.alert(
                        '샘플 추가 완료',
                        `기록 ${SAMPLE_BOOKS.length}권 · 읽고싶은 ${SAMPLE_WISHLIST.length}권을 추가했어요.`
                      );
                    } catch (e: any) {
                      Alert.alert('실패', e?.message ?? String(e));
                    } finally {
                      setBusy(false);
                    }
                  },
                },
              ]
            );
          }}
          disabled={busy}
          style={({ pressed }) => [
            styles.secondaryBtn,
            (pressed || busy) && { opacity: 0.5 },
          ]}
        >
          <Text style={styles.secondaryBtnText}>샘플 데이터 추가</Text>
        </Pressable>
      </View>

      {busy && (
        <View style={styles.busyOverlay}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, gap: 16 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    gap: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  cardDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  primaryBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 13,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  secondaryBtn: {
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  secondaryBtnText: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  textarea: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 10,
    fontSize: 12,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
    fontFamily: 'Menlo',
  },
  dangerBtn: {
    backgroundColor: Colors.sunday,
    paddingVertical: 13,
    borderRadius: 8,
    alignItems: 'center',
  },
  dangerBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  busyOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
});
