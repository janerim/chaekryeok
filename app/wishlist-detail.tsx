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
import { Colors } from '@/constants/colors';
import { getWishlistItem, type Wishlist } from '@/db/database';
import { useWishlistStore } from '@/store/wishlistStore';

export default function WishlistDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const itemId = id ? Number(id) : null;
  const { items } = useWishlistStore();
  const [item, setItem] = useState<Wishlist | null>(null);

  useEffect(() => {
    if (itemId === null) return;
    getWishlistItem(itemId).then(setItem);
  }, [itemId, items]);

  if (!item) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>불러오는 중...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/wishlist-form',
                  params: { id: String(item.id) },
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
        {item.cover_local_path ? (
          <Image source={{ uri: item.cover_local_path }} style={styles.cover} />
        ) : (
          <View style={[styles.cover, styles.coverEmpty]}>
            <Text style={styles.muted}>표지 없음</Text>
          </View>
        )}
      </View>

      <Text style={styles.title}>{item.title}</Text>
      {!!item.author && <Text style={styles.sub}>{item.author}</Text>}

      <View style={styles.badges}>
        <View style={[styles.badge, { backgroundColor: Colors.accent }]}>
          <Text style={styles.badgeText}>🔖 읽고 싶은</Text>
        </View>
        {!!item.genre && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{item.genre}</Text>
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Row label="제목" value={item.title} />
        <Row label="저자" value={item.author} />
        <Row label="출판사" value={item.publisher} />
        <Row label="장르" value={item.genre} />
      </View>

      <View style={styles.card}>
        <Block label="메모" value={item.memo} />
      </View>

      <Pressable
        onPress={() =>
          router.replace({
            pathname: '/book-form',
            params: { wishlistId: String(item.id) },
          })
        }
        style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.7 }]}
      >
        <Text style={styles.primaryBtnText}>＋ 기록으로 추가</Text>
      </Pressable>

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
  block: {
    paddingVertical: 11,
    gap: 6,
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
  primaryBtn: {
    marginTop: 4,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: Colors.primary,
  },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
