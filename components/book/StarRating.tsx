import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/colors';

type Props = {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
  readonly?: boolean;
};

export function StarRating({ value, onChange, size = 28, readonly }: Props) {
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = value >= i;
        const half = !filled && value >= i - 0.5;
        return (
          <View key={i} style={[styles.starWrap, { width: size, height: size }]}>
            <Text style={[styles.star, { fontSize: size, color: Colors.border }]}>★</Text>
            {(filled || half) && (
              <View
                style={[
                  styles.fillClip,
                  { width: filled ? size : size / 2, height: size },
                ]}
              >
                <Text style={[styles.star, { fontSize: size, color: Colors.star }]}>★</Text>
              </View>
            )}
            {!readonly && (
              <>
                <Pressable
                  style={[styles.hit, { width: size / 2, height: size, left: 0 }]}
                  onPress={() => onChange?.(value === i - 0.5 ? 0 : i - 0.5)}
                />
                <Pressable
                  style={[styles.hit, { width: size / 2, height: size, right: 0 }]}
                  onPress={() => onChange?.(value === i ? i - 0.5 : i)}
                />
              </>
            )}
          </View>
        );
      })}
      <Text style={styles.label}>{value.toFixed(1)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  starWrap: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  fillClip: { position: 'absolute', left: 0, top: 0, overflow: 'hidden' },
  star: { lineHeight: undefined },
  hit: { position: 'absolute', top: 0 },
  label: {
    marginLeft: 8,
    fontSize: 14,
    color: Colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
});
