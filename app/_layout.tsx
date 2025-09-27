import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StorageService } from '@/services/StorageService';
import { SyncService } from '@/services/SyncService';
import { NFCService } from '@/services/NFCService';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import Toast from 'react-native-toast-message';
import { TailwindProvider } from 'tailwindcss-react-native';

export default function RootLayout() {
  useFrameworkReady();
  useEffect(() => {
    initializeApp();

    return () => {
      // Stop sync service on app close
      SyncService.getInstance().stop();
    };
  }, []);

  const initializeApp = async () => {
    try {
      // Initialize storage
      await StorageService.getInstance().initialize();
      
      // Initialize NFC Service
      const nfcService = NFCService.getInstance();
      await nfcService.initialize();

      // Start background sync
      SyncService.getInstance().start();
    } catch (error) {
      console.error('App initialization failed:', error);
    }
  };

  return (
    <TailwindProvider platform={Platform.OS}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
      <StatusBar style="auto" />
      <Toast />
    </TailwindProvider>
  );
}