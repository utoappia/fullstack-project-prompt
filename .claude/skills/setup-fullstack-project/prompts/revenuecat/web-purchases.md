## Web Purchases with RevenueCat

- RevenueCat Web enables subscription and one-time purchase management on the web, with entitlements shared across mobile and web.
- Three billing engine options: **RevenueCat Web Billing** (recommended, uses Stripe), **Stripe Billing** (sync existing Stripe subs), **Paddle Billing** (sync Paddle subs).
- Web purchases bypass App Store/Play Store commission (2.9% + $0.30 Stripe fees vs 15-30% store commission).

### Billing engine comparison

| Engine | Payment processor | Integration | Best for |
|---|---|---|---|
| **RevenueCat Web Billing** | Stripe | Web SDK or Web Purchase Links | New web purchases, full lifecycle management |
| **Stripe Billing** | Stripe | Stripe Checkout/Payment Links | Existing Stripe subscriptions |
| **Paddle Billing** | Paddle | Paddle checkout + Web Purchase Links | Merchant-of-record needs (Paddle handles tax/compliance) |

### Web SDK setup (RevenueCat Web Billing)

```bash
npm install @revenuecat/purchases-js
```

```typescript
import Purchases from '@revenuecat/purchases-js';

// Initialize — use the same appUserId as mobile for cross-platform entitlements
const purchases = Purchases.configure({
  apiKey: 'rcb_your_web_billing_key',  // Web Billing public key
  appUserId: 'user_123',
});

// Fetch offerings (same offerings as mobile)
const offerings = await purchases.getOfferings();

// Present managed paywall (renders in a DOM element)
const result = await purchases.presentPaywall({
  htmlTarget: document.getElementById('paywall-container'),
  offering: offerings.current,
});

// Or purchase a specific package directly
const { customerInfo } = await purchases.purchase({
  rcPackage: offerings.current.monthly,
  metadata: { utm_source: 'email_campaign' },  // custom metadata attached to purchase
});

// Check entitlements (same as mobile)
const customerInfo = await purchases.getCustomerInfo();
const isPro = !!customerInfo.entitlements.active['pro'];
```

### Web Purchase Links (no-code)

Hosted purchase pages — no SDK needed. Suitable for emails, social media, landing pages.

**URL format:** `https://pay.rev.cat/<ProductionToken>/<AppUserId>`
- Omit `AppUserId` for anonymous purchases (use Redemption Links to claim in-app)

**URL parameters:**
- `email` — pre-fill customer email
- `currency` — set display currency
- `package_id` — skip package selection, go straight to checkout
- `skip_purchase_success=true` — skip success page, redirect immediately

**Setup:** Dashboard → Web Purchase Links → Create → select Offering → optionally assign custom paywall → set success redirect URL.

**Never share sandbox URL with customers** — it allows Stripe test cards.

### Redemption Links (web-to-app purchase transfer)

One-time-use deep links that connect a web purchase to a mobile app user. Generated after web checkout completes.

**Flow:**
1. User buys on web (anonymous or identified)
2. Success page/email contains a redemption link
3. User taps link → app opens via custom URL scheme
4. SDK associates the web purchase with the app user
5. Entitlements are granted

**URL format:** `<YOUR_CUSTOM_SCHEME>://redeem_web_purchase?redemption_token=<TOKEN>`

**Setup:**
1. Register custom URL scheme in your app:
   - **iOS:** Xcode → Info → URL Types
   - **Android:** Intent filter in `AndroidManifest.xml` with `android:scheme="<YOUR_CUSTOM_SCHEME>"`

2. Handle redemption in React Native:
```typescript
import Purchases from 'react-native-purchases';

// Parse the incoming deep link URL
const redemption = Purchases.parseAsWebPurchaseRedemption(url);
if (redemption) {
  const result = await Purchases.redeemWebPurchase(redemption);
  // result: 'success' | 'invalidToken' | 'expired' | 'purchaseBelongsToOtherUser' | 'error'
}
```

- Links expire after **60 minutes**. If expired, a new link is auto-sent.
- Min SDK: react-native-purchases 8.5.0+.
- Enable in Dashboard: Web Billing app settings → Redemption Links → start with sandbox.

### Customer portal

Self-service portal for web billing customers. Accessible via links in lifecycle emails — no code needed.

Customers can:
- View upcoming charges and transaction history
- Cancel or reactivate subscriptions
- Switch plans (upgrade/downgrade, if enabled)
- Update payment methods
- Download PDF receipts and invoices

Authentication is email-based (access links, no passwords).

### Lifecycle emails

16 automatic email types sent to web billing customers, including:
- Free trial start / expiry warning
- Purchase confirmation / renewal notices
- Failed payment alerts / billing retry notifications
- Cancellation / expiration confirmations
- Subscription change confirmations
- Chargeback / refund notifications

**California compliance emails** (optional, effective July 1, 2025):
- Yearly renewal reminders
- Trial expiry alerts (trials > 1 month)
- Intro offer expiry notifications (periods > 1 month)

Branding: emails use your app name and support email. Colors from the Appearance editor.

### Subscription lifecycle (web billing)

| State | Trigger | Events |
|---|---|---|
| **Active** | Initial payment confirmed | `INITIAL_PURCHASE` |
| **Renewing** | Charged ≤1 hour before period end | `RENEWAL` |
| **Billing issue** | Payment fails | `BILLING_ISSUE` + `CANCELLATION` |
| **Grace period** | Retrying payment (up to 30 days) | Access continues if grace period configured |
| **Upgraded** | Customer switches to higher plan | `PRODUCT_CHANGE` (immediate, prorated refund) |
| **Downgraded** | Customer switches to lower plan | `PRODUCT_CHANGE` (takes effect at period end) |
| **Cancelled** | Customer cancels | `CANCELLATION` (access continues through period) |
| **Reactivated** | Customer re-enables before expiry | `UNCANCELLATION` |
| **Expired** | Period ends after cancel/failed billing | `EXPIRATION` |

### Web Billing product setup

Products created in RevenueCat dashboard (not in a separate store):

- **Product types:** Auto-renewing subscription, consumable, non-consumable
- **Pricing:** Set per currency. Base price not editable after save — can only add new currencies.
- **Trials:** Free trial period (accelerated in sandbox: all become 5 minutes)
- **Intro offers:** Discounted period after trial (scheduled after trial when both enabled)
- **Grace period:** Access retention during billing retry
- **Subscription changes:** Define upgrade/downgrade paths. Upgrades are immediate with prorated refund; downgrades take effect at cycle end.

### Refunding web payments

Dashboard → Customer profile → Entitlements → "..." menu → Refund.
- Customer immediately loses entitlement access.
- Fund return takes a few days depending on payment method.
- Cannot refund subscriptions with failed payment collection (no payment to refund).

### Stripe Billing integration (existing Stripe subscriptions)

For apps already using Stripe directly:

```bash
# Send Stripe subscription to RevenueCat
curl -X POST https://api.revenuecat.com/v1/receipts \
  -H 'Content-Type: application/json' \
  -H 'X-Platform: stripe' \
  -H 'Authorization: Bearer sk_your_secret_key' \
  -d '{"app_user_id": "user_123", "fetch_token": "sub_xxx"}'
```

- Or enable automated tracking via Stripe webhooks + "Track new purchases from server-to-server notifications"
- Product identifiers must exactly match Stripe product IDs
- Supported: flat-rate/package pricing, one-time purchases via Checkout
- Not supported: tiered, usage-based, customer-determined pricing
- Cancellation detection may take up to 2 hours
- Use Stripe's customer portal (not RevenueCat's) for Stripe Billing subscription management

### Paddle Billing integration

For apps using Paddle as merchant of record:

1. Register `pay.rev.cat` domain in Paddle Checkout settings
2. Generate Paddle API key with required permissions
3. Connect Paddle in RevenueCat dashboard
4. Import Paddle prices as RevenueCat products
5. Create Web Purchase Links with Paddle config

- A Price in Paddle = a Product in RevenueCat
- Single-product purchases only per transaction
- Test in Paddle sandbox environment

### Web sandbox testing

| Production duration | Sandbox equivalent |
|---|---|
| 1-2 weeks | 5 minutes |
| 1-3 months | 5-15 minutes |
| 6 months | 30 minutes |
| 1 year | 60 minutes |

- Trial durations: 5 minutes in sandbox
- Grace periods: 3 minutes
- Billing retries: every 3 minutes (up to 5 attempts)
- Max 6 renewals before auto-cancel
- Use Stripe test cards for checkout testing
- Apple Pay/Google Pay testable with real cards (no actual charges in sandbox)

### Custom metadata on web purchases

Attach key-value pairs to purchases. Propagated to webhook events and Stripe customer objects.

```typescript
const { customerInfo } = await purchases.purchase({
  rcPackage: pkg,
  metadata: {
    referral_code: 'FRIEND20',
    campaign_id: 'summer_2024',
  },
});
```

UTM parameters (`utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`) are auto-captured from the URL.

### Customization (appearance)

Dashboard Appearance Editor controls: theme presets, primary button color, accent color, error color, page backgrounds, card shapes, button shapes, form element shapes.

Applies to: Web checkout, Web Purchase Links, lifecycle emails. Does NOT apply to paywalls (separate editor).

### Key rules

- Use the same `appUserId` across web and mobile for cross-platform entitlements.
- RevenueCat Web Billing is the recommended engine for new web purchases.
- In-app purchases must remain available alongside web payments (Apple requirement).
- Never share sandbox Web Purchase Links with customers.
- Set up Redemption Links to connect anonymous web purchases to mobile app users.
- Web purchases bypass store commission — useful for win-back campaigns and paid acquisition.
- Test thoroughly in sandbox before going live — there's no app review gate for web billing.
