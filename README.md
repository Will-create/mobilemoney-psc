# NFC Contactless Payment App

A React Native mobile application that enables contactless mobile money transfers between smartphones using NFC technology. Optimized for OrangeMoney, MoveMoney, and TélésaleMoney with extensible USSD plan architecture.

## Features

- **NFC Peer-to-Peer**: Transfer payment requests between devices via NFC
- **Multi-Operator Support**: Pre-configured for OrangeMoney, MoveMoney, TélésaleMoney
- **USSD Plan Composer**: Extensible framework for adding new operators
- **Secure Authentication**: PIN and biometric authentication with device-backed keys
- **Encrypted Storage**: Local transaction history with AES-256-GCM encryption
- **Cross-Platform**: Android (full NFC support) and iOS (limited NFC, QR fallback)

## Architecture

### Core Services

- **NFCService**: Handles NFC peer-to-peer communication and NDEF payload creation/verification
- **USSDService**: Executes operator-specific USSD sequences for payment completion
- **CryptoService**: Manages device-backed keypairs, payload signing, and PIN hashing
- **StorageService**: Encrypted local database for transactions, settings, and USSD plans

### Security Model

- Device-backed asymmetric keypairs for transaction signing
- PIN hashing with Argon2 (production) or PBKDF2 fallback
- NDEF payload signature verification to prevent tampering
- Anti-replay protection with timestamp + UUID + nonce
- AES-256-GCM encryption for data at rest

## Getting Started

### Prerequisites

- Node.js 18+
- React Native development environment
- Android Studio (for Android)
- Xcode (for iOS)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Install iOS dependencies:
```bash
cd ios && pod install && cd ..
```

3. Start the development server:
```bash
npm run dev
```

### Platform Setup

#### Android
- Ensure NFC permissions are granted
- USSD execution requires CALL_PHONE permission
- Uses TelephonyManager.sendUssdRequest() on API 26+

#### iOS
- Limited NFC support (tag reading/writing only)
- Cannot execute USSD programmatically
- Presents composed USSD string for manual dialing

## Usage

### Initial Setup

1. Complete profile setup (name, phone number)
2. Create wallet PIN (4+ digits)
3. Enable biometric authentication (optional)

### Sending Money

1. Enter amount and select operator
2. Tap "Send Money"
3. Approach receiver's device (NFC active)
4. Wait for receiver acceptance
5. Authenticate with PIN/biometric
6. USSD execution completes transfer

### Receiving Money

1. Tap "Start Listening" 
2. Accept/decline incoming transaction
3. Sender authenticates and completes transfer

## USSD Plan Structure

Each operator has a configurable USSD plan with step-by-step execution:

```typescript
{
  "planId": "orange-send-v1",
  "operator": "OrangeMoney", 
  "steps": [
    { "type": "DIAL", "value": "*144#" },
    { "type": "MENU_SELECT", "value": "1" },
    { "type": "INPUT", "value": "{RECIPIENT}" },
    { "type": "INPUT", "value": "{AMOUNT}" },
    { "type": "MENU_SELECT", "value": "1" },
    { "type": "INPUT", "value": "{PIN}" }
  ]
}
```

### Step Types

- `DIAL`: Initial USSD code
- `INPUT`: Variable input (amount, recipient, PIN)
- `MENU_SELECT`: Menu option selection
- `WAIT`: Pause between steps
- `CONFIRM`: Final confirmation

### Variable Placeholders

- `{RECIPIENT}`: Receiver phone number
- `{AMOUNT}`: Transaction amount
- `{PIN}`: User PIN for operator
- `{RECIPIENT_OR_ACCOUNT}`: Flexible recipient field

## Adding New Operators

1. Create USSD plan configuration:
```typescript
const newOperator = {
  id: 'newop',
  name: 'NewOperator',
  displayName: 'New Operator Money',
  color: '#123456',
  ussdPlan: {
    planId: 'newop-send-v1',
    operator: 'NewOperator',
    description: 'New Operator transfer',
    steps: [/* define steps */],
    isActive: true,
    createdBy: 'system'
  }
};
```

2. Add to `data/operators.ts`
3. Test USSD sequence with operator
4. Deploy updated app

## Limitations

- **Client-only**: Cannot guarantee settlement without operator confirmation
- **iOS NFC**: Limited P2P support, requires QR fallback for cross-platform
- **USSD fragility**: Operator menu changes can break automation
- **Network dependency**: USSD requires cellular network connectivity

## Security Considerations

- Never log PINs or sensitive USSD sessions
- Verify all NDEF payload signatures
- Implement proper key rotation for production
- Add rate limiting for failed authentication attempts
- Regular security audits of cryptographic implementations

## Testing

Run the test suite:
```bash
npm test
```

Test NFC functionality on physical devices only (not simulators).

## Production Deployment

1. Generate production signing keys
2. Configure proper Argon2 PIN hashing
3. Enable SQLCipher for database encryption  
4. Implement proper error reporting
5. Add operator-specific testing with sandbox codes

## License

Copyright (c) 2025. All rights reserved.