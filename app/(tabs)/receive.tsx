
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { QrCode, Nfc, XCircle } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';
import { NFCService } from '@/services/NFCService';
import { StorageService } from '@/services/StorageService';

export default function ReceiveScreen() {
  const [amount, setAmount] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrValue, setQrValue] = useState('');

  const nfcService = NFCService.getInstance();
  const storage = StorageService.getInstance();

  useEffect(() => {
    return () => {
      if (isBroadcasting) {
        nfcService.stopHCEService();
      }
    };
  }, [isBroadcasting]);

  const generatePayload = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Toast.show({ type: 'error', text1: 'Invalid Amount', text2: 'Please enter a valid amount.' });
      return null;
    }
    const profile = await storage.getUserProfile();
    return {
      operator: 'OrangeMoney', // TODO: Get from user selection
      phone_number: profile?.phoneNumber || '00000000',
      amount: parseFloat(amount),
    };
  };

  const handleStartBroadcast = async () => {
    const payload = await generatePayload();
    if (!payload) return;

    setIsBroadcasting(true);
    try {
      const success = await nfcService.startHCEService(payload as any);
      if (success) {
        storage.logEvent('nfc_broadcast_started', { amount: payload.amount });
        Toast.show({ type: 'success', text1: 'Broadcasting Started', text2: 'Hold your phone near the sender\'s device.' });
      } else {
        storage.logEvent('nfc_broadcast_error', { amount: payload.amount, error: 'Could not start service' });
        Toast.show({ type: 'error', text1: 'Error', text2: 'Could not start NFC broadcast. Try the QR code fallback.' });
        setIsBroadcasting(false);
      }
    } catch (error) {
      storage.logEvent('nfc_broadcast_error', { amount: payload.amount, error: (error as Error).message });
      console.error('Broadcast start error:', error);
      Toast.show({ type: 'error', text1: 'Error', text2: 'An unexpected error occurred.' });
      setIsBroadcasting(false);
    }
  };

  const handleShowQrCode = async () => {
    const payload = await generatePayload();
    if (!payload) return;

    storage.logEvent('qr_code_displayed', { amount: payload.amount });
    setQrValue(JSON.stringify(payload));
    setShowQrModal(true);
  };

  const handleCancelBroadcast = async () => {
    await nfcService.stopHCEService();
    storage.logEvent('nfc_broadcast_cancelled');
    setIsBroadcasting(false);
    Toast.show({ type: 'info', text1: 'Broadcast Stopped', text2: 'No longer waiting for a sender.' });
  };

  return (
    <>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Receive Payment</Text>
          <Text style={styles.subtitle}>
            {isBroadcasting
              ? 'Waiting for sender to tap...'
              : 'Enter the amount you want to receive.'}
          </Text>
        </View>

        <View style={styles.content}>
          {isBroadcasting ? (
            <View style={styles.broadcastingIndicator}>
              <ActivityIndicator size="large" color="#FF6600" />
              <Text style={styles.broadcastingText}>Broadcasting via NFC...</Text>
            </View>
          ) : (
            <>
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={setAmount}
                placeholder="0"
                keyboardType="numeric"
                placeholderTextColor="#999"
              />
              <Text style={styles.currency}>XOF</Text>
            </>
          )}
        </View>

        <View style={styles.actions}>
          {isBroadcasting ? (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancelBroadcast}
            >
              <XCircle size={24} color="white" />
              <Text style={styles.buttonText}>Cancel NFC</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                style={styles.generateButton}
                onPress={handleStartBroadcast}
              >
                <Nfc size={24} color="white" />
                <Text style={styles.buttonText}>Use NFC</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.qrButton} onPress={handleShowQrCode}>
                <QrCode size={24} color="#333" />
                <Text style={[styles.buttonText, { color: '#333' }]}>
                  Use QR Code
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <Modal visible={showQrModal} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.qrModalContent}>
            <Text style={styles.modalTitle}>Scan to Pay</Text>
            <Text style={styles.modalSubtitle}>Ask the sender to scan this QR code.</Text>
            <View style={styles.qrCodeContainer}>
              {qrValue ? <QRCode value={qrValue} size={250} /> : <ActivityIndicator />}
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowQrModal(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 40, // Reduced
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 10, // Reduced
  },
  title: {
    fontSize: 22, // Reduced
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4, // Reduced
  },
  subtitle: {
    fontSize: 14, // Reduced
    color: '#666',
    textAlign: 'center',
    minHeight: 30, // Reduced
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  amountInput: {
    fontSize: 48, // Reduced
    fontWeight: 'bold',
    color: '#111',
    textAlign: 'center',
  },
  currency: {
    fontSize: 18, // Reduced
    color: '#666',
    marginTop: 4, // Reduced
  },
  broadcastingIndicator: {
    alignItems: 'center',
  },
  broadcastingText: {
    marginTop: 10, // Reduced
    fontSize: 16, // Reduced
    color: '#FF6600',
    fontWeight: '600',
  },
  actions: {
    padding: 10, // Reduced
  },
  generateButton: {
    backgroundColor: '#FF6600',
    paddingVertical: 10, // Reduced
    borderRadius: 8, // Reduced
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 6, // Reduced
  },
  qrButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 10, // Reduced
    borderRadius: 8, // Reduced
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  cancelButton: {
    backgroundColor: '#dc3545',
    paddingVertical: 10, // Reduced
    borderRadius: 8, // Reduced
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 14, // Reduced
    fontWeight: 'bold',
  },
  // QR Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrModalContent: {
    backgroundColor: 'white',
    borderRadius: 12, // Reduced
    padding: 20, // Reduced
    alignItems: 'center',
    width: '85%',
  },
  modalTitle: {
    fontSize: 18, // Reduced
    fontWeight: 'bold',
    marginBottom: 4, // Reduced
  },
  modalSubtitle: {
    fontSize: 14, // Reduced
    color: '#666',
    marginBottom: 15, // Reduced
    textAlign: 'center',
  },
  qrCodeContainer: {
    marginBottom: 20, // Reduced
    padding: 10, // Reduced
    backgroundColor: 'white',
    borderRadius: 8, // Reduced
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, // Reduced
    shadowOpacity: 0.1,
    shadowRadius: 4, // Reduced
    elevation: 3,
  },
  closeButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 8, // Reduced
    paddingHorizontal: 25, // Reduced
    borderRadius: 8, // Reduced
  },
  closeButtonText: {
    fontSize: 14, // Reduced
    fontWeight: '600',
    color: '#333',
  },
});
