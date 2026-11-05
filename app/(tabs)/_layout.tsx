import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';

/** 선택된 탭은 채운 아이콘, 나머지는 선 아이콘. 색은 탭바 글자(active/inactive)와 같게 (가계력과 동일) */
const tabIcon =
  (name: 'calendar' | 'library' | 'bookmark' | 'bar-chart') =>
  ({ focused, size }: { focused: boolean; size: number }) => (
    <Ionicons
      name={focused ? name : `${name}-outline`}
      size={size}
      color={focused ? Colors.primary : Colors.textSecondary}
    />
  );

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarStyle: {
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: Colors.border,
          backgroundColor: Colors.background,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: '캘린더', tabBarIcon: tabIcon('calendar') }}
      />
      <Tabs.Screen
        name="all-records"
        options={{ title: '전체 기록', tabBarIcon: tabIcon('library') }}
      />
      <Tabs.Screen
        name="wishlist"
        options={{ title: '읽고 싶은', tabBarIcon: tabIcon('bookmark') }}
      />
      <Tabs.Screen
        name="stats"
        options={{ title: '통계', tabBarIcon: tabIcon('bar-chart') }}
      />
    </Tabs>
  );
}
