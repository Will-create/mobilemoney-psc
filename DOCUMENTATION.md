# SpecBook — Review & Revision for Gemini

This document outlines the review and revision of the Bolt React Native NFC Payments app.

## 1. Code Review Notes

The original codebase had a functional but flawed implementation. The key issues were:

*   **Complex USSD Generation:** The USSD generation was based on a step-by-step model, which was overly complex and difficult to maintain. The `USSDService` was responsible for building the USSD string from a series of steps, which was unnecessary.
*   **Flawed Transaction Flow:** The transaction flow was not correctly implemented. The sender would send the NFC payload and immediately save the transaction as "pending", without waiting for the receiver to accept. The receiver would save the transaction as "success" immediately upon receiving the payload, without knowing the final outcome of the USSD call.
*   **One-Way NFC Communication:** The `NFCService` only supported one-way communication from sender to receiver, which made it impossible to implement a proper confirmation step.
*   **Suboptimal UI/UX:** The UI was functional but could be improved for clarity and ease of use. The operator selection was not intuitive, and the main call-to-action button could be more prominent.

## 2. Refactored USSD Module

The USSD module has been completely refactored to use a single-string, template-based approach. This simplifies the implementation and makes it easier to add new operators.

*   **`data/operators.ts`:** This file now contains a `ussdTemplate` string for each operator, which includes placeholders for the recipient, amount, and PIN.
*   **`services/USSDService.ts`:** The `USSDService` has been simplified to a single `execute` method that takes the operator name, recipient, amount, and PIN as arguments. It retrieves the corresponding `ussdTemplate` and replaces the placeholders with the provided values.
*   **`types/index.ts`:** The `USSDPlan` and `USSDStep` interfaces have been removed, and the `OperatorConfig` interface has been updated to include the `ussdTemplate` string.

## 3. UI/UX Revisions

The UI has been revised to improve clarity, speed, and intuitiveness.

*   **Send Screen (`app/(tabs)/index.tsx`):**
    *   The "Send Money" button is now larger and more visually prominent.
    *   The operator selection has been changed from a horizontal scroll to a grid of buttons, making it easier to see and select the desired operator.
*   **History Screen (`app/(tabs)/history.tsx`):**
    *   The transaction history items are now displayed in a card-based layout, which improves the visual hierarchy and readability.

## 4. NFC Payload Spec

The NFC payload has been simplified to remove the `ussdPlanId`.

```json
{
  "version": "1.0",
  "transactionId": "<uuid>",
  "amount": <number>,
  "currency": "XOF",
  "operator": "<operator_name>",
  "senderId": "<sender_id>",
  "receiverHint": "<receiver_id>",
  "timestamp": <timestamp>,
  "meta": {
    "note": "<optional_note>"
  },
  "sig": "<signature>"
}
```

## 5. Operator USSD String Templates

*   **OrangeMoney:** `*144*1*{recipient}*{amount}*{PIN}#`
*   **MoveMoney:** `*123*2*{recipient}*{amount}*{PIN}#`
*   **TélésaleMoney:** `*222*3*{recipient}*{amount}*{PIN}#`

## 6. UX Guidelines

*   **Clarity:** All screens should be clear, concise, and easy to understand.
*   **Speed:** The app should be fast and responsive. Minimize the number of steps required to complete a transaction.
*   **Intuitiveness:** The UI should be intuitive and easy to use, even for first-time users.
*   **Consistency:** The visual design should be consistent throughout the app.
*   **Error Handling:** All error messages should be clear and provide actionable feedback.
