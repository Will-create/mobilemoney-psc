import { OperatorConfig } from '@/types';

export const OPERATORS: OperatorConfig[] = [
  {
    id: 'orange',
    name: 'OrangeMoney',
    displayName: 'Orange Money',
    color: '#FF6600',
    ussdTemplate: '*144*1*{recipient}*{amount}*{PIN}#',
  },
  {
    id: 'move',
    name: 'MoveMoney',
    displayName: 'Move Money',
    color: '#00B4D8',
    ussdTemplate: '*123*2*{recipient}*{amount}*{PIN}#',
  },
  {
    id: 'telesale',
    name: 'TelesaleMoney',
    displayName: 'Télésale Money',
    color: '#E63946',
    ussdTemplate: '*222*3*{recipient}*{amount}*{PIN}#',
  },
];