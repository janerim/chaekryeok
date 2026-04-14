import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/colors';
import { GENRES } from '@/constants/genres';

type Props = {
  value: string | null;
  onChange: (v: string | null) => void;
};

export function GenreSelector({ value, onChange }: Props) {
  return (
    <View style={styles.wrap}>
      {GENRES.map((g) => {
        const active = value === g;
        return (
          <Pressable
            key={g}
            onPress={() => onChange(active ? null : g)}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.text, active && styles.textActive]}>{g}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  text: { fontSize: 13, color: Colors.textPrimary },
  textActive: { color: '#fff', fontWeight: '600' },
});
