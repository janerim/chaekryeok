import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Colors } from '@/constants/colors';
import { GOAL_MAX, GOAL_MIN } from '@/lib/goal';
import { useGoalStore } from '@/store/goalStore';

const PRESETS = [12, 24, 36, 52];

type Props = {
  visible: boolean;
  year: number;
  current: number | null;
  onClose: () => void;
};

export function GoalEditor({ visible, year, current, onClose }: Props) {
  const setGoal = useGoalStore((s) => s.setGoal);
  const clearGoal = useGoalStore((s) => s.clearGoal);
  const [text, setText] = useState('');

  useEffect(() => {
    if (visible) setText(current ? String(current) : '');
  }, [visible, current]);

  const run = async (action: () => Promise<void>) => {
    try {
      await action();
      onClose();
    } catch (e: any) {
      Alert.alert('저장 실패', e?.message ?? String(e));
    }
  };

  const onSave = () => {
    const target = Number(text);
    if (!Number.isInteger(target) || target < GOAL_MIN || target > GOAL_MAX) {
      Alert.alert(`${GOAL_MIN}~${GOAL_MAX}권 사이로 입력해 주세요`);
      return;
    }
    run(() => setGoal(year, target));
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.title}>{year}년 독서 목표</Text>

            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={text}
                onChangeText={(t) => setText(t.replace(/[^\d]/g, '').slice(0, 3))}
                keyboardType="number-pad"
                placeholder="24"
                placeholderTextColor={Colors.textSecondary}
                autoFocus
              />
              <Text style={styles.unit}>권</Text>
            </View>

            <View style={styles.presets}>
              {PRESETS.map((n) => {
                const on = text === String(n);
                return (
                  <Pressable
                    key={n}
                    onPress={() => setText(String(n))}
                    style={[styles.preset, on && styles.presetOn]}
                  >
                    <Text style={[styles.presetText, on && styles.presetTextOn]}>
                      {n}권
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              onPress={onSave}
              style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.saveText}>저장</Text>
            </Pressable>
            {current !== null && (
              <Pressable onPress={() => run(() => clearGoal(year))} style={styles.clearBtn}>
                <Text style={styles.clearText}>목표 지우기</Text>
              </Pressable>
            )}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    gap: 14,
    padding: 20,
    paddingBottom: 28,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: Colors.background,
  },
  title: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  unit: { fontSize: 16, color: Colors.textPrimary },
  presets: { flexDirection: 'row', gap: 8 },
  preset: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  presetOn: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  presetText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  presetTextOn: { color: Colors.primaryDark },
  saveBtn: {
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: Colors.primary,
  },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  clearBtn: { alignItems: 'center', paddingVertical: 4 },
  clearText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
});
