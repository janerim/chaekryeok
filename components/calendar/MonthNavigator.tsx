import { Pressable, StyleSheet, Text, View } from 'react-native';
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
      <Pressable onPress={onPrev} hitSlop={12} style={styles.arrow}>
        <Text style={styles.arrowText}>‹</Text>
      </Pressable>
      <Text style={styles.label}>{`${yy}년 ${mm}월`}</Text>
      <Pressable onPress={onNext} hitSlop={12} style={styles.arrow}>
        <Text style={styles.arrowText}>›</Text>
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
  arrowText: {
    fontSize: 26,
    color: Colors.textPrimary,
    fontWeight: '400',
    lineHeight: 28,
  },
  label: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    minWidth: 90,
    textAlign: 'center',
  },
});
