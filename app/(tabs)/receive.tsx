
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { QrCode, Nfc, XCircle, ChevronDown, Plus } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';
import { NFCService } from '@/services/NFCService';
import { StorageService } from '@/services/StorageService';
import SimCardsManagerModule from 'react-native-sim-cards-manager';
import DialPad from '../../components/DialPad';
import { UserProfile, SimInfo } from '@/types';

export default function ReceiveScreen() {
  const [amount, setAmount] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrValue, setQrValue] = useState('');
  const [isNFCSupported, setIsNFCSupported] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [selectedPhoneNumber, setSelectedPhoneNumber] = useState<string | null>(null);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [simInfo, setSimInfo] = useState<SimInfo[]>([]);
  const [showAddPhoneModal, setShowAddPhoneModal] = useState(false);
  const [newPhoneNumber, setNewPhoneNumber] = useState('');
  const [selectedSim, setSelectedSim] = useState<SimInfo | null>(null);

  const nfcService = NFCService.getInstance();
  const storage = StorageService.getInstance();

  useEffect(() => {
    setIsNFCSupported(nfcService.isSupported);
    const loadData = async () => {
      const profile = await storage.getUserProfile();
      setUserProfile(profile);
      if (profile?.phoneNumbers) {
        const phoneNumbers = Object.values(profile.phoneNumbers);
        if (phoneNumbers.length > 0) {
          setSelectedPhoneNumber(phoneNumbers[0]);
        }
      }
      try {
        const simCards = await SimCardsManagerModule.getSimCards();
        // Adapt the new structure to the existing SimInfo type
        const adaptedSims: SimInfo[] = simCards.map((sim: any) => ({
          slotIndex: sim.slotIndex,
          subscriptionId: sim.subscriptionId,
          carrierName: sim.carrierName,
          phoneNumber: sim.phoneNumber,
        }));
        setSimInfo(adaptedSims);
      } catch (error) {
        console.error("Failed to get SIM cards", error);
        // Keep simInfo empty or show an error
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    return () => {
      if (isBroadcasting) {
        nfcService.stopHCEService();
      }
    };
  }, [isBroadcasting]);

  const handleKeyPress = (key: string) => {
    if (key === '<Backspace') {
      setAmount((prev) => prev.slice(0, -1));
    } else if (key === '.' && amount.includes('.')) {
      return;
    } else {
      setAmount((prev) => prev + key);
    }
  };

  const generatePayload = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Toast.show({ type: 'error', text1: 'Invalid Amount', text2: 'Please enter a valid amount.' });
      return null;
    }
    if (!selectedPhoneNumber) {
      Toast.show({ type: 'error', text1: 'No Phone Number', text2: 'Please select a phone number to receive payment.' });
      return null;
    }
    return {
      operator: 'OrangeMoney', // TODO: Get from user selection
      phone_number: selectedPhoneNumber,
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

  const handleSavePhoneNumber = async () => {
    if (selectedSim) {
      const newPhoneNumbers = { ...userProfile?.phoneNumbers, [selectedSim.subscriptionId]: newPhoneNumber };
      const newProfile = { ...userProfile, phoneNumbers: newPhoneNumbers };
      await storage.saveUserProfile(newProfile as UserProfile);
      setUserProfile(newProfile as UserProfile);
      setSelectedPhoneNumber(newPhoneNumber);
      setShowAddPhoneModal(false);
      setNewPhoneNumber('');
      Toast.show({ type: 'success', text1: 'Success', text2: 'Phone number added.' });
    }
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
              <Text style={styles.amountDisplay}>{amount || '0'}</Text>
              <Text style={styles.currency}>XOF</Text>
            </>
          )}
        </View>

        <DialPad onKeyPress={handleKeyPress} />

        <View style={styles.formContainer}>
          <TouchableOpacity
            style={styles.phoneSelector}
            onPress={() => {
              if (userProfile?.phoneNumbers && Object.values(userProfile.phoneNumbers).length > 0) {
                setShowPhoneModal(true);
              } else {
                if (simInfo.length === 0) {
                  Alert.alert('No SIM cards found', 'Please insert a SIM card to add a phone number.');
                  return;
                }
                if (simInfo.length > 0) {
                  setSelectedSim(simInfo[0]);
                }
                setShowAddPhoneModal(true);
              }
            }}
          >
            <Text style={styles.phoneSelectorText}>
              {selectedPhoneNumber || 'Select Phone Number'}
            </Text>
            <ChevronDown size={20} color="#333" />
          </TouchableOpacity>
        </View>

        <View style={styles.actions}>
          {isBroadcasting ? (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancelBroadcast}
            >
              <XCircle size={20} color="white" />
              <Text style={styles.buttonText}>Cancel NFC</Text>
            </TouchableOpacity>
          ) : (
            <>
              {isNFCSupported && (
                <TouchableOpacity
                  style={styles.generateButton}
                  onPress={handleStartBroadcast}
                >
                  <Nfc size={20} color="white" />
                  <Text style={styles.buttonText}>Send NFC</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.qrButton} onPress={handleShowQrCode}>
                <QrCode size={20} color="#333" />
                <Text style={[styles.buttonText, { color: '#333' }]}>
                  Generate QR
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
              {qrValue ? <QRCode value={qrValue} size={200} /> : <ActivityIndicator />}
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

      <Modal
        visible={showPhoneModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPhoneModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {userProfile?.phoneNumbers && Object.values(userProfile.phoneNumbers).map((phone, index) => (
              <TouchableOpacity
                key={index}
                style={styles.phoneModalItem}
                onPress={() => {
                  setSelectedPhoneNumber(phone);
                  setShowPhoneModal(false);
                }}
              >
                <Text style={styles.phoneModalText}>{phone}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      <Modal
        visible={showAddPhoneModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddPhoneModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Phone Number</Text>
            <View style={styles.simSelectorContainer}>
              {simInfo.map((sim) => (
                <TouchableOpacity
                  key={sim.subscriptionId}
                  style={[
                    styles.simOption,
                    selectedSim?.subscriptionId === sim.subscriptionId && styles.simOptionSelected,
                  ]}
                  onPress={() => setSelectedSim(sim)}
                >
                  <Text>SIM {sim.slotIndex + 1}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.input}
              placeholder="Phone Number"
              keyboardType="phone-pad"
              value={newPhoneNumber}
              onChangeText={setNewPhoneNumber}
            />
            <TouchableOpacity style={styles.saveButton} onPress={handleSavePhoneNumber}>
              <Text style={styles.saveButtonText}>Save Number</Text>
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
    paddingTop: 30, // Reduced
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 8, // Reduced
  },
  title: {
    fontSize: 20, // Reduced
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4, // Reduced
  },
  subtitle: {
    fontSize: 12, // Reduced
    color: '#666',
    textAlign: 'center',
    minHeight: 25, // Reduced
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  amountDisplay: {
    fontSize: 40, // Reduced
    fontWeight: 'bold',
    color: '#111',
    textAlign: 'center',
  },
  currency: {
    fontSize: 16, // Reduced
    color: '#666',
    marginTop: 3, // Reduced
  },
  broadcastingIndicator: {
    alignItems: 'center',
  },
  broadcastingText: {
    marginTop: 8, // Reduced
    fontSize: 14, // Reduced
    color: '#FF6600',
    fontWeight: '600',
  },
  formContainer: {
    marginHorizontal: 15,
    marginBottom: 10,
  },
  phoneSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#f5f5f5',
  },
  phoneSelectorText: {
    fontSize: 16,
    fontWeight: '600',
  },
  actions: {
    padding: 8, // Reduced
  },
  generateButton: {
    backgroundColor: '#FF6600',
    paddingVertical: 10, // Reduced
    borderRadius: 6, // Reduced
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 5, // Reduced
  },
  qrButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 10, // Reduced
    borderRadius: 6, // Reduced
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  cancelButton: {
    backgroundColor: '#dc3545',
    paddingVertical: 10, // Reduced
    borderRadius: 6, // Reduced
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  buttonText: {
    color: 'white',
    fontSize: 12, // Reduced
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
    borderRadius: 10, // Reduced
    padding: 18, // Reduced
    alignItems: 'center',
    width: '85%',
  },
  modalTitle: {
    fontSize: 16, // Reduced
    fontWeight: 'bold',
    marginBottom: 3, // Reduced
  },
  modalSubtitle: {
    fontSize: 12, // Reduced
    color: '#666',
    marginBottom: 12, // Reduced
    textAlign: 'center',
  },
  qrCodeContainer: {
    marginBottom: 18, // Reduced
    padding: 8, // Reduced
    backgroundColor: 'white',
    borderRadius: 6, // Reduced
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, // Reduced
    shadowOpacity: 0.1,
    shadowRadius: 3, // Reduced
    elevation: 3,
  },
  closeButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 8, // Reduced
    paddingHorizontal: 20, // Reduced
    borderRadius: 6, // Reduced
  },
  closeButtonText: {
    fontSize: 12, // Reduced
    fontWeight: '600',
    color: '#333',
  },
  phoneModalItem: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  phoneModalText: {
    fontSize: 16,
    textAlign: 'center',
  },
});
