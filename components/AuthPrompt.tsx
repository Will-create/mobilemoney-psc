import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { Shield, Fingerprint } from 'lucide-react-native';
import { CryptoService } from '@/services/CryptoService';
import { StorageService } from '@/services/StorageService';

interface AuthPromptProps {
  visible: boolean;
  title: string;
  subtitle: string;
  onSuccess: (pin: string) => void;
  onCancel: () => void;
}

export default function AuthPrompt({ 
  visible, 
  title, 
  subtitle, 
  onSuccess, 
  onCancel 
}: AuthPromptProps) {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const cryptoService = CryptoService.getInstance();
  const storageService = StorageService.getInstance();

  const handlePinSubmit = async () => {
    if (pin.length < 4) {
      Toast.show({ type: 'error', text1: 'Invalid PIN', text2: 'PIN must be at least 4 digits' });
      return;
    }

    setLoading(true);

    try {
      const walletSettings = await storageService.getWalletSettings();
      if (!walletSettings) {
        Toast.show({ type: 'error', text1: 'Error', text2: 'Wallet not setup' });
        return;
      }

      const isValid = await cryptoService.verifyPin(pin, walletSettings.pinHash);
      
      if (isValid) {
        onSuccess(pin);
        setPin('');
        setAttempts(0);
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        
        if (newAttempts >= 3) {
          Toast.show({
            type: 'error',
            text1: 'Too Many Attempts',
            text2: 'Please try again later',
            onHide: onCancel,
          });
        } else {
          Toast.show({ type: 'error', text1: 'Invalid PIN', text2: `${3 - newAttempts} attempts remaining` });
        }
        setPin('');
      }
    } catch (error) {
      console.error('Auth error:', error);
      Toast.show({ type: 'error', text1: 'Error', text2: 'Authentication failed' });
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricAuth = async () => {
    // In production, implement biometric authentication
    Toast.show({ type: 'info', text1: 'Biometric Auth', text2: 'Feature coming soon' });
  };

  const handleCancel = () => {
    setPin('');
    setAttempts(0);
    onCancel();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Shield size={40} color="#FF6600" />
            </View>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>

          <View style={styles.pinContainer}>
            <Text style={styles.pinLabel}>Enter PIN</Text>
            <TextInput
              style={styles.pinInput}
              value={pin}
              onChangeText={setPin}
              placeholder="••••"
              secureTextEntry
              keyboardType="numeric"
              maxLength={6}
              autoFocus
            />
          </View>

          <TouchableOpacity
            style={styles.biometricButton}
            onPress={handleBiometricAuth}
          >
            <Fingerprint size={20} color="#666" />
            <Text style={styles.biometricText}>Use Biometric</Text>
          </TouchableOpacity>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleCancel}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.confirmButton]}
              onPress={handlePinSubmit}
              disabled={loading || pin.length < 4}
            >
              <Text style={styles.confirmButtonText}>
                {loading ? 'Verifying...' : 'Confirm'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    margin: 20,
    minWidth: 300,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff5f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  pinContainer: {
    marginBottom: 20,
  },
  pinLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  pinInput: {
    fontSize: 24,
    textAlign: 'center',
    paddingVertical: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#FF6600',
    letterSpacing: 4,
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginBottom: 20,
    gap: 8,
  },
  biometricText: {
    fontSize: 14,
    color: '#666',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
  },
  confirmButton: {
    backgroundColor: '#FF6600',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});