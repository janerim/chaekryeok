import { useEffect, useRef } from 'react';
import {
  Animated,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { useWishlistStore } from '@/store/wishlistStore';
import type { Wishlist } from '@/db/database';

const ACTION_BAR = 162;

type RowHandle = { close: () => void };

export default function WishlistScreen() {
  const { items, refresh, remove } = useWishlistStore();
  const openRef = useRef<RowHandle | null>(null);

  useEffect(() => {
    refresh().catch(console.error);
  }, [refresh]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.title}>읽고 싶은 책 {items.length}권</Text>
        <Pressable
          onPress={() => router.push('/wishlist-form')}
          style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.6 }]}
          hitSlop={8}
        >
          <Text style={styles.addBtnText}>＋</Text>
        </Pressable>
      </View>

      <FlatList
        data={items}
        keyExtractor={(it) => String(it.id)}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        contentContainerStyle={
          items.length === 0 ? styles.emptyWrap : styles.listContent
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>읽고 싶은 책을 추가해 보세요</Text>
            <Pressable
              onPress={() => router.push('/wishlist-form')}
              style={({ pressed }) => [
                styles.emptyBtn,
                pressed && { opacity: 0.6 },
              ]}
            >
              <Text style={styles.emptyBtnText}>＋ 책 추가</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => (
          <WishlistRow
            item={item}
            onRemove={() => remove(item.id)}
            openRef={openRef}
          />
        )}
      />
    </SafeAreaView>
  );
}

function WishlistRow({
  item,
  onRemove,
  openRef,
}: {
  item: Wishlist;
  onRemove: () => void;
  openRef: React.MutableRefObject<RowHandle | null>;
}) {
  const tx = useRef(new Animated.Value(0)).current;
  const openState = useRef(false);
  const selfRef = useRef<RowHandle>({
    close: () => animateTo(0, false),
  });

  const animateTo = (value: number, open: boolean) => {
    openState.current = open;
    Animated.spring(tx, {
      toValue: value,
      useNativeDriver: true,
      bounciness: 0,
      speed: 20,
    }).start();
    if (open) {
      if (openRef.current && openRef.current !== selfRef.current) {
        openRef.current.close();
      }
      openRef.current = selfRef.current;
    } else if (openRef.current === selfRef.current) {
      openRef.current = null;
    }
  };

  const pan = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-15, 15])
    .runOnJS(true)
    .onUpdate((e) => {
      const base = openState.current ? -ACTION_BAR : 0;
      const next = Math.max(-ACTION_BAR, Math.min(0, base + e.translationX));
      tx.setValue(next);
    })
    .onEnd((e) => {
      const base = openState.current ? -ACTION_BAR : 0;
      const final = base + e.translationX;
      const shouldOpen = final < -ACTION_BAR / 2 || e.velocityX < -500;
      animateTo(shouldOpen ? -ACTION_BAR : 0, shouldOpen);
    });

  const overlayTranslate = tx.interpolate({
    inputRange: [-ACTION_BAR, 0],
    outputRange: [0, ACTION_BAR],
    extrapolate: 'clamp',
  });

  const onPressRow = () => {
    if (openState.current) {
      animateTo(0, false);
      return;
    }
    router.push({
      pathname: '/wishlist-detail',
      params: { id: String(item.id) },
    });
  };

  return (
    <View style={styles.rowWrap}>
      <GestureDetector gesture={pan}>
        <Pressable
          onPress={onPressRow}
          style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
        >
          {item.cover_local_path ? (
            <Image
              source={{ uri: item.cover_local_path }}
              style={styles.thumb}
            />
          ) : (
            <View style={[styles.thumb, styles.thumbEmpty]} />
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle} numberOfLines={1}>
              {item.title}
            </Text>
            {!!item.author && (
              <Text style={styles.rowSub} numberOfLines={1}>
                {item.author}
                {item.publisher ? ` · ${item.publisher}` : ''}
              </Text>
            )}
            {!!item.memo && (
              <Text style={styles.rowMemo} numberOfLines={2}>
                {item.memo}
              </Text>
            )}
            <Text style={styles.rowDate}>
              추가 {item.created_at.slice(0, 10)}
            </Text>
          </View>
          {!!item.genre && (
            <View style={styles.genreTag}>
              <Text style={styles.genreTagText}>{item.genre}</Text>
            </View>
          )}
        </Pressable>
      </GestureDetector>

      <Animated.View
        pointerEvents="box-none"
        style={[
          styles.actionOverlay,
          { transform: [{ translateX: overlayTranslate }] },
        ]}
      >
        <ActionButton
          icon="✏️"
          label="편집"
          color={Colors.accent}
          onPress={() => {
            animateTo(0, false);
            router.push({
              pathname: '/wishlist-form',
              params: { id: String(item.id) },
            });
          }}
        />
        <ActionButton
          icon="📖"
          label="기록"
          color={Colors.primary}
          onPress={() => {
            animateTo(0, false);
            router.push({
              pathname: '/book-form',
              params: { wishlistId: String(item.id) },
            });
          }}
        />
        <ActionButton
          icon="🗑"
          label="삭제"
          color={Colors.sunday}
          onPress={() => {
            animateTo(0, false);
            onRemove();
          }}
        />
      </Animated.View>
    </View>
  );
}

function ActionButton({
  icon,
  label,
  color,
  onPress,
}: {
  icon: string;
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.75 }]}
    >
      <View style={[styles.actionCircle, { backgroundColor: color }]}>
        <Text style={styles.actionIcon}>{icon}</Text>
      </View>
      <Text style={[styles.actionLabel, { color }]}>{label}</Text>
    </Pressable>
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
  title: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: { fontSize: 20, color: '#fff', fontWeight: '600', lineHeight: 22 },
  listContent: { paddingVertical: 4 },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.border },
  rowWrap: { overflow: 'hidden', backgroundColor: Colors.background },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.background,
  },
  rowTitle: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  rowSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  rowMemo: { fontSize: 12, color: Colors.textSecondary, marginTop: 4 },
  rowDate: { fontSize: 11, color: Colors.textSecondary, marginTop: 4, opacity: 0.8 },
  genreTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  genreTagText: { fontSize: 11, color: Colors.textPrimary, fontWeight: '600' },
  thumb: {
    width: 40,
    height: 56,
    borderRadius: 4,
    backgroundColor: Colors.surface,
  },
  thumbEmpty: { borderWidth: 1, borderColor: Colors.border },
  emptyWrap: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center', gap: 16 },
  emptyText: { fontSize: 14, color: Colors.textSecondary },
  emptyBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: Colors.primary,
  },
  emptyBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  actionOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: ACTION_BAR,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingHorizontal: 4,
    backgroundColor: Colors.background,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: -2, height: 0 },
  },
  actionBtn: {
    width: ACTION_BAR / 3 - 4,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  actionCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  actionIcon: { fontSize: 17, lineHeight: 22 },
  actionLabel: { fontSize: 10, fontWeight: '700' },
});
