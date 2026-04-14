import { useMemo } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { differenceInCalendarDays, format, subMonths } from 'date-fns';
import Svg, { Circle, G } from 'react-native-svg';
import { Colors } from '@/constants/colors';
import { useBookStore } from '@/store/bookStore';
import type { Book } from '@/db/database';

const GENRE_PALETTE = [
  '#639922',
  '#FF6B35',
  '#3D7EFF',
  '#FFC107',
  '#9C27B0',
  '#00BCD4',
  '#E91E63',
  '#795548',
  '#607D8B',
];

export default function StatsScreen() {
  const { books } = useBookStore();

  const data = useMemo(() => computeStats(books), [books]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.summaryRow}>
          <SummaryCard label="총 기록" value={`${data.total}권`} />
          <SummaryCard label="완독" value={`${data.finished}권`} />
          <SummaryCard label="읽는 중" value={`${data.reading}권`} />
        </View>
        <View style={styles.summaryRow}>
          <SummaryCard
            label="평균 독서 기간"
            value={data.avgDays !== null ? `${data.avgDays}일` : '—'}
          />
          <SummaryCard
            label="평균 평점"
            value={data.avgRating !== null ? `★ ${data.avgRating.toFixed(1)}` : '—'}
          />
        </View>

        <Section title="월별 완독 (최근 12개월)">
          {data.monthly.every((m) => m.count === 0) ? (
            <Text style={styles.empty}>아직 완독 기록이 없어요</Text>
          ) : (
            <View style={styles.barChart}>
              {data.monthly.map((m) => {
                const h =
                  data.monthlyMax > 0 ? (m.count / data.monthlyMax) * 100 : 0;
                return (
                  <View key={m.key} style={styles.barCol}>
                    <View style={styles.barValWrap}>
                      {m.count > 0 && (
                        <Text style={styles.barVal}>{m.count}</Text>
                      )}
                    </View>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.bar,
                          {
                            height: `${h}%`,
                            backgroundColor:
                              m.count > 0 ? Colors.primary : Colors.border,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.barLabel}>{m.label}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </Section>

        <Section title="장르 분포">
          {data.genres.length === 0 ? (
            <Text style={styles.empty}>장르 데이터가 없어요</Text>
          ) : (
            <View style={styles.genreSection}>
              <GenreDonut
                genres={data.genres}
                total={data.genreTotal}
              />
              <View style={styles.genreLegend}>
                {data.genres.map((g, i) => {
                  const pct = (g.count / data.genreTotal) * 100;
                  return (
                    <View key={g.name} style={styles.legendRow}>
                      <View
                        style={[
                          styles.legendSwatch,
                          { backgroundColor: GENRE_PALETTE[i % GENRE_PALETTE.length] },
                        ]}
                      />
                      <Text style={styles.legendName}>{g.name}</Text>
                      <Text style={styles.legendPct}>{pct.toFixed(0)}%</Text>
                      <Text style={styles.legendCount}>{g.count}권</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </Section>

        <Section title="TOP 3 (평점순)">
          {data.top3.length === 0 ? (
            <Text style={styles.empty}>평점이 매겨진 책이 없어요</Text>
          ) : (
            <View style={{ gap: 8 }}>
              {data.top3.map((b, i) => (
                <View key={b.id} style={styles.topRow}>
                  <Text style={styles.topRank}>{i + 1}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.topTitle} numberOfLines={1}>
                      {b.title}
                    </Text>
                    {!!b.author && (
                      <Text style={styles.topSub} numberOfLines={1}>
                        {b.author}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.topRating}>★ {b.rating!.toFixed(1)}</Text>
                </View>
              ))}
            </View>
          )}
        </Section>

        <Pressable
          style={({ pressed }) => [styles.backupBtn, pressed && { opacity: 0.6 }]}
          onPress={() => router.push('/backup')}
        >
          <Text style={styles.backupBtnText}>백업 / 복원</Text>
        </Pressable>
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function GenreDonut({
  genres,
  total,
}: {
  genres: { name: string; count: number }[];
  total: number;
}) {
  const size = 160;
  const strokeWidth = 26;
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <G rotation={-90} origin={`${cx}, ${cy}`}>
          <Circle
            cx={cx}
            cy={cy}
            r={radius}
            stroke={Colors.border}
            strokeWidth={strokeWidth}
            fill="none"
          />
          {genres.map((g, i) => {
            const pct = g.count / total;
            const len = pct * circumference;
            const dash = `${len} ${circumference - len}`;
            const segOffset = -offset;
            offset += len;
            return (
              <Circle
                key={g.name}
                cx={cx}
                cy={cy}
                r={radius}
                stroke={GENRE_PALETTE[i % GENRE_PALETTE.length]}
                strokeWidth={strokeWidth}
                strokeDasharray={dash}
                strokeDashoffset={segOffset}
                strokeLinecap="butt"
                fill="none"
              />
            );
          })}
        </G>
      </Svg>
      <View style={styles.donutCenter} pointerEvents="none">
        <Text style={styles.donutTotal}>{total}</Text>
        <Text style={styles.donutLabel}>권</Text>
      </View>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function computeStats(books: Book[]) {
  const total = books.length;
  const finishedBooks = books.filter((b) => !!b.finish_date);
  const readingBooks = books.filter(
    (b) => !!b.start_date && !b.finish_date && b.is_stopped !== 1
  );
  const finished = finishedBooks.length;
  const reading = readingBooks.length;

  const periods = finishedBooks
    .filter((b) => !!b.start_date)
    .map(
      (b) =>
        differenceInCalendarDays(
          new Date(b.finish_date!),
          new Date(b.start_date!)
        ) + 1
    )
    .filter((d) => d > 0);
  const avgDays = periods.length
    ? Math.round(periods.reduce((a, b) => a + b, 0) / periods.length)
    : null;

  const rated = books.filter((b) => !!b.rating);
  const avgRating = rated.length
    ? rated.reduce((a, b) => a + (b.rating ?? 0), 0) / rated.length
    : null;

  const now = new Date();
  const monthly: { key: string; label: string; count: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = subMonths(now, i);
    const key = format(d, 'yyyy-MM');
    monthly.push({ key, label: format(d, 'M월'), count: 0 });
  }
  for (const b of finishedBooks) {
    const key = b.finish_date!.slice(0, 7);
    const slot = monthly.find((m) => m.key === key);
    if (slot) slot.count++;
  }
  const monthlyMax = Math.max(1, ...monthly.map((m) => m.count));

  const genreMap = new Map<string, number>();
  for (const b of books) {
    const g = b.genre ?? '미분류';
    genreMap.set(g, (genreMap.get(g) ?? 0) + 1);
  }
  const genres = [...genreMap.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
  const genreMax = Math.max(1, ...genres.map((g) => g.count));
  const genreTotal = genres.reduce((a, g) => a + g.count, 0);

  const top3 = [...rated]
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, 3);

  return {
    total,
    finished,
    reading,
    avgDays,
    avgRating,
    monthly,
    monthlyMax,
    genres,
    genreMax,
    genreTotal,
    top3,
  };
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, gap: 16 },
  summaryRow: { flexDirection: 'row', gap: 10 },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  summaryValue: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  summaryLabel: { fontSize: 12, color: Colors.textSecondary },
  section: {
    gap: 12,
    padding: 14,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  empty: { fontSize: 13, color: Colors.textSecondary, paddingVertical: 8 },
  barChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    height: 150,
  },
  barCol: { flex: 1, alignItems: 'center', height: '100%' },
  barValWrap: { height: 14, justifyContent: 'flex-end' },
  barVal: { fontSize: 10, color: Colors.textSecondary },
  barTrack: {
    flex: 1,
    width: '70%',
    justifyContent: 'flex-end',
    alignItems: 'stretch',
  },
  bar: { width: '100%', borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  barLabel: { fontSize: 10, color: Colors.textSecondary, marginTop: 4 },
  genreRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  genreLabel: {
    width: 56,
    fontSize: 13,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  genreTrack: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.background,
    overflow: 'hidden',
  },
  genreBar: { height: '100%', backgroundColor: Colors.accent, borderRadius: 5 },
  genreCount: {
    width: 28,
    textAlign: 'right',
    fontSize: 12,
    color: Colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 8,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  topRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 12,
    fontWeight: '700',
    overflow: 'hidden',
  },
  topTitle: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  topSub: { fontSize: 12, color: Colors.textSecondary },
  topRating: { fontSize: 13, color: Colors.star, fontWeight: '700' },
  genreSection: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  genreLegend: { flex: 1, gap: 8 },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendSwatch: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendName: {
    flex: 1,
    fontSize: 13,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  legendPct: {
    fontSize: 12,
    color: Colors.textPrimary,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    minWidth: 36,
    textAlign: 'right',
  },
  legendCount: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontVariant: ['tabular-nums'],
    minWidth: 30,
    textAlign: 'right',
  },
  donutCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutTotal: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  donutLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: -2,
  },
  backupBtn: {
    marginTop: 8,
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  backupBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
});
