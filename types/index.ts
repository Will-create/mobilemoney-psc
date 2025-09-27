export interface UserProfile {
  userId: string;
  displayName: string;
  phoneNumber?: string;
  operatorPreferences: {
    defaultOperator: string;
  };
}

export interface WalletSettings {
  defaultOperator: 'OrangeMoney' | 'MoveMoney' | 'TelesaleMoney';
  pinHash: string;
  biometricEnabled: boolean;
  encryptionKeyId: string;
}

export interface TransactionRecord {
  transactionId: string;
  direction: 'sent' | 'received';
  amount: number;
  currency: string;
  operator: string;
  counterpartyId: string;
  timestamp: number;
  status: 'pending' | 'success' | 'failed' | 'cancelled';
  signedProof: string;
  rawLogs: string;
}

export interface NFCPayload {
  version: string;
  transactionId: string;
  amount: number;
  currency: string;
  operator: string;
  senderId: string;
  receiverHint: string;
  timestamp: number;
  meta: {
    note?: string;
  };
  sig: string;
}

export interface OperatorConfig {
  id: string;
  name: string;
  displayName: string;
  color: string;
  ussdTemplate: string;
}