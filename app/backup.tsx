import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
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
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Colors } from '@/constants/colors';
import {
  buildBackupJson,
  importBackup,
  parseBackupJson,
  wipeAllData,
  type ProgressFn,
} from '@/lib/backup';
import { useBookStore } from '@/store/bookStore';
import { useWishlistStore } from '@/store/wishlistStore';

export default function BackupScreen() {
  const { books, refresh } = useBookStore();
  const { items: wishlistItems, refresh: refreshWishlist } = useWishlistStore();
  const [busy, setBusy] = useState(false);
  const [pasted, setPasted] = useState('');
  const [progress, setProgress] = useState<{ label: string; pct: number } | null>(
    null
  );

  const makeProgress =
    (label: string): ProgressFn =>
    (done, total) => {
      const pct = total > 0 ? Math.round((done / total) * 100) : 100;
      setProgress((p) =>
        p && p.pct === pct && p.label === label ? p : { label, pct }
      );
    };

  useEffect(() => {
    refreshWishlist().catch(console.error);
  }, [refreshWishlist]);

  const onExport = async () => {
    setBusy(true);
    try {
      const { json } = await buildBackupJson(makeProgress('백업 중'));
      await Clipboard.setStringAsync(json);
      await Share.share({
        message: json,
        title: '책력 백업',
      });
      Alert.alert(
        '내보내기 완료',
        `기록 ${books.length}권 · 읽고싶은 ${wishlistItems.length}권을 내보냈어요.\n\n• 클립보드에 복사됨 (메모 등에 붙여넣기 가능)\n• 파일 앱 › 내 iPhone › 책력 폴더에서도 확인할 수 있어요`
      );
    } catch (e: any) {
      Alert.alert('내보내기 실패', e?.message ?? String(e));
    } finally {
      setBusy(false);
      setProgress(null);
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
      Keyboard.dismiss();
    } catch (e: any) {
      Alert.alert('붙여넣기 실패', e?.message ?? String(e));
    }
  };

  const runImport = async (mode: 'replace' | 'append', raw: string) => {
    setBusy(true);
    try {
      const parsed = parseBackupJson(raw);
      const n = await importBackup(parsed, mode, makeProgress('복원 중'));
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
      setProgress(null);
    }
  };

  const promptImport = (raw: string) => {
    Alert.alert(
      '불러오기 방식',
      `기존 기록 ${books.length}권 · 읽고싶은 ${wishlistItems.length}권에 대해 어떻게 할까요?`,
      [
        { text: '취소', style: 'cancel' },
        { text: '추가 (중복 가능)', onPress: () => runImport('append', raw) },
        {
          text: '덮어쓰기 (전체 삭제 후 복원)',
          style: 'destructive',
          onPress: () => runImport('replace', raw),
        },
      ]
    );
  };

  const onImport = () => {
    if (!pasted.trim()) {
      Alert.alert('JSON을 먼저 붙여넣어 주세요');
      return;
    }
    promptImport(pasted);
  };

  const onImportFromFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const file = result.assets?.[0];
      if (!file) return;
      const content = await FileSystem.readAsStringAsync(file.uri);
      Keyboard.dismiss();
      promptImport(content);
    } catch (e: any) {
      Alert.alert('파일 읽기 실패', e?.message ?? String(e));
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      <View style={styles.card}>
        <Text style={styles.cardTitle}>내보내기</Text>
        <Text style={styles.cardDesc}>
          현재 기록 {books.length}권과 읽고 싶은 책 {wishlistItems.length}권을
          표지 이미지까지 포함해 JSON으로 저장합니다. 이미지가 많으면 파일이 다소
          클 수 있어요. 공유 시트에서 Files / 메일 / 메모 등으로 보관할 수 있고,
          같은 내용이 클립보드에도 복사됩니다.
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
          백업해 둔 JSON 파일을 선택하거나 붙여넣어 복원합니다. 표지 이미지도 함께
          복원되므로 새 기기나 재설치 후에도 표지가 유지됩니다.
        </Text>
        <Pressable
          onPress={onImportFromFile}
          disabled={busy}
          style={({ pressed }) => [
            styles.primaryBtn,
            (pressed || busy) && { opacity: 0.5 },
          ]}
        >
          <Text style={styles.primaryBtnText}>파일에서 불러오기</Text>
        </Pressable>
        <Text style={styles.orDivider}>또는 텍스트로 붙여넣기</Text>
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
        {pasted ? (
          <View style={styles.pastedChip}>
            <View style={{ flex: 1 }}>
              <Text style={styles.pastedTitle}>백업 데이터가 준비됐어요</Text>
              <Text style={styles.pastedMeta}>
                {pasted.length.toLocaleString()}자 · 아래 “불러오기 실행”을 눌러주세요
              </Text>
            </View>
            <Pressable
              onPress={() => {
                setPasted('');
                Keyboard.dismiss();
              }}
              hitSlop={8}
              style={({ pressed }) => pressed && { opacity: 0.5 }}
            >
              <Text style={styles.pastedClear}>지우기</Text>
            </Pressable>
          </View>
        ) : (
          <TextInput
            value={pasted}
            onChangeText={setPasted}
            placeholder="또는 여기에 직접 붙여넣기"
            placeholderTextColor={Colors.textSecondary}
            multiline
            textAlignVertical="top"
            style={styles.textarea}
          />
        )}
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

      {busy && (
        <View style={styles.busyOverlay}>
          <View style={styles.busyCard}>
            <ActivityIndicator color={Colors.primary} />
            {progress && (
              <>
                <Text style={styles.progressText}>
                  {progress.label}… {progress.pct}%
                </Text>
                <View style={styles.progressTrack}>
                  <View
                    style={[styles.progressFill, { width: `${progress.pct}%` }]}
                  />
                </View>
                <Text style={styles.progressHint}>
                  이미지가 많으면 조금 걸릴 수 있어요
                </Text>
              </>
            )}
          </View>
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
  orDivider: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  textarea: {
    minHeight: 100,
    maxHeight: 160,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 10,
    fontSize: 12,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
    fontFamily: 'Menlo',
  },
  pastedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 8,
    padding: 12,
    backgroundColor: Colors.primaryLight,
  },
  pastedTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  pastedMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  pastedClear: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.sunday,
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
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  busyCard: {
    minWidth: 220,
    maxWidth: 300,
    backgroundColor: Colors.background,
    borderRadius: 14,
    paddingVertical: 22,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 12,
  },
  progressText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  progressTrack: {
    alignSelf: 'stretch',
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  progressHint: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
