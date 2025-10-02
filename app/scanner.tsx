import React, { useState } from 'react';
import { Text, View, StyleSheet, Platform, SafeAreaView, StatusBar, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { NFCPayload } from '@/types';

import pako from 'pako';
import { Buffer } from 'buffer';

const parsePayload = (data: string): NFCPayload | null => {
  try {
    const decoded = Buffer.from(data, 'base64');
    const decompressed = pako.inflate(decoded, { to: 'string' });
    const parts = decompressed.split('|');
    if (parts.length < 11) {
      return null;
    }
    const payload: NFCPayload = {
      version: parts[0],
      transactionId: parts[1],
      amount: parseFloat(parts[2]),
      currency: parts[3],
      operator: parts[4],
      senderId: parts[5],
      receiverHint: parts[6],
      timestamp: parseInt(parts[7], 10),
      meta: {
        note: parts[8],
      },
      sig: parts[9],
      phone_number: parts[10],
    };
    return payload;
  } catch (error) {
    console.warn('Failed to parse payload:', error);
    return null;
  }
};

const isValidPayload = (payload: NFCPayload | null): payload is NFCPayload => {
  return (
    payload &&
    typeof payload.amount === 'number' &&
    payload.amount > 0 &&
    typeof payload.operator === 'string' &&
    typeof payload.phone_number === 'string'
  );
};

export default function QrScan() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const router = useRouter();

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (!scanned) {
      setScanned(true);
      const payload = parsePayload(data);
      if (isValidPayload(payload)) {
        Toast.show({ type: 'success', text1: 'QR Code Scanned!', text2: 'Redirecting to payment...' });
        router.replace({ pathname: '/home', params: { scannedData: JSON.stringify(payload) } });
      } else {
        Toast.show({ type: 'error', text1: 'Invalid QR Code', text2: 'The QR code contains invalid data.' });
        setTimeout(() => setScanned(false), 2000);
      }
    }
  };

  if (!permission) {
    // Camera permissions are still loading.
    return (
      <SafeAreaView style={styles.container}>
        {Platform.OS === "android" ? <StatusBar hidden /> : null}
        <Text>Requesting for camera permission...</Text>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet.
    return (
      <SafeAreaView style={styles.container}>
        {Platform.OS === "android" ? <StatusBar hidden /> : null}
        <Text style={styles.permissionDeniedText}>Camera Access Denied</Text>
        <Text style={styles.permissionDeniedSubText}>
          We need your permission to show the camera.
        </Text>
        <TouchableOpacity
          onPress={requestPermission}
          style={styles.openSettingsButton}
        >
          <Text style={styles.openSettingsButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.prompt}>Scan a QR code to pay</Text>
      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          facing={'back'}
          barcodeScannerSettings={{
            barcodeTypes: ["qr"],
          }}
          onBarcodeScanned={handleBarCodeScanned}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  prompt: {
    color: 'black',
    fontSize: 18,
    marginBottom: 20,
  },
  cameraContainer: {
    width: 300,
    height: 300,
    borderRadius: 10,
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
  },
  permissionDeniedText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#EF4444',
    marginBottom: 8,
  },
  permissionDeniedSubText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  openSettingsButton: {
    backgroundColor: '#FF6600',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  openSettingsButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
