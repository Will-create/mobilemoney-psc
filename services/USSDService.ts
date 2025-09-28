import Ussd, { ussdEventEmitter, SimInfo, DialOptions } from 'react-native-ussd';
import { PermissionsAndroid, Platform } from 'react-native';

export class USSDService {
  private static instance: USSDService;

  public static getInstance(): USSDService {
    if (!USSDService.instance) {
      USSDService.instance = new USSDService();
    }
    return USSDService.instance;
  }

  async getSimInfo(): Promise<SimInfo[]> {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
        {
          title: 'SIM Info Permission',
          message: 'This app needs access to your phone state to read SIM information.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        console.log('READ_PHONE_STATE permission denied');
        return [];
      }
    }

    try {
      const sims: SimInfo[] = await Ussd.getSimInfo();
      if (sims.length > 0) {
        console.log('Available SIMs:', sims);
      } else {
        console.log('No SIMs found or accessible.');
      }
      return sims;
    } catch (error) {
      console.error('Error getting SIM info:', error);
      return [];
    }
  }

  async dial(ussd: string, selectedSubscriptionId?: number) {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CALL_PHONE,
        {
          title: 'Call Permission',
          message: 'This app needs to make calls to run USSD codes.',
          buttonPositive: 'OK',
          buttonNegative: 'Cancel',
        },
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        console.log('CALL_PHONE permission denied');
        return;
      }
    }

    const options: DialOptions = {};
    if (selectedSubscriptionId !== undefined && Platform.OS === 'android') {
      options.subscriptionId = selectedSubscriptionId;
    }

    try {
      await Ussd.dial(ussd, options);
      console.log(`USSD dial initiated for ${ussd} with options:`, options);
    } catch (error) {
      console.error('Error dialing USSD:', error);
    }
  }

  addUssdEventListener(callback: (event: { ussdReply: string }) => void) {
    return ussdEventEmitter.addListener('ussdEvent', callback);
  }

  addUssdErrorEventListener(callback: (event: { error: string, failureCode?: number }) => void) {
    return ussdEventEmitter.addListener('ussdErrorEvent', callback);
  }
}
