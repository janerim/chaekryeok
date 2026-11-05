import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';

type Props = {
  date: Date;
  onPrev: () => void;
  onNext: () => void;
};

export function MonthNavigator({ date, onPrev, onNext }: Props) {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = date.getMonth() + 1;
  return (
    <View style={styles.row}>
      <Pressable
        onPress={onPrev}
        hitSlop={12}
        style={styles.arrow}
        accessibilityRole="button"
        accessibilityLabel="이전 달"
      >
        <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
      </Pressable>
      <Text style={styles.label}>{`${yy}년 ${mm}월`}</Text>
      <Pressable
        onPress={onNext}
        hitSlop={12}
        style={styles.arrow}
        accessibilityRole="button"
        accessibilityLabel="다음 달"
      >
        <Ionicons name="chevron-forward" size={22} color={Colors.textPrimary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  arrow: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    minWidth: 90,
    textAlign: 'center',
  },
});
