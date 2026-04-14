import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Colors } from '@/constants/colors';
import { WEEKDAY_LABELS, type DayCell } from '@/hooks/useCalendar';
import { CalendarCell } from './CalendarCell';

type Props = {
  weeks: DayCell[][];
  onPressDay: (cell: DayCell) => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
};

export function CalendarGrid({ weeks, onPressDay, onSwipeLeft, onSwipeRight }: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const cellWidth = screenWidth / 7;

  const pan = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .failOffsetY([-15, 15])
    .runOnJS(true)
    .onEnd((e) => {
      if (e.translationX < -50) onSwipeLeft?.();
      else if (e.translationX > 50) onSwipeRight?.();
    });

  return (
    <GestureDetector gesture={pan}>
      <View>
        <View style={styles.headerRow}>
          {WEEKDAY_LABELS.map((d, i) => (
            <View key={d} style={[styles.headerCell, { width: cellWidth }]}>
              <Text
                style={[
                  styles.headerText,
                  i === 5 && { color: Colors.saturday },
                  i === 6 && { color: Colors.sunday },
                ]}
              >
                {d}
              </Text>
            </View>
          ))}
        </View>
        {weeks.map((week, wi) => (
          <View key={wi} style={styles.weekRow}>
            {week.map((cell) => (
              <CalendarCell
                key={cell.dateKey}
                cell={cell}
                width={cellWidth}
                onPress={onPressDay}
              />
            ))}
          </View>
        ))}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    backgroundColor: Colors.background,
  },
  headerCell: { alignItems: 'center' },
  headerText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  weekRow: {
    flexDirection: 'row',
  },
});
