import { Platform } from 'react-native';
import Ussd from 'react-native-ussd';
import { OPERATORS } from '@/data/operators';

export class USSDService {
  private static instance: USSDService;

  public static getInstance(): USSDService {
    if (!USSDService.instance) {
      USSDService.instance = new USSDService();
    }
    return USSDService.instance;
  }

  async execute(operatorName: string, recipient: string, amount: string, pin: string, subscriptionId?: number): Promise<{ success: boolean; message: string }> {
    const operator = OPERATORS.find(op => op.name === operatorName);

    if (!operator) {
      return { success: false, message: 'Operator not found' };
    }

    const ussdString = operator.ussdTemplate
      .replace('{recipient}', recipient)
      .replace('{amount}', amount)
      .replace('{PIN}', pin);

    try {
      if (Platform.OS === 'android') {
        await Ussd.dial(ussdString, { subscriptionId });
        return { success: true, message: 'USSD session initiated' };
      } else {
        // iOS still uses the old method
        await Ussd.dial(ussdString);
        return { success: true, message: 'Please dial manually from the call screen.' };
      }
    } catch (error) {
      console.error('USSD execution failed:', error);
      return { success: false, message: (error as Error).message };
    }
  }

  async getSimInfo() {
    if (Platform.OS === 'android') {
      return await Ussd.getSimInfo();
    }
    return [];
  }
}
