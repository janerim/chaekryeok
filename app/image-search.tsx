import { useLocalSearchParams, router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { downloadImageToLocal, resolveWebImagePick } from '@/hooks/useImagePicker';

const INJECTED_JS = `
(function(){
  if (window.__rcImagePickerInstalled) return;
  window.__rcImagePickerInstalled = true;

  function findImg(node){
    while (node && node !== document.body) {
      if (node.tagName === 'IMG') return node;
      node = node.parentElement;
    }
    return null;
  }

  function pickUrl(img){
    var candidates = [
      img.getAttribute('data-origin'),
      img.getAttribute('data-original'),
      img.getAttribute('data-src'),
      img.currentSrc,
      img.src
    ];
    for (var i = 0; i < candidates.length; i++){
      var u = candidates[i];
      if (u && typeof u === 'string' && u.indexOf('data:') !== 0) return u;
    }
    return null;
  }

  function select(target, e){
    var img = findImg(target);
    if (!img) return;
    var url = pickUrl(img);
    if (!url) return;
    e.preventDefault();
    e.stopPropagation();
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'image',
      url: url,
      width: img.naturalWidth || img.width || 0,
      height: img.naturalHeight || img.height || 0
    }));
  }

  // 탭과 스크롤을 구분: 손가락이 많이 움직였거나 오래 눌렀으면 스크롤로 간주하고 무시
  var MOVE_TOL = 10;   // px
  var TIME_TOL = 700;  // ms
  var startX = 0, startY = 0, startT = 0, moved = false;

  document.addEventListener('touchstart', function(e){
    var t = e.touches && e.touches[0];
    if (!t) return;
    startX = t.clientX; startY = t.clientY;
    startT = Date.now(); moved = false;
  }, true);

  document.addEventListener('touchmove', function(e){
    var t = e.touches && e.touches[0];
    if (!t) return;
    if (Math.abs(t.clientX - startX) > MOVE_TOL || Math.abs(t.clientY - startY) > MOVE_TOL) {
      moved = true;
    }
  }, true);

  document.addEventListener('touchend', function(e){
    if (moved) return;                          // 스크롤/드래그면 선택 안 함
    if (Date.now() - startT > TIME_TOL) return; // 길게 누르면 선택 안 함
    select(e.target, e);
  }, true);

  // 데스크톱/비터치 환경 대비 (탭에서만 발생하므로 스크롤과 무관)
  document.addEventListener('click', function(e){ select(e.target, e); }, true);
  true;
})();
true;
`;

export default function ImageSearchScreen() {
  const { q } = useLocalSearchParams<{ q?: string }>();
  const [downloading, setDownloading] = useState(false);
  const webRef = useRef<WebView>(null);

  const initialUrl = useMemo(() => {
    const query = encodeURIComponent(q ?? '');
    return `https://search.naver.com/search.naver?where=image&query=${query}`;
  }, [q]);

  const onMessage = async (e: WebViewMessageEvent) => {
    if (downloading) return;
    try {
      const data = JSON.parse(e.nativeEvent.data);
      if (data.type !== 'image' || !data.url) return;
      setDownloading(true);
      const localPath = await downloadImageToLocal(data.url);
      resolveWebImagePick(localPath);
      router.back();
    } catch (err: any) {
      setDownloading(false);
      Alert.alert('이미지 저장 실패', err?.message ?? String(err));
    }
  };

  const onCancel = () => {
    resolveWebImagePick(null);
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={onCancel} hitSlop={8}>
          <Text style={styles.headerBtn}>닫기</Text>
        </Pressable>
        <Text style={styles.headerTitle}>이미지 탭하여 선택</Text>
        <Pressable onPress={() => webRef.current?.reload()} hitSlop={8}>
          <Text style={styles.headerBtn}>새로고침</Text>
        </Pressable>
      </View>

      <WebView
        ref={webRef}
        source={{ uri: initialUrl }}
        injectedJavaScript={INJECTED_JS}
        onMessage={onMessage}
        startInLoadingState
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={['*']}
        style={styles.webview}
      />

      {downloading && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.overlayText}>이미지 저장 중…</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  headerBtn: { fontSize: 14, color: Colors.primary, fontWeight: '600' },
  headerTitle: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  webview: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  overlayText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
