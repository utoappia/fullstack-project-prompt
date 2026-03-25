## Products, Offerings, and Entitlements

### Entitlements, offerings, and packages hierarchy

```
Offering (e.g., "default")
  └── Package (e.g., "$rc_monthly", "$rc_annual")
      └── Product (e.g., "com.app.monthly_sub")
          └── mapped to → Entitlement (e.g., "pro")
```

- **Entitlement**: what the user can access (e.g., "pro"). Decouples access from specific products. Most apps need one.
- **Offering**: a grouping of packages to present on a paywall. One offering is "default" — returned by `getOfferings()`.
- **Package**: wraps a product within an offering. Pre-defined types: `$rc_monthly`, `$rc_annual`, `$rc_lifetime`, etc.
- **Product**: the actual purchasable item from App Store / Play Store / Stripe / Paddle.

Configure in the RevenueCat dashboard: create entitlements, create products (matching store), create offerings with packages, attach products to entitlements.

### Free trials and introductory offers

```typescript
// Check eligibility before showing trial UI
const eligibility = await Purchases.checkTrialOrIntroDiscountEligibility([productId]);
// Returns: 'eligible' | 'ineligible' | 'unknown'
```

- **iOS**: Trials are automatic at purchase. Check eligibility to show accurate UI.
- **Android**: Multiple offers per base plan. SDK auto-prioritizes longest free trial, then cheapest intro price. Tag offers with `rc-ignore-offer` in Play Console to exclude from auto-selection.
- **Amazon**: Only free trials supported (no intro pricing).

### Apple subscription offer types

| Type | Target | How applied | Setup |
|---|---|---|---|
| **Introductory** | New subscribers | Automatic at purchase | Configure in App Store Connect. Check eligibility via SDK. |
| **Promotional** | Existing/lapsed | Must be presented manually | Requires In-App Purchase Key. Create in ASC with pricing type. |
| **Offer Codes** | Anyone with code | Redeem via App Store | Create in ASC. Redirect to `apps.apple.com/redeem?ctx=offercodes&id={app_id}&code={code}` |
| **Win-Back** | Cancelled subscribers | Via App Store, StoreKit, or paywalls | iOS 18.0+ only. Configure eligibility rules in ASC. |

### Virtual currency (tokens, coins, credits)

RevenueCat manages digital currencies within your app. Purchases auto-grant configured currency amounts.

**Setup:** Dashboard → Virtual Currencies → "+ New". Define Code (API identifier, e.g., `GLD`), Name, and link to IAP products with grant amounts.

```typescript
// Read balances (React Native 9.1.0+)
const balances = await Purchases.virtualCurrencies();
// balances: { GLD: 500, SLV: 1200 }

// Use cached balances for immediate UI rendering
const cached = await Purchases.cachedVirtualCurrencies;

// Invalidate cache after server-side changes
await Purchases.invalidateVirtualCurrenciesCache();
```

**Server-side transactions** (deduct/deposit via REST API v2):
```bash
curl -X POST https://api.revenuecat.com/v2/projects/{PROJECT_ID}/customers/{CUSTOMER_ID}/virtual_currencies/transactions \
  -H 'Authorization: Bearer sk_xxx' \
  -H 'Idempotency-Key: uuid-here' \
  -d '{"adjustments": {"GLD": -20, "SLV": 10}}'
```

- Atomic: fails entirely if insufficient balance (HTTP 422).
- Supports currency conversion in one call (e.g., -50 GLD, +200 SLV).
- Use `Idempotency-Key` header to prevent duplicate transactions.
- Max 100 currencies per project, max 2 billion units per customer, no negative balances.
- Transactions must be initiated by your backend — never accept amounts from client.
- Triggers `VIRTUAL_CURRENCY_TRANSACTION` webhook event.

### Offering metadata (remote paywall config)

Attach custom JSON to Offerings for remote configuration — change paywall copy, images, or feature flags without app updates:

```typescript
const offerings = await Purchases.getOfferings();
const metadata = offerings.current?.metadata;
// metadata: { "hero_image": "https://...", "cta_text": "Start Free Trial", "show_discount": true }
```

- Max 4,000 characters per JSON object. Supports all JSON types.
- Min SDK: React Native 6.0.0+.
- Configure in dashboard: Product Catalog → Offerings → Edit → Metadata field.

### Apple Family Sharing

- Enable per-product in App Store Connect. **Cannot be disabled once enabled.**
- RevenueCat auto-tracks via `is_family_share` in customer history and webhooks. REST API uses `ownership_type`.
- Activation delay: up to 1 hour for new shares (renewals are instant).
- Min SDK: React Native 4.0.0+.

### Subscription management (price changes, refunds, cancellations)

- **Price changes (iOS)**: Apple notifies existing subscribers. RevenueCat auto-detects via V2 server notifications. No code changes needed.
- **Price changes (Android)**: Google requires opt-in for price increases. Configure in Google Play Console.
- **Google prepaid plans**: Non-auto-renewing subscriptions paid upfront. Must be explicitly handled — they don't auto-renew.
- **Managing subscriptions**: Direct users to the store's management page via `customerInfo.managementURL`.
- **Refunds**: Apple refunds auto-detected via server notifications. Google Play refunds via RC dashboard or REST API. Web Billing refunds via dashboard.

### Refund handling (Apple)

Configure in dashboard: Apps & providers → iOS → "Handling of refund requests":
- Do not handle (default)
- Always prefer granting refund
- Always prefer declining refund
- Submit consumption data and let Apple decide

Override per-customer via `$appleRefundHandlingPreference` subscriber attribute.
