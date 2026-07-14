import { useEffect, useState } from 'react';
import {
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Colors } from '@/constants/colors';
import { checkForUpdate, type UpdateInfo } from '@/lib/appUpdate';

// 로컬 개발(expo run:ios)에서 팝업 UI를 미리 보려면 아래 false를 true로 바꾼다.
// __DEV__ 가드가 있어 실제 배포(App Store/TestFlight) 빌드에서는 절대 켜지지 않는다.
const DEV_PREVIEW = __DEV__ && false;

const PREVIEW_INFO: UpdateInfo = {
  storeVersion: '1.0.2',
  currentVersion: '1.0.0',
  releaseNotes:
    '• 표지 이미지가 안전하게 보관돼요\n• 이미지 검색 화면 스크롤이 부드러워졌어요\n• 새 버전 안내 기능이 추가됐어요',
  storeUrl: 'https://apps.apple.com/app/id6762242539',
};

export function UpdatePrompt() {
  const [info, setInfo] = useState<UpdateInfo | null>(null);

  useEffect(() => {
    if (DEV_PREVIEW) {
      setInfo(PREVIEW_INFO);
      return;
    }
    let alive = true;
    checkForUpdate()
      .then((u) => {
        if (alive && u) setInfo(u);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (!info) return null;

  const onUpdate = () => {
    Linking.openURL(info.storeUrl).catch(() => {});
  };

  return (
    <Modal
      transparent
      animationType="fade"
      visible
      onRequestClose={() => setInfo(null)}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.emoji}>🎉</Text>
          <Text style={styles.title}>새 버전이 나왔어요</Text>
          <Text style={styles.version}>버전 {info.storeVersion}</Text>

          {info.releaseNotes ? (
            <ScrollView
              style={styles.notesBox}
              contentContainerStyle={styles.notesContent}
              showsVerticalScrollIndicator
            >
              <Text style={styles.notes}>{info.releaseNotes}</Text>
            </ScrollView>
          ) : (
            <Text style={styles.notesFallback}>
              새로운 기능과 개선 사항이 포함되어 있어요.
            </Text>
          )}

          <Pressable
            onPress={onUpdate}
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={styles.primaryBtnText}>지금 업데이트</Text>
          </Pressable>
          <Pressable
            onPress={() => setInfo(null)}
            style={({ pressed }) => [
              styles.laterBtn,
              pressed && { opacity: 0.6 },
            ]}
          >
            <Text style={styles.laterBtnText}>나중에</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  emoji: { fontSize: 40, marginBottom: 8 },
  title: {
    fontSize: 19,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  version: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 14,
  },
  notesBox: {
    maxHeight: 180,
    alignSelf: 'stretch',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    marginBottom: 18,
  },
  notesContent: { paddingVertical: 12 },
  notes: {
    fontSize: 14,
    lineHeight: 21,
    color: Colors.textPrimary,
  },
  notesFallback: {
    fontSize: 14,
    lineHeight: 21,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 18,
  },
  primaryBtn: {
    alignSelf: 'stretch',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  laterBtn: {
    alignSelf: 'stretch',
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  laterBtnText: { color: Colors.textSecondary, fontSize: 14, fontWeight: '600' },
});
