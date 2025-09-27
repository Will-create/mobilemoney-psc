import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { Send, Smartphone } from 'lucide-react-native';
import { OPERATORS } from '@/data/operators';
import { NFCService } from '@/services/NFCService';
import { CryptoService } from '@/services/CryptoService';
import { StorageService } from '@/services/StorageService';
import { USSDService } from '@/services/USSDService';
import AuthPrompt from '@/components/AuthPrompt';
import { NFCPayload } from '@/types';

export default function SendScreen() {
  const [amount, setAmount] = useState('');
  const [selectedOperator, setSelectedOperator] = useState(OPERATORS[0]);
  const [note, setNote] = useState('');
  const [isNFCActive, setIsNFCActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [transactionPayload, setTransactionPayload] = useState<NFCPayload | null>(null);

  const nfcService = NFCService.getInstance();
  const cryptoService = CryptoService.getInstance();
  const storageService = StorageService.getInstance();
  const ussdService = USSDService.getInstance();

  const handleSendMoney = async () => {
    if (!nfcService.isSupported) {
      Toast.show({ type: 'error', text1: 'NFC Not Supported', text2: 'This device does not support NFC' });
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      Toast.show({ type: 'error', text1: 'Invalid Amount', text2: 'Please enter a valid amount' });
      return;
    }

    setLoading(true);
    setIsNFCActive(true);

    try {
      const walletSettings = await storageService.getWalletSettings();
      if (!walletSettings) {
        Toast.show({ type: 'error', text1: 'Setup Required', text2: 'Please complete wallet setup first' });
        return;
      }

      const userProfile = await storageService.getUserProfile();
      const senderId = userProfile?.userId || 'anonymous';

      const payload = await nfcService.createPayload(
        parseFloat(amount),
        selectedOperator.name,
        senderId,
        'unknown', // Will be filled by receiver
        walletSettings.encryptionKeyId,
        note
      );

      setTransactionPayload(payload);

      const success = await nfcService.sendPayload(payload);
      
      if (success) {
        Toast.show({
          type: 'success',
          text1: 'Transaction Sent',
          text2: 'Please wait for the receiver to accept the transaction'
        });
        
        await storageService.saveTransaction({
          transactionId: payload.transactionId,
          direction: 'sent',
          amount: payload.amount,
          currency: payload.currency,
          operator: payload.operator,
          counterpartyId: payload.receiverHint,
          timestamp: payload.timestamp,
          status: 'pending',
          signedProof: payload.sig,
          rawLogs: JSON.stringify(payload)
        });

        // Wait for a few seconds before showing the PIN prompt
        setTimeout(() => {
          setShowAuthPrompt(true);
        }, 3000);

      } else {
        Toast.show({ type: 'error', text1: 'Transfer Failed', text2: 'Could not initiate NFC transfer' });
      }
    } catch (error) {
      console.error('Send money error:', error);
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to send transaction' });
    } finally {
      setLoading(false);
      setIsNFCActive(false);
    }
  };

  const handlePinSuccess = async (pin: string) => {
    setShowAuthPrompt(false);
    if (!transactionPayload) return;

    try {
      const result = await ussdService.execute(
        transactionPayload.operator,
        transactionPayload.receiverHint, // This needs to be updated by the receiver
        transactionPayload.amount.toString(),
        pin
      );

      if (result.success) {
        Toast.show({ type: 'success', text1: 'Transaction Successful', text2: 'The USSD code has been dialed.' });
        await storageService.updateTransactionStatus(transactionPayload.transactionId, 'success');
      } else {
        Toast.show({ type: 'error', text1: 'Transaction Failed', text2: result.message });
        await storageService.updateTransactionStatus(transactionPayload.transactionId, 'failed');
      }
    } catch (error) {
      console.error('USSD execution error:', error);
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to execute USSD command' });
      await storageService.updateTransactionStatus(transactionPayload.transactionId, 'failed');
    }

    // Reset form
    setAmount('');
    setNote('');
    setTransactionPayload(null);
  };

  return (
    <>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Send Money</Text>
          <Text style={styles.subtitle}>Transfer money via NFC</Text>
        </View>

        <View style={styles.amountSection}>
          <Text style={styles.label}>Amount (XOF)</Text>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={setAmount}
            placeholder="0"
            keyboardType="numeric"
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.operatorSection}>
          <Text style={styles.label}>Select Operator</Text>
          <View style={styles.operatorGrid}>
            {OPERATORS.map((operator) => (
              <TouchableOpacity
                key={operator.id}
                style={[
                  styles.operatorCard,
                  {
                    backgroundColor: selectedOperator.id === operator.id 
                      ? operator.color 
                      : '#f5f5f5',
                    borderColor: selectedOperator.id === operator.id
                      ? operator.color
                      : '#eee',
                  }
                ]}
                onPress={() => setSelectedOperator(operator)}
              >
                <Text
                  style={[
                    styles.operatorText,
                    {
                      color: selectedOperator.id === operator.id 
                        ? 'white' 
                        : '#333'
                    }
                  ]}
                >
                  {operator.displayName}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.noteSection}>
          <Text style={styles.label}>Note (Optional)</Text>
          <TextInput
            style={styles.noteInput}
            value={note}
            onChangeText={setNote}
            placeholder="Add a note..."
            multiline
            placeholderTextColor="#999"
          />
        </View>

        <TouchableOpacity
          style={[
            styles.sendButton,
            { backgroundColor: selectedOperator.color }
          ]}
          onPress={handleSendMoney}
          disabled={loading || isNFCActive}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Send size={20} color="white" />
              <Text style={styles.sendButtonText}>
                {isNFCActive ? 'Approach Device' : 'Send Money'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {isNFCActive && (
          <View style={styles.nfcIndicator}>
            <Smartphone size={40} color={selectedOperator.color} />
            <Text style={styles.nfcText}>
              Hold your phone close to the receiver's device
            </Text>
          </View>
        )}
      </ScrollView>
      <AuthPrompt
        visible={showAuthPrompt}
        title="Authorize Transaction"
        subtitle="Enter your PIN to complete the transaction"
        onSuccess={handlePinSuccess}
        onCancel={() => setShowAuthPrompt(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 40,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
  },
  amountSection: {
    padding: 20,
    alignItems: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  amountInput: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#111',
    borderBottomWidth: 2,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 10,
    width: '80%',
    textAlign: 'center',
  },
  operatorSection: {
    padding: 20,
  },
  operatorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  operatorCard: {
    paddingVertical: 15,
    borderRadius: 12,
    marginBottom: 10,
    width: '48%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
  },
  operatorText: {
    fontSize: 14,
    fontWeight: '600',
  },
  noteSection: {
    padding: 20,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  sendButton: {
    margin: 20,
    paddingVertical: 20,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sendButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  nfcIndicator: {
    alignItems: 'center',
    padding: 20,
    margin: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderStyle: 'dashed',
  },
  nfcText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
  },
});