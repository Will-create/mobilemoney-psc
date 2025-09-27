import { Platform } from 'react-native';
import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager';
import { NFCPayload } from '@/types';
import { CryptoService } from './CryptoService';

console.log('NFCService: NfcManager at top level:', NfcManager);
console.log('NFCService: Platform at top level:', Platform);

export class NFCService {
  private static instance: NFCService;
  private cryptoService = CryptoService.getInstance();
  private isInitialized = false;
  public isSupported = false;
  
  public static getInstance(): NFCService {
    if (!NFCService.instance) {
      NFCService.instance = new NFCService();
    }
    return NFCService.instance;
  }

  async initialize(): Promise<boolean> {
    console.log('NFCService: Platform.OS inside initialize:', Platform.OS);

    if (this.isInitialized) {
      return this.isSupported;
    }

    if (Platform.OS === 'web') {
      this.isInitialized = true;
      this.isSupported = false;
      return this.isSupported;
    }

    try {
      if (!NfcManager) {
        console.warn('NFC Manager is not available.');
        this.isSupported = false;
        return false;
      }
      
      this.isSupported = await NfcManager.isSupported();
      if (!this.isSupported) {
        console.warn('NFC not supported on this device');
        return false;
      }

      await NfcManager.start();
      return true;
    } catch (error) {
      console.error('Failed to initialize NFC:', error);
      this.isSupported = false;
      return false;
    } finally {
      this.isInitialized = true;
    }
  }

  async createPayload(
    amount: number,
    operator: string,
    senderId: string,
    receiverHint: string,
    keyId: string,
    note?: string
  ): Promise<NFCPayload> {
    const payload = {
      version: '1.0',
      transactionId: this.generateUUID(),
      amount,
      currency: 'XOF',
      operator,
      senderId,
      receiverHint,
      timestamp: Date.now(),
      meta: {
        note: note || ''
      },
      sig: '' // Will be filled by signing
    };

    // Sign the payload
    const signature = await this.cryptoService.signPayload(keyId, payload);
    payload.sig = signature;

    return payload;
  }

  async sendPayload(payload: NFCPayload): Promise<boolean> {
    try {
      // Create NDEF message
      const jsonString = JSON.stringify(payload);
      const ndefRecord = Ndef.textRecord(jsonString);
      const ndefMessage = [ndefRecord];

      // Start NFC writing session
      await NfcManager.requestTechnology(NfcTech.Ndef);
      await NfcManager.writeNdefMessage(ndefMessage);
      
      return true;
    } catch (error) {
      console.error('Failed to send NFC payload:', error);
      return false;
    } finally {
      await NfcManager.cancelTechnologyRequest();
    }
  }

  listenForPayload(
    onPayloadReceived: (payload: NFCPayload) => void,
    onError: (error: Error) => void
  ): () => void {
    const tagDiscoverListener = NfcManager.setEventListener(NfcEvents.DiscoverTag, async (tag) => {
      try {
        if (tag.ndefMessage) {
          const ndefRecord = tag.ndefMessage[0];
          if (ndefRecord?.payload) {
            const jsonString = Ndef.text.decodePayload(ndefRecord.payload);
            const payload = JSON.parse(jsonString) as NFCPayload;
            
            // Verify signature
            const isValid = await this.cryptoService.verifySignature(
              payload,
              payload.sig,
              payload.senderId
            );
            
            if (isValid) {
              onPayloadReceived(payload);
            } else {
              onError(new Error('Invalid payload signature'));
            }
          }
        }
      } catch (error) {
        onError(error as Error);
      }
    });

    NfcManager.registerTagEvent();

    return () => {
      tagDiscoverListener.remove();
      NfcManager.unregisterTagEvent();
    };
  }

  async stopListening(): Promise<void> {
    // This method is no longer needed as listenForPayload returns a cleanup function
    // Keeping it for now to avoid breaking existing calls, but it will be empty.
  }

  async startHCEService(payload: NFCPayload): Promise<boolean> {
    try {
      const jsonString = JSON.stringify(payload);
      const ndefRecord = Ndef.textRecord(jsonString);
      const ndefMessage = [ndefRecord];
      const bytes = Ndef.encodeMessage(ndefMessage);

      await NfcManager.setNdefPushMessage(bytes);
      return true;
    } catch (error) {
      console.error('Failed to start HCE service:', error);
      return false;
    }
  }

  async stopHCEService(): Promise<void> {
    try {
      await NfcManager.setNdefPushMessage(null);
    } catch (error) {
      console.error('Failed to stop HCE service:', error);
    }
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}