## Paywalls, Targeting, and Experiments

### RevenueCat Paywalls (remote paywall UI)

RevenueCat offers a built-in paywall component that's remotely configurable — change copy, layout, and pricing without app updates.

```typescript
import RevenueCatUI from 'react-native-purchases-ui';

// Show paywall conditionally (only if user doesn't have entitlement)
await RevenueCatUI.presentPaywallIfNeeded({ requiredEntitlementIdentifier: 'pro' });

// Or show unconditionally
await RevenueCatUI.presentPaywall();

// Or embed as a component
<RevenueCatUI.Paywall onDismiss={() => {}} />
```

- Minimum SDK: React Native 8.11.3+, iOS 15.0+, Android 7.0+ (API 24+).
- Configure paywall templates in the RevenueCat dashboard (one paywall per offering).
- 17+ components: Text, Image, Video, Icon, Stack, Footer, Package, Carousel, Tabs, Timeline, Switch, Purchase Button, Button, Express Checkout, Social Proof, Feature Lists, Countdown.
- **Exit Offers**: present alternative pricing when users dismiss without purchasing. Requires separate Offering. SDK: React Native 9.6.15+.
- For custom paywalls, use `getOfferings()` and build your own UI.

**Paywall callbacks:**
- `onPurchaseStarted`, `onPurchaseCompleted`, `onPurchaseError`, `onPurchaseCancelled`
- `onRestoreStarted`, `onRestoreCompleted`, `onRestoreError`
- `onDismiss`

### Targeting (Pro/Enterprise)

Serve different offerings to different users based on rules. Rules evaluated top-to-bottom, first match wins. Default Offering served when no rules match.

**Available conditions** (AND logic within a rule):
- Custom attributes (key-value pairs)
- Country (storefront or geolocation)
- App (specific app identifier)
- App Version (semantic versioning comparison)
- RevenueCat SDK Version
- Platform (iOS, Android, watchOS, etc.)

**Rule states:** Live, Scheduled (UTC start/end times for promotions), Inactive.

**Testing:** Create rules targeting unreleased app versions (e.g., TestFlight) to verify before production.

### Placements

Show different offerings at different locations in your app. Each placement independently serves an offering per targeting rule.

```typescript
// Fetch placement-specific offering (React Native 7.23.0+)
const offering = await Purchases.getCurrentOfferingForPlacement('onboarding_paywall');
// Returns: matched offering for this placement, or "all other cases" offering, or Default Offering
```

**Resolution priority:**
1. Matched targeting rule with this placement → configured offering
2. Matched targeting rule without this placement → "all other cases" offering
3. No matching rule → project Default Offering

Older app versions using `getOfferings()` receive the "all other cases" offering automatically (backward compatible).

### Custom attributes for targeting

Set attributes via SDK, then use them in targeting rules:

```typescript
await Purchases.setAttributes({ user_tier: 'premium', onboarding_complete: 'true' });

// Sync immediately for same-session targeting (rate limit: 5 calls/minute)
await Purchases.syncAttributesAndOfferingsIfNeeded();
```

Call `syncAttributesAndOfferingsIfNeeded()` after setting all attributes — especially useful after multi-step onboarding.

### Experiments (Pro/Enterprise)

A/B test 2-4 variants (1 control + up to 3 treatments) per paywall location. Test pricing, product mix, trial length, or paywall design.

**Configuration:**
- Traffic allocation: minimum 10%, split evenly across variants.
- Customers enrolled on first paywall view. No app code changes needed if you display the `current` offering dynamically.
- Audience filters: country, app, app version, SDK version, platform.
- Multiple simultaneous tests allowed on mutually exclusive or identical audiences.

**Experiment presets:** Introductory offer, Free trial, Paywall design, Price point, Subscription duration, Subscription ordering.

**Lifecycle:** Start → Pause (halts new enrollment, keeps existing) → Stop (permanent, reverts to Default Offering). Cannot restart stopped experiments.

**Results metrics:** Initial conversion, trial conversion, Realized LTV, MRR. Data refreshes for **400 days** post-experiment.

**Suggested threshold:** 95% "Chance to Win" before declaring a winner.

**Rollout options after winner:** Set as default offering, create targeting rule, or mark winner without rollout.

### Customer Center (self-service subscription management)

Built-in UI for customers to manage subscriptions independently (Pro/Enterprise). Reduces support tickets and churn.

Customers can: cancel subscriptions, restore purchases, request refunds (iOS), modify plans (iOS), view virtual currency balances, access external websites/deeplinks.

Configure in dashboard: exit feedback prompts (capture cancellation reasons), automatic retention offers (present discounts before cancellation), app version requirements before support contact.

Supported: iOS (full features including refund requests + plan changes) and Android (standard features).

### Web Funnels (Pro/Enterprise)

Multi-step hosted web experiences combining onboarding flows with checkout. No code needed.

- Custom onboarding with survey questions and branching logic
- Web purchases via Stripe or Paddle checkout
- Event tracking (Amplitude, Mixpanel, Meta Ads)
- UTM parameter auto-capture
- Instant deployment; remote configuration
