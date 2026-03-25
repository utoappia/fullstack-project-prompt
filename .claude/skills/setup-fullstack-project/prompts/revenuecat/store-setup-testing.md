## Store Setup, Testing, and Launch

### Store setup (App Store Connect)

**In-App Purchase Key (required for StoreKit 2, SDK v5.0+):**
1. App Store Connect → Users and Access → Integrations → In-App Purchase → Generate key
2. Download the `.p8` file immediately (can only be downloaded once)
3. Upload to RevenueCat dashboard under Apps & providers → iOS app
4. Enter the Issuer ID and Key ID from App Store Connect

### Store setup (Google Play Console)

**Service Credentials (4-step process):**
1. Enable APIs in Google Cloud Console: Google Play Android Developer API, Google Play Developer Reporting API, Google Cloud Pub/Sub API
2. Create service account in IAM & Admin. Assign roles: Pub/Sub Editor + Monitoring Viewer. Generate JSON key.
3. In Google Play Console → Users and Permissions, invite the service account email with permissions: View app info, View financial data, Manage orders and subscriptions
4. Upload JSON key to RevenueCat. Validate using RevenueCat's built-in credential checker.
- Credentials take up to **36 hours** to become active. Upload a signed APK/AAB to Play Console before validating.

### Platform server notifications (Apple/Google → RevenueCat)

These are notifications from the app stores TO RevenueCat (separate from webhooks to your server). They accelerate webhook delivery and enable refund detection.

- **Apple**: Dashboard → Apps & providers → iOS app → "Apply in App Store Connect" (automatic). Use V2 notifications.
- **Google**: Enable Google Cloud Pub/Sub API → connect in RevenueCat dashboard → paste topic ID in Google Play Console.
- Both are strongly recommended for production apps.

### Test Store (development without real stores)

RevenueCat includes a **Test Store** for immediate development without App Store / Play Store credentials:
- Create test products directly in the RevenueCat dashboard.
- No platform developer account needed.
- Minimum SDK: iOS 5.43.0+, Android 9.9.0+, React Native 9.5.4+.
- Uses a dedicated Test Store API key — **must be replaced with platform-specific keys before app review/production**.

### Sandbox testing

**iOS Sandbox:**
- Create sandbox accounts in App Store Connect (Users → Sandbox → Test Accounts).
- Auto-renews up to 6 times, then expires. Create new sandbox accounts for clean tests.
- RevenueCat dashboard has a Sandbox toggle to view sandbox data separately.
- Sandbox purchases may take 15+ seconds (normal).
- RevenueCat caps App Store subscription receipts at 100 per customer — delete customers in dashboard during heavy testing.

**iOS sandbox renewal rates:**

| Duration | Sandbox | TestFlight |
|---|---|---|
| 1 week | 3 minutes | 1 day |
| 1 month | 5 minutes | 1 day |
| 3 months | 15 minutes | 1 day |
| 6 months | 30 minutes | 1 day |
| 1 year | 1 hour | 1 day |

**Android Sandbox:**
- Add tester emails in Google Play Console (Settings → License Testing).
- Must upload signed APK/AAB to Play Console before testing.
- Only ONE licensed test account per device.
- Must open the testing opt-in URL to mark Play account for testing.
- Add PIN to test device (required for subscription testing).

**Android sandbox renewal rates (max 6 renewals):**

| Duration | Sandbox |
|---|---|
| 1 week | 5 minutes |
| 1 month | 5 minutes |
| 3 months | 10 minutes |
| 6 months | 15 minutes |
| 1 year | 30 minutes |

**TestFlight / Expo Dev:**
- TestFlight uses sandbox environment automatically.
- RevenueCat auto-detects sandbox vs production from the receipt.

### App Store rejection prevention

Common rejection reasons and fixes:
- **Missing "Restore Purchases" button**: Apple requires it. Add to paywall or settings screen.
- **Subscription terms not displayed**: Show auto-renewal terms, price, and cancellation policy near the purchase button.
- **Missing privacy policy link**: Required for all apps with subscriptions.
- **In-app purchase not working during review**: Ensure products are "Cleared for Sale" in App Store Connect. Wait 24 hours after first release.
- **Hardcoded prices**: Always fetch prices dynamically from RevenueCat offerings. Reviewers may test in different currencies.

### Submitting iOS subscription app

1. **Build upload**: Archive in Xcode → Distribute → App Store Connect. Bundle ID must match ASC app.
2. **Subscription groups**: Create in ASC. Users can only be subscribed to one product per group at a time. Enables duration switches (weekly → yearly).
3. **Product configuration**: Set reference name, duration, pricing per region, Family Sharing toggle, localization (at least one required).
4. **Review info**: Upload screenshot of subscription UI + short description (Apple reviewers only see this).
5. **Submit together**: New subscriptions must accompany a new app version — they cannot be submitted alone.
6. **Status**: Products must reach "Ready to Submit". If "Missing Metadata", check ASC checklist items.

### Launch checklist

Before submitting to app review:

1. **Replace Test Store API key** with platform-specific keys (`appl_` for iOS, `goog_` for Android). The app will crash in production with a Test Store key.
2. Verify App User IDs are configured correctly (no hardcoded test strings).
3. Test purchases using platform sandbox with real store products (not just Test Store).
4. Set up and verify platform server notifications (Apple/Google → RevenueCat).
5. Verify webhook delivery to your backend (if using webhooks).
6. Add subscription disclosure to app description (iOS App Store requirement).
7. Complete App Privacy and Data Safety forms for iOS and Android.
8. Use phased rollouts; wait 24 hours post-approval before full public release.
9. **First app release**: in-app purchases won't work until the app launches on the App Store. Allow up to 24 hours post-launch for IAP propagation before marketing campaigns.

### RevenueCat MCP (AI tools)

RevenueCat provides an MCP server for Claude and other AI assistants to manage your RevenueCat project:
- Create/manage apps, products, entitlements, offerings
- Query project configuration
- Batch operations (create app + product + entitlement in one conversation)
- Setup: Dashboard → AI Tools → MCP → generate OAuth credentials

### Key rules

- Initialize RevenueCat as early as possible in app startup (before navigation, before auth).
- Check `entitlements.active['pro']`, not product IDs. Entitlements decouple access from specific products.
- Handle `PURCHASE_CANCELLED_ERROR` — it's the user dismissing the dialog, not an error.
- Use `addCustomerInfoUpdateListener` for real-time subscription state changes.
- For sensitive server-side entitlement checks, verify via REST API or webhooks — don't trust client-only.
- Apple requires a "Restore Purchases" button. Always include one.
- Never call `configure()` more than once.
- Fetch offerings dynamically — never hardcode product IDs or prices.
- **Replace Test Store API key before production** — this is the #1 launch-day failure.
- Set up platform server notifications (Apple/Google → RevenueCat) for faster webhook delivery and refund detection.
- Use Trusted Entitlements and check the `verification` field for security-sensitive features.
