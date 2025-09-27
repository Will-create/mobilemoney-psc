import React, { useState, useEffect } from 'react';
import { Text, View, StyleSheet, Platform, SafeAreaView, StatusBar, Linking, TouchableOpacity } from 'react-native';
import { CameraView, CameraType } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useTailwind } from 'tailwindcss-react-native';
import { XCircle } from 'lucide-react-native';

export default function QrScan() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const router = useRouter();
  const tw = useTailwind();

  useEffect(() => {
    const getCameraPermissions = async () => {
      console.log('getCameraPermissions called');
      const { status } = await CameraView.requestCameraPermissionsAsync();
      console.log('Camera permission status:', status);
      setHasPermission(status === 'granted');
      console.log('hasPermission after set:', status === 'granted');
    };

    getCameraPermissions();
  }, []);

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (!scanned) {
      setScanned(true);
      router.replace({ pathname: '/', params: { scannedData: data } });
    }
  };

  const openSettings = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  };

  if (hasPermission === null) {
    return (
      <SafeAreaView style={tw('flex-1 justify-center items-center bg-white')}>
        {Platform.OS === "android" ? <StatusBar hidden /> : null}
        <Text style={tw('text-lg text-gray-700')}>Requesting for camera permission...</Text>
      </SafeAreaView>
    );
  }

  if (hasPermission === false) {
    return (
      <SafeAreaView style={tw('flex-1 justify-center items-center bg-white p-4')}>
        {Platform.OS === "android" ? <StatusBar hidden /> : null}
        <XCircle size={64} color="#EF4444" style={tw('mb-4')} />
        <Text style={tw('text-xl font-bold text-red-500 mb-2')}>Camera Access Denied</Text>
        <Text style={tw('text-base text-gray-600 text-center mb-6')}>
          Please enable camera access in your device settings to use the QR scanner.
        </Text>
        <TouchableOpacity
          onPress={openSettings}
          style={tw('bg-orange-500 px-6 py-3 rounded-lg')}
        >
          <Text style={tw('text-white text-lg font-semibold')}>Open Settings</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={tw('flex-1 bg-black')}>
      {Platform.OS === "android" ? <StatusBar hidden /> : null}
      <CameraView
        style={tw('flex-1')}
        facing={CameraType.back}
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
        onBarcodeScanned={handleBarCodeScanned}
      />
    </SafeAreaView>
  );
}

