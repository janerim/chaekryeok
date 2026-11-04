import { StyleSheet, View } from 'react-native';
import { Colors } from '@/constants/colors';

export function GoalProgressBar({
  ratio,
  height,
}: {
  ratio: number; // 0~1
  height: number;
}) {
  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }]}>
      <View
        style={[
          styles.fill,
          { width: `${ratio * 100}%`, borderRadius: height / 2 },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { backgroundColor: Colors.border, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: Colors.primary },
});
