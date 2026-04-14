import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { format } from 'date-fns';
import { Colors } from '@/constants/colors';
import {
  shiftMonth,
  useCalendarMatrix,
  WEEKDAY_LABELS,
} from '@/hooks/useCalendar';
import { MonthNavigator } from '@/components/calendar/MonthNavigator';

type Props = {
  label: string;
  value: string | null;
  onChange: (v: string | null) => void;
  disabled?: boolean;
};

export function DatePickerButton({ label, value, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() =>
    value ? new Date(value + 'T00:00:00') : new Date()
  );
  const weeks = useCalendarMatrix(month, []);

  const setToday = () => {
    onChange(format(new Date(), 'yyyy-MM-dd'));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <View style={[styles.valueBox, disabled && styles.dimmed]}>
          <Text style={styles.value}>{value ?? '미설정'}</Text>
        </View>
        <Pressable
          disabled={disabled}
          onPress={setToday}
          style={[styles.btn, disabled && styles.dimmed]}
        >
          <Text style={styles.btnText}>오늘</Text>
        </Pressable>
        <Pressable
          disabled={disabled}
          onPress={() => setOpen(true)}
          style={[styles.btn, disabled && styles.dimmed]}
        >
          <Text style={styles.btnText}>직접 선택</Text>
        </Pressable>
        {value && !disabled && (
          <Pressable onPress={() => onChange(null)} style={styles.clearBtn}>
            <Text style={styles.clearText}>×</Text>
          </Pressable>
        )}
      </View>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <MonthNavigator
                date={month}
                onPrev={() => setMonth((d) => shiftMonth(d, -1))}
                onNext={() => setMonth((d) => shiftMonth(d, 1))}
              />
            </View>
            <View style={styles.weekHeader}>
              {WEEKDAY_LABELS.map((d, i) => (
                <Text
                  key={d}
                  style={[
                    styles.weekHeaderText,
                    i === 5 && { color: Colors.saturday },
                    i === 6 && { color: Colors.sunday },
                  ]}
                >
                  {d}
                </Text>
              ))}
            </View>
            {weeks.map((week, wi) => (
              <View key={wi} style={styles.weekRow}>
                {week.map((cell) => {
                  const isSelected = value === cell.dateKey;
                  return (
                    <Pressable
                      key={cell.dateKey}
                      style={[styles.dayCell, isSelected && styles.dayCellSel]}
                      onPress={() => {
                        onChange(cell.dateKey);
                        setOpen(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          !cell.inMonth && styles.dayTextDim,
                          cell.weekday === 0 && { color: Colors.sunday },
                          cell.weekday === 6 && { color: Colors.saturday },
                          isSelected && { color: '#fff' },
                          cell.isToday && !isSelected && { fontWeight: '700' },
                        ]}
                      >
                        {cell.date.getDate()}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  label: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  valueBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  value: { fontSize: 14, color: Colors.textPrimary },
  btn: {
    paddingHorizontal: 10,
    paddingVertical: 9,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
  },
  btnText: { fontSize: 13, color: Colors.textPrimary, fontWeight: '600' },
  clearBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearText: { fontSize: 20, color: Colors.textSecondary },
  dimmed: { opacity: 0.4 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  sheet: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    width: '100%',
    maxWidth: 360,
  },
  sheetHeader: { alignItems: 'center', marginBottom: 8 },
  weekHeader: { flexDirection: 'row', paddingVertical: 6 },
  weekHeaderText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  weekRow: { flexDirection: 'row' },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  dayCellSel: { backgroundColor: Colors.primary },
  dayText: { fontSize: 14, color: Colors.textPrimary },
  dayTextDim: { color: Colors.textSecondary, opacity: 0.4 },
});
