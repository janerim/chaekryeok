import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '@/constants/colors';
import { useBookStore } from '@/store/bookStore';

export default function RootLayout() {
  const init = useBookStore((s) => s.init);

  useEffect(() => {
    init().catch(console.error);
  }, [init]);

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            headerTintColor: Colors.primary,
            headerTitleStyle: { fontSize: 17, fontWeight: '600' },
            headerStyle: { backgroundColor: Colors.background },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: Colors.background },
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="book-form"
            options={{
              presentation: 'modal',
              headerShown: true,
              title: '기록',
            }}
          />
          <Stack.Screen
            name="book-detail"
            options={{
              headerShown: true,
              title: '책 상세',
              headerBackTitle: '뒤로',
            }}
          />
          <Stack.Screen
            name="image-search"
            options={{ presentation: 'modal', headerShown: false }}
          />
          <Stack.Screen
            name="backup"
            options={{
              headerShown: true,
              title: '백업 / 복원',
              headerBackTitle: '뒤로',
            }}
          />
        </Stack>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
