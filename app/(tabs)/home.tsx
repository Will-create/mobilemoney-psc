import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Button,
  TextInput,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Toast from 'react-native-toast-message';

import { Smartphone, Check, X, QrCode, Nfc } from 'lucide-react-native';
import { NFCService } from '@/services/NFCService';
import { StorageService } from '@/services/StorageService';
import { USSDService } from '@/services/USSDService';
import { NFCPayload, SimInfo } from '@/types';
import { OPERATORS } from '@/data/operators';
import AuthPrompt from '@/components/AuthPrompt';

export default function HomeScreen() {
  const [isListening, setIsListening] = useState(false);
  const [incomingTransaction, setIncomingTransaction] = useState<NFCPayload | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [simMappings, setSimMappings] = useState<{ [key: string]: number }>({});
  const [simInfo, setSimInfo] = useState<SimInfo[]>([]);
  const [selectedSubId, setSelectedSubId] = useState<number | undefined>();
  const [isNFCSupported, setIsNFCSupported] = useState(false);
  const [activeTab, setActiveTab] = useState('qr');

  const nfcService = NFCService.getInstance();
  const storageService = StorageService.getInstance();
  const ussdService = USSDService.getInstance();
  const isFocused = useIsFocused();
  const router = useRouter();
  const localSearchParams = useLocalSearchParams();

  const handleScanQRCode = () => {
    router.push('/scanner');
  };

  useEffect(() => {
    const checkNFCSupport = async () => {
      const nfcSupported = nfcService.isSupported;
      setIsNFCSupported(nfcSupported);
      await storageService.saveData('nfcSupported', nfcSupported.toString());
    };
    checkNFCSupport();
  }, []);

  useEffect(() => {
    if (localSearchParams.scannedData) {
      try {
        const scannedPayload = JSON.parse(localSearchParams.scannedData as string) as NFCPayload;
        handleTransactionReceived(scannedPayload);
      } catch (error) {
        console.error('Failed to parse scanned QR data:', error);
        Toast.show({ type: 'error', text1: 'Invalid QR Code', text2: 'Could not parse transaction data.' });
      }
    }
  }, [localSearchParams.scannedData]);

  const [ussdCode, setUssdCode] = useState('');
  const [ussdResponse, setUssdResponse] = useState('');

  useEffect(() => {
    const ussdEventListener = ussdService.addUssdEventListener(event => {
      console.log('USSD Event:', event);
      setUssdResponse(event.ussdReply);
    });

    const ussdErrorEventListener = ussdService.addUssdErrorEventListener(event => {
      console.error('USSD Error Event:', event);
      setUssdResponse(`Error: ${event.error}`);
    });

    return () => {
      ussdEventListener.remove();
      ussdErrorEventListener.remove();
    };
  }, []);

  const handleGetSimInfo = async () => {
    const sims = await ussdService.getSimInfo();
    setSimInfo(sims);
  };

  const handleDial = () => {
    if (ussdCode) {
      ussdService.dial(ussdCode, selectedSubId);
    } else {
      Toast.show({ type: 'error', text1: 'Empty USSD code', text2: 'Please enter a USSD code to dial.' });
    }
  };

  

  useEffect(() => {
    let cleanupNFC: (() => void) | undefined;

    const manageNFCListening = () => {
      if (!isNFCSupported || activeTab !== 'nfc') return;

      if (isFocused) {
        setIsListening(true);
        console.log('Starting NFC listener...');
        cleanupNFC = nfcService.listenForPayload(
          (payload) => {
            setIsListening(false);
            handleTransactionReceived(payload);
          },
          (error) => {
            if (!error.message.includes('cancelled')) {
              console.error('NFC listening error:', error);
            }
          }
        );
      } else {
        if (cleanupNFC) {
          cleanupNFC();
          cleanupNFC = undefined;
        }
        setIsListening(false);
        console.log('NFC listener stopped.');
      }
    };

    manageNFCListening();

    return () => {
      if (cleanupNFC) {
        cleanupNFC();
      }
    };
  }, [isFocused, isNFCSupported, activeTab]);

  const startListening = useCallback(() => {
    // Logic moved to useEffect
  }, []);

  const stopListening = useCallback(() => {
    // Logic moved to useEffect
  }, []);

  const handleTransactionReceived = (payload: any) => {
    storageService.logEvent('transaction_received', { from: payload.phone_number, amount: payload.amount });
    const operator = payload.operator;
    const mappedSubId = simMappings[operator];
    if (mappedSubId && simInfo.some(s => s.subscriptionId === mappedSubId)) {
      setSelectedSubId(mappedSubId);
    } else {
      setSelectedSubId(simInfo.length === 1 ? simInfo[0].subscriptionId : undefined);
    }
    setIncomingTransaction(payload);
    setShowModal(true);
  };



  const handleAcceptTransaction = () => {
    if (!selectedSubId && simInfo.length > 1) {
      Toast.show({ type: 'error', text1: 'SIM not selected', text2: 'Please select a SIM card for this operator.' });
      return;
    }
    storageService.logEvent('transaction_accepted', { amount: incomingTransaction?.amount });
    setShowModal(false);
    setShowAuthPrompt(true);
  };

  const handleDeclineTransaction = () => {
    storageService.logEvent('transaction_declined', { amount: incomingTransaction?.amount });
    setShowModal(false);
    setIncomingTransaction(null);
    startListening();
  };

  const handlePinSuccess = async (pin: string) => {
    setShowAuthPrompt(false);
    if (!incomingTransaction) return;

    // Persist the choice if it was made just now
    if (selectedSubId && !simMappings[incomingTransaction.operator]) {
      const newMappings = { ...simMappings, [incomingTransaction.operator]: selectedSubId };
      setSimMappings(newMappings);
      await storageService.saveSimMappings(newMappings);
    }

    try {
      const operatorConfig = OPERATORS.find(op => op.name === incomingTransaction.operator);
      if (!operatorConfig) {
        throw new Error(`Operator ${incomingTransaction.operator} not found`);
      }
      const ussdCode = operatorConfig.ussdTemplate
        .replace('{recipient}', (incomingTransaction as any).phone_number)
        .replace('{amount}', incomingTransaction.amount.toString())
        .replace('{PIN}', pin);

      await ussdService.dial(ussdCode, selectedSubId);
      
      storageService.logEvent('ussd_dial_success', { operator: incomingTransaction.operator });
      Toast.show({ type: 'success', text1: 'Transaction Successful', text2: 'The USSD code has been dialed.' });

    } catch (error) {
        storageService.logEvent('ussd_dial_error', { operator: incomingTransaction.operator, error: (error as Error).message });
        console.error('USSD execution error:', error);
        Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to execute USSD command' });
    } finally {
      setIncomingTransaction(null);
      startListening();
    }
  };

  const getSimDisplayName = (subId: number) => {
    const sim = simInfo.find(s => s.subscriptionId === subId);
    return sim ? `SIM ${sim.slotIndex + 1} (${sim.carrierName})` : 'Unknown SIM';
  };

  const getOperatorInfo = (operatorName: string) => {
    return OPERATORS.find(op => op.name === operatorName) || OPERATORS[0];
  };




  return (
    <>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Ready to Pay</Text>
          <Text style={styles.subtitle}>
            {isNFCSupported ? 'Scan QR or use NFC to pay' : 'Scan a QR code to pay'}
          </Text>
        </View>

        {isNFCSupported && (
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'qr' && styles.activeTab]}
              onPress={() => setActiveTab('qr')}
            >
              <QrCode size={20} color={activeTab === 'qr' ? '#FF6600' : '#333'} />
              <Text style={[styles.tabText, activeTab === 'qr' && styles.activeTabText]}>Scan QR</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'nfc' && styles.activeTab]}
              onPress={() => setActiveTab('nfc')}
            >
              <Nfc size={20} color={activeTab === 'nfc' ? '#FF6600' : '#333'} />
              <Text style={[styles.tabText, activeTab === 'nfc' && styles.activeTabText]}>Connect NFC</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'ussd' && styles.activeTab]}
              onPress={() => setActiveTab('ussd')}
            >
              <Text style={[styles.tabText, activeTab === 'ussd' && styles.activeTabText]}>USSD Test</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.content}>
          {activeTab === 'qr' && (
            <TouchableOpacity style={styles.qrButton} onPress={handleScanQRCode}>
              <QrCode size={80} color="#333" />
              <Text style={styles.qrButtonText}>Scan QR Code</Text>
            </TouchableOpacity>
          )}
          {activeTab === 'nfc' && (
            <View style={styles.nfcIndicator}>
              <Smartphone size={80} color={isListening ? '#FF6600' : '#ccc'} />
              <Text style={styles.statusText}>
                {isListening ? 'Scanning for Receiver...' : 'NFC Inactive'}
              </Text>
            </View>
          )}
          {activeTab === 'ussd' && (
            <View style={styles.ussdContainer}>
              <TextInput
                style={styles.ussdInput}
                placeholder="Enter USSD Code"
                value={ussdCode}
                onChangeText={setUssdCode}
              />
              <Button title="Dial" onPress={handleDial} />
              <Button title="Get SIM Info" onPress={handleGetSimInfo} />
              <Text style={styles.ussdResponse}>{ussdResponse}</Text>
              <View>
                {simInfo.map(sim => (
                  <Text key={sim.subscriptionId}>{`SIM ${sim.slotIndex + 1}: ${sim.carrierName}`}</Text>
                ))}
              </View>
            </View>
          )}
        </View>
      </View>

      <Modal visible={showModal} transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirm Payment</Text>
            {incomingTransaction && (
              <View style={styles.transactionDetails}>
                 <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Amount:</Text>
                  <Text style={styles.detailValue}>
                    {`${incomingTransaction.amount} XOF`}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>To:</Text>
                  <Text style={styles.detailValue}>
                    {(incomingTransaction as any).phone_number}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Via:</Text>
                  <Text style={[styles.detailValue, { color: getOperatorInfo(incomingTransaction.operator).color }]}>
                    {getOperatorInfo(incomingTransaction.operator).displayName}
                  </Text>
                </View>
                {simInfo.length > 1 && (
                  <View style={styles.simSelectionContainer}>
                    <Text style={styles.detailLabel}>Pay with:</Text>
                    {selectedSubId ? (
                      <Text style={styles.detailValue}>{getSimDisplayName(selectedSubId)}</Text>
                    ) : (
                      <View style={styles.simOptions}>
                        {simInfo.map(sim => (
                          <TouchableOpacity key={sim.subscriptionId} onPress={() => setSelectedSubId(sim.subscriptionId)}>
                            <Text>{getSimDisplayName(sim.subscriptionId)}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.declineButton} onPress={handleDeclineTransaction}>
                <X size={18} color="white" />
                <Text style={styles.actionButtonText}>Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.acceptButton} onPress={handleAcceptTransaction}>
                <Check size={18} color="white" />
                <Text style={styles.actionButtonText}>Accept & Pay</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <AuthPrompt
        visible={showAuthPrompt}
        title="Authorize Payment"
        subtitle="Enter your PIN to complete the transaction"
        onSuccess={handlePinSuccess}
        onCancel={() => {
          setShowAuthPrompt(false);
          startListening();
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 30, // Reduced
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    alignItems: 'center',
  },
  title: {
    fontSize: 20, // Reduced
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12, // Reduced
    color: '#666',
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 10,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    marginHorizontal: 5,
  },
  activeTab: {
    backgroundColor: '#FFF5E6',
    borderColor: '#FF6600',
  },
  tabText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  activeTabText: {
    color: '#FF6600',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  nfcIndicator: {
    alignItems: 'center',
    marginBottom: 15, // Reduced
  },
  statusText: {
    fontSize: 12, // Reduced
    fontWeight: '600',
    marginTop: 8, // Reduced
    textAlign: 'center',
    color: '#666',
  },
  qrButton: {
    alignItems: 'center',
    gap: 10,
  },
  qrButtonText: {
    color: '#333',
    fontSize: 16, // Reduced
    fontWeight: 'bold',
  },
  scannerContainer: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'flex-end',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10, // Reduced
    padding: 12, // Reduced
    margin: 20,
    minWidth: 260, // Reduced
  },
  modalTitle: {
    fontSize: 16, // Reduced
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 12, // Reduced
  },
  transactionDetails: {
    marginBottom: 18, // Reduced
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6, // Reduced
  },
  detailLabel: {
    fontSize: 12, // Reduced
    color: '#666',
  },
  detailValue: {
    fontSize: 12, // Reduced
    fontWeight: '600',
    color: '#333',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 8, // Reduced
  },
  acceptButton: {
    backgroundColor: '#28a745',
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 6, gap: 5,
  },
  declineButton: {
    backgroundColor: '#dc3545',
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 6, gap: 5,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12, // Reduced
    fontWeight: '600',
  },
  simSelectionContainer: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    marginTop: 12, // Reduced
    paddingTop: 8, // Reduced
  },
  simOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 6, // Reduced
  },
  ussdContainer: {
    alignItems: 'center',
    gap: 10,
  },
  ussdInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 5,
    width: '80%',
  },
  ussdResponse: {
    marginTop: 20,
    color: '#333',
  },
});