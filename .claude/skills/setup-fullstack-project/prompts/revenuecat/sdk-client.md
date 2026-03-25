## RevenueCat SDK & Client Integration

- RevenueCat handles receipt validation, subscription management, and cross-platform entitlements. The React Native SDK (`react-native-purchases`) talks to RevenueCat's servers — you never validate receipts yourself.
- Think in **entitlements** (what the user can access), not products (what the user bought). A "pro" entitlement can be unlocked by monthly, annual, or lifetime purchases.
- Always fetch offerings from RevenueCat rather than hardcoding product IDs. This lets you change pricing and products without app updates.

### Installation

```bash
# Bare React Native
npm install react-native-purchases
cd ios && pod install

# Expo
npx expo install react-native-purchases
```

For Expo, add the config plugin in `app.json`:
```json
{
  "plugins": ["react-native-purchases"]
}
```

### SDK initialization

Call `configure()` once during app startup, before any purchase-related code:

```typescript
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import { Platform } from 'react-native';

async function initPurchases() {
  if (__DEV__) {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  }

  await Purchases.configure({
    apiKey: Platform.OS === 'ios' ? 'appl_your_apple_key' : 'goog_your_google_key',
  });
}
```

- Use platform-specific **public** API keys (`appl_` for iOS, `goog_` for Android). These are safe to ship in client code.
- Never call `configure()` more than once.
- Store API keys in environment variables or a config file, not inline.
- All SDK logs are prefixed with `[Purchases]` — filter console output with this string.
- For iOS debugging in Xcode, ensure `OS_ACTIVITY_MODE` is unchecked in your scheme settings or logs won't display.

### API keys

| Key type | Prefix | Use | Access |
|---|---|---|---|
| Public (Apple) | `appl_` | Client SDK (iOS) | Read-only subscriber data |
| Public (Google) | `goog_` | Client SDK (Android) | Read-only subscriber data |
| Secret | `sk_` | Server-side REST API only | Full read/write. Never ship in client code. |

RevenueCat auto-detects sandbox vs production from the receipt — no separate keys needed.

### User identity

```typescript
// Anonymous by default — RevenueCat assigns $RCAnonymousID
// When user logs into your app, identify them:
const { customerInfo } = await Purchases.logIn('your_app_user_id');

// On logout, create a new anonymous user:
await Purchases.logOut();
```

Call `logIn()` when your user authenticates. RevenueCat merges the anonymous purchase history into the identified user automatically.

**User ID constraints:**
- Max 100 characters, case-sensitive, must be unique per user.
- Use UUID v4 or your database user ID. Never use email addresses (guessable, GDPR risk) or IDFA (rotates).
- Blocked values: `'no_user'`, `'null'`, `'none'`, `'nil'`, `'anonymous'`, `'guest'`, `'-1'`, `'0'`, empty string, anything containing `/`.

### Fetching offerings (paywall data)

```typescript
import Purchases, { PurchasesOfferings, PurchasesPackage } from 'react-native-purchases';

const offerings: PurchasesOfferings = await Purchases.getOfferings();

if (offerings.current) {
  const monthly: PurchasesPackage | null = offerings.current.monthly;
  const annual: PurchasesPackage | null = offerings.current.annual;

  offerings.current.availablePackages.forEach((pkg) => {
    console.log(pkg.product.priceString);        // "$9.99"
    console.log(pkg.product.title);               // "Monthly Pro"
    console.log(pkg.product.subscriptionPeriod);  // "P1M"
    if (pkg.product.introPrice) {
      console.log(pkg.product.introPrice.priceString); // "$0.99" (trial/intro)
    }
  });
}
```

### Making a purchase

```typescript
import Purchases, { PURCHASES_ERROR_CODE, PurchasesError } from 'react-native-purchases';

async function purchase(pkg: PurchasesPackage): Promise<boolean> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return !!customerInfo.entitlements.active['pro'];
  } catch (e) {
    const error = e as PurchasesError;
    if (error.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
      return false; // User cancelled — not an error
    }
    throw error;
  }
}
```

Always handle `PURCHASE_CANCELLED_ERROR` separately — it's not an error, it means the user dismissed the purchase dialog.

### Checking entitlements

```typescript
// One-time check
const customerInfo = await Purchases.getCustomerInfo();
const isPro = !!customerInfo.entitlements.active['pro'];

// Real-time listener (subscription changes, renewals, expiry)
const unsubscribe = Purchases.addCustomerInfoUpdateListener((info) => {
  const isPro = !!info.entitlements.active['pro'];
  // Update app state
});

// Clean up on unmount
unsubscribe();
```

Never cache entitlement status yourself. Always use `getCustomerInfo()` or the listener — RevenueCat handles caching internally.

### Subscription context provider pattern

```typescript
import React, { createContext, useContext, useEffect, useState } from 'react';
import Purchases, { CustomerInfo, LOG_LEVEL } from 'react-native-purchases';
import { Platform } from 'react-native';

interface SubscriptionState {
  customerInfo: CustomerInfo | null;
  isPro: boolean;
  loading: boolean;
}

const SubscriptionContext = createContext<SubscriptionState>({
  customerInfo: null,
  isPro: false,
  loading: true,
});

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG);
      await Purchases.configure({
        apiKey: Platform.OS === 'ios' ? 'appl_xxx' : 'goog_xxx',
      });
      const info = await Purchases.getCustomerInfo();
      setCustomerInfo(info);
      setLoading(false);
    }
    init();

    const listener = Purchases.addCustomerInfoUpdateListener(setCustomerInfo);
    return () => listener();
  }, []);

  return (
    <SubscriptionContext.Provider value={{
      customerInfo,
      isPro: !!customerInfo?.entitlements.active['pro'],
      loading,
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export const useSubscription = () => useContext(SubscriptionContext);
```

### Restoring purchases

```typescript
// Call when user taps "Restore Purchases" button
const customerInfo = await Purchases.restorePurchases();
const isPro = !!customerInfo.entitlements.active['pro'];
```

Apple requires a "Restore Purchases" button in your app. Place it on the paywall or settings screen.

**`restorePurchases` vs `syncPurchases`:**
- `restorePurchases`: user-triggered only (may show OS sign-in dialog). Use for the "Restore Purchases" button.
- `syncPurchases`: programmatic, no OS prompt. Use for subscription migration scenarios.
- Never call `restorePurchases` programmatically — only from explicit user action.
- Consumables and non-renewing subscriptions require custom App User IDs to restore (they don't persist on store receipts).

### Subscriber attributes

```typescript
await Purchases.setAttributes({
  '$email': 'user@example.com',
  '$displayName': 'Jane Doe',
  'plan_tier': 'premium',
  'referral_source': 'friend',
});

// Reserved keys (prefixed with $): $email, $displayName, $phoneNumber,
// $fcmTokens, $apnsTokens, $mediaSource, $campaign, $adGroup
```

### Trusted Entitlements (anti-tampering)

Cryptographic signature verification protects against man-in-the-middle attacks:

```typescript
const customerInfo = await Purchases.getCustomerInfo();
const verification = customerInfo.entitlements.verification;
// 'verified' | 'verifiedOnDevice' | 'failed' | 'notRequested'

if (verification === 'failed') {
  // Entitlement data may have been tampered with
}
```

Default in iOS SDK v5.15.0+ and Android SDK v8.11.0+. Your app must check the `verification` field.

### Error codes

| Code | Platform | Meaning |
|---|---|---|
| `PURCHASE_CANCELLED` | iOS/Android | User dismissed purchase dialog (not an error) |
| `STORE_PROBLEM` | All | Store server issue — may retry |
| `NETWORK_ERROR` | All | No connection — retry after connectivity |
| `PRODUCT_ALREADY_PURCHASED` | iOS | Subscription already active |
| `ITEM_ALREADY_OWNED` | Android | Subscription already active |
| `PURCHASE_NOT_ALLOWED` | iOS/Android | Device/account restricted from purchases |
| `PAYMENT_PENDING` | iOS/Android | Requires SCA, parental approval, or deferred payment |
| `RECEIPT_ALREADY_IN_USE` | RC | Receipt belongs to a different subscriber |
| `INVALID_APPLE_SUBSCRIPTION_KEY` | iOS | Missing/invalid .p8 In-App Purchase Key |
| `MISSING_RECEIPT_FILE` | iOS | No receipt on device (common in sandbox) |
| `INVALID_CREDENTIALS` | All | Misconfigured API keys |
| `SIGNATURE_VERIFICATION_FAILED` | All | Possible tampering or proxy detected |

Only `NETWORK_ERROR`, `PURCHASE_CANCELLED`, and `STORE_PROBLEM` are potentially retryable. Assume users were NOT charged unless `STORE_PROBLEM` occurs.
