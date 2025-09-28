import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Shield, Info, Smartphone, Plus } from 'lucide-react-native';
import { StorageService } from '@/services/StorageService';
import { USSDService } from '@/services/USSDService';
import { SimInfo } from '@/types';

export default function SettingsScreen() {
  const [showPinModal, setShowPinModal] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [simInfo, setSimInfo] = useState<SimInfo[]>([]);
  const [phoneNumbers, setPhoneNumbers] = useState<{ [key: string]: string }>({});
  const [showAddPhoneModal, setShowAddPhoneModal] = useState(false);
  const [newPhoneNumber, setNewPhoneNumber] = useState('');
  const [selectedSim, setSelectedSim] = useState<SimInfo | null>(null);

  const storageService = StorageService.getInstance();
  const ussdService = USSDService.getInstance();

  useEffect(() => {
    const loadData = async () => {
      const profile = await storageService.getUserProfile();
      setPhoneNumbers(profile?.phoneNumbers || {});
      const sims = await ussdService.getSimInfo();
      setSimInfo(sims);
    };
    loadData();
  }, []);

  const handleSavePin = async () => {
    if (newPin.length !== 4) {
      Alert.alert('Invalid PIN', 'PIN must be 4 digits.');
      return;
    }
    if (newPin !== confirmPin) {
      Alert.alert('PINs do not match', 'Please make sure your PINs match.');
      return;
    }
    await storageService.savePin(newPin);
    setShowPinModal(false);
    Alert.alert('Success', 'Your PIN has been updated.');
  };

  const handleSavePhoneNumber = async () => {
    if (selectedSim) {
      const newPhoneNumbers = { ...phoneNumbers, [selectedSim.subscriptionId]: newPhoneNumber };
      setPhoneNumbers(newPhoneNumbers);
      const profile = await storageService.getUserProfile();
      await storageService.saveUserProfile({ ...profile, phoneNumbers: newPhoneNumbers });
      setShowAddPhoneModal(false);
      setNewPhoneNumber('');
      Alert.alert('Success', 'Phone number added.');
    }
  };

  const renderSetting = (icon: React.ReactNode, label: string, onPress?: () => void) => (
    <TouchableOpacity style={styles.row} onPress={onPress}>
      <View style={styles.icon}>{icon}</View>
      <Text style={styles.rowLabel}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Phone Numbers</Text>
        {simInfo.map((sim, index) => (
          <View style={styles.row} key={index}>
            <Smartphone size={20} color="#333" />
            <Text style={styles.rowLabel}>SIM {sim.slotIndex + 1}: {phoneNumbers[sim.subscriptionId] || 'Not set'}</Text>
          </View>
        ))}
        <TouchableOpacity
          style={styles.row}
          onPress={() => {
            if (simInfo.length > 0) {
              setSelectedSim(simInfo[0]);
              setShowAddPhoneModal(true);
            }
          }}
        >
          <Plus size={20} color="#FF6600" />
          <Text style={[styles.rowLabel, { color: '#FF6600' }]}>Add Number</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Security</Text>
        {renderSetting(<Shield size={24} color="#333" />, 'Change PIN', () => setShowPinModal(true))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>App Version: 1.0.0</Text>
        </View>
      </View>

      <Modal
        visible={showPinModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPinModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Change PIN</Text>
            <TextInput
              style={styles.input}
              placeholder="New PIN"
              keyboardType="numeric"
              maxLength={4}
              secureTextEntry
              value={newPin}
              onChangeText={setNewPin}
            />
            <TextInput
              style={styles.input}
              placeholder="Confirm PIN"
              keyboardType="numeric"
              maxLength={4}
              secureTextEntry
              value={confirmPin}
              onChangeText={setConfirmPin}
            />
            <TouchableOpacity style={styles.saveButton} onPress={handleSavePin}>
              <Text style={styles.saveButtonText}>Save PIN</Text>
            </TouchableOpacity>
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingTop: 30,
  },
  header: {
    padding: 15,
    alignItems: 'center',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111',
  },
  section: {
    marginBottom: 18,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: '#f8f9fa',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  icon: {
    marginRight: 20,
  },
  rowLabel: {
    fontSize: 14,
    color: '#333',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#FF6600',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
