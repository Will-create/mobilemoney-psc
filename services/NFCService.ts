import { Platform } from 'react-native';
import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager';
import { NFCPayload } from '@/types';
import { CryptoService } from './CryptoService';
import pako from 'pako';
import { Buffer } from 'buffer';

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
      if (error) {
        console.warn('Failed to initialize NFC:', error);
      } else {
        console.warn('Failed to initialize NFC: Unknown error (error object was null).');
      }
      this.isSupported = false;
      return false;
    } finally {
      this.isInitialized = true;
    }
  }

  private createPayloadString(payload: NFCPayload): string {
    return [
      payload.version,
      payload.transactionId,
      payload.amount,
      payload.currency,
      payload.operator,
      payload.senderId,
      payload.receiverHint,
      payload.timestamp,
      payload.meta.note || '',
      payload.sig,
      payload.phone_number,
    ].join('|');
  }

  private parsePayload(data: string): NFCPayload | null {
    try {
      const parts = data.split('|');
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
      console.error('Failed to parse payload:', error);
      return null;
    }
  }

  async createPayload(
    amount: number,
    operator: string,
    senderId: string,
    receiverHint: string,
    keyId: string,
    phone_number: string,
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
      sig: '', // Will be filled by signing
      phone_number,
    };

    // Sign the payload
    const signature = await this.cryptoService.signPayload(keyId, payload);
    payload.sig = signature;

    return payload;
  }

  async sendPayload(payload: NFCPayload): Promise<boolean> {
    try {
      // Create NDEF message
      const payloadString = this.createPayloadString(payload);
      const compressed = pako.deflate(payloadString);
      const encoded = Buffer.from(compressed).toString('base64');

      const ndefRecord = Ndef.textRecord(encoded);
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
            const encoded = Ndef.text.decodePayload(ndefRecord.payload);
            const decoded = Buffer.from(encoded, 'base64');
            const decompressed = pako.inflate(decoded, { to: 'string' });
            const payload = this.parsePayload(decompressed);
            
            if (payload) {
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
            } else {
              onError(new Error('Failed to parse payload'));
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
      const payloadString = this.createPayloadString(payload);
      const compressed = pako.deflate(payloadString);
      const encoded = Buffer.from(compressed).toString('base64');

      const ndefRecord = Ndef.textRecord(encoded);
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