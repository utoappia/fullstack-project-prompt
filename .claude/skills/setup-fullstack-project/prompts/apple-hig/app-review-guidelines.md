## Apple App Store Review Guidelines — Quick Reference

**IMPORTANT: These guidelines change frequently. This is a snapshot for awareness only. The coding agent MUST search for the latest version at https://developer.apple.com/app-store/review/guidelines/ before submitting an app for review.**

### Section 1: Safety

- **1.1 Objectionable content** — no offensive, insensitive, upsetting, or tasteless content. User-generated content (UGC) apps must include filtering, reporting, and blocking.
- **1.2 User-generated content** — apps with UGC must have: content filtering, mechanism to report offensive content, ability to block abusive users, contact information for the developer. Requires `Made for Kids` flag if targeted at children.
- **1.3 Kids category** — apps in Kids category must comply with COPPA and similar regulations. No third-party advertising or analytics. No links out of the app.
- **1.4 Physical harm** — no apps that encourage dangerous activities. Medical apps must provide disclaimers.
- **1.5 Developer information** — must provide accurate contact info. Must respond to customer support requests.
- **1.6 Data security** — implement appropriate security for user data. Use HTTPS for all network requests.

### Section 2: Performance

- **2.1 App completeness** — apps must be complete and functional when submitted. No placeholder content, broken links, or empty sections. This is the **#1 rejection reason** (~40% of rejections).
- **2.2 Beta testing** — no beta, demo, trial, or test versions on the App Store. Use TestFlight for betas.
- **2.3 Accurate metadata** — app name, description, screenshots, and preview videos must accurately reflect the app. No misleading content.
- **2.4 Hardware compatibility** — apps must work on all supported devices without modification. Test on multiple screen sizes.
- **2.5 Software requirements** — apps must use public APIs. No private API usage. No downloading or executing code (except JavaScript in WebView).

### Section 3: Business

- **3.1 Payments — In-App Purchase** — digital goods and services MUST use In-App Purchase (Apple's payment system). Physical goods and services can use external payment.
  - **3.1.1** — IAP required for: subscriptions, premium features, digital content, virtual currency, loot boxes.
  - **3.1.2** — subscriptions: must use StoreKit. Auto-renewable subscriptions must provide ongoing value.
  - **3.1.3** — "reader" apps (content purchased elsewhere): may link to external website for account management. Cannot include in-app purchase buttons on the same screen.
- **3.1.3(a) External Link Entitlement (US)** — following US court ruling, apps can include a link to an external website for purchases. Must use the StoreKit External Link API. Apple may charge a commission on external purchases.
- **3.2 Other business model issues** — no hidden fees. Clearly display pricing before purchase.

### Section 4: Design

- **4.0 Design** — apps should be useful, innovative, or provide a unique experience. Don't just wrap a website in a WebView.
- **4.1 Copycats** — don't copy other apps. Create something original.
- **4.2 Minimum functionality** — apps must provide meaningful functionality. A simple website wrapper is not sufficient.
- **4.3 Spam** — no duplicate apps, slight variations, or app farms.
- **4.4 Extensions** — app extensions must provide useful functionality and be clearly associated with the host app.
- **4.5 Apple sites and services** — don't mimic Apple's UI elements or replicate Apple's built-in apps.
- **4.6 Alternate app icons** — if supporting alternate icons, all icons must meet the app icon guidelines.
- **4.7 HTML5 games and chatbots** — HTML5 games distributed as apps must use IAP for monetization.

### Section 5: Legal

- **5.1 Privacy** —
  - **5.1.1** — data collection: must have a privacy policy. Must clearly describe what data is collected and how it's used.
  - **5.1.2** — data use and sharing: don't sell user data. Don't share data with third parties without consent.
  - **5.1.3** — health and financial data: additional protections required.
  - **5.1.4** — kids: COPPA compliance for apps collecting data from children under 13.
  - **5.1.5** — location: only request location when necessary for functionality. Always provide a clear explanation.
- **5.2 Intellectual property** — don't infringe on copyrights, trademarks, or patents.
- **5.3 Gaming, gambling, lotteries** — apps facilitating real-money gambling must be geo-restricted and comply with local laws.
- **5.4 VPN** — VPN apps must use the NEVPNManager API. Must provide a clear privacy policy.
- **5.5 Developer code of conduct** — act with integrity. Don't manipulate reviews or rankings.
- **5.6 Account deletion** — apps that support account creation MUST also support account deletion (required since June 2022).
- **5.7 Legally required features** — must comply with local laws (GDPR, CCPA, Digital Services Act, etc.).

### Common rejection reasons (in order of frequency)

1. **Guideline 2.1 — App completeness** — broken features, placeholder content, crashes during review
2. **Guideline 4.0/4.2 — Design / minimum functionality** — app is just a website wrapper, no meaningful native functionality
3. **Guideline 2.3 — Metadata** — screenshots don't match actual app, misleading description
4. **Guideline 3.1.1 — In-app purchase** — digital goods not using IAP, or external payment for digital content
5. **Guideline 5.1.1 — Privacy** — missing privacy policy, collecting data without disclosure
6. **Guideline 2.1 — Bugs** — crashes during review session (especially on specific devices)
7. **Guideline 5.6 — Account deletion** — app supports sign-up but not account deletion

### Pre-submission checklist

1. **All features work** — test every flow end-to-end. No placeholder content, no broken links, no crashes.
2. **Demo account** — provide login credentials in App Store Connect review notes (or request built-in demo mode).
3. **In-App Purchase** — digital goods use StoreKit/IAP. Physical goods can use external payment. Loot boxes must disclose odds.
4. **Account deletion** — if users can create accounts, they must be able to delete them within the app.
5. **Privacy policy** — linked in App Store Connect metadata AND accessible within the app. Must describe: data collected, how it's used, third-party sharing, retention/deletion, consent withdrawal.
6. **App Privacy labels** — complete the App Privacy disclosure in App Store Connect.
7. **Privacy manifest** — include `PrivacyInfo.xcprivacy` declaring Required Reason APIs (iOS 17+).
8. **App Tracking Transparency** — if tracking users (IDFA), must use ATT framework to request consent.
9. **Usage descriptions** — all protected resource keys in Info.plist (see `ios-permissions.md`).
10. **Metadata matches app** — screenshots show app in use (not just splash/login), description and category accurate. App name max 30 characters.
11. **Screenshots/icons rated 4+** — metadata must be appropriate for all ages even if app is rated higher.
12. **No private APIs** — only use public, documented Apple APIs. Must run on current OS.
13. **Sign in with Apple** — if offering any third-party sign-in, Sign in with Apple must also be offered.
14. **Subscription terms** — display auto-renewal terms, pricing, and period near the subscribe button. Minimum 7-day subscription period.
15. **Restore Purchases button** — required for any app with IAP.
16. **HTTPS** — all network traffic over HTTPS. Must work on IPv6-only networks.
17. **No hidden features** — describe all features in review notes. No undocumented functionality.
18. **UGC filtering** — if user-generated content: include filtering, reporting, blocking, and developer contact info.
19. **Kids category** — if targeting children: no third-party advertising/analytics, no links out of app, COPPA compliance.
20. **No code downloading** — apps cannot download or execute code that changes features/functionality (except JS in WebView).

### Key technical requirements

| Requirement | Guideline |
|---|---|
| Use only public APIs | 2.5.1 |
| IPv6 full compatibility | 2.5.5 |
| WebKit required for web browsing | 2.5.6 |
| No code downloading that changes features | 2.5.2 |
| No background crypto mining | 2.4.2 |
| Account deletion if accounts exist | 5.1.1(v) |
| Privacy policy required | 5.1.1(i) |
| ATT required for tracking | 5.1.2(i) |
| App name max 30 characters | 2.3.7 |
| Loot boxes must disclose odds | 3.1.1 |
| Subscription minimum 7 days | 3.1.2(a) |
| Metadata must be 4+ rated | 2.3.8 |

### EU/Japan alternative distribution

In the EU, developers can distribute notarized iOS/iPadOS apps from alternative marketplaces and directly from websites. In Japan, iOS apps can be distributed from alternative marketplaces. Most review guidelines still apply to notarized apps.

### Key rules

- This document is a **QUICK REFERENCE only**. Apple updates these guidelines frequently.
- **Before EVERY App Store submission**, the coding agent should search online for the latest version of the review guidelines at https://developer.apple.com/app-store/review/guidelines/
- Guideline 2.1 (app completeness) causes ~40% of rejections — test everything thoroughly.
- Account deletion is mandatory if account creation is supported.
- Digital goods and services MUST use In-App Purchase (with limited exceptions for reader apps, enterprise, person-to-person services).
- Sign in with Apple is required if you offer any other social sign-in.
- Developers are responsible for ALL third-party code, SDKs, ad networks, and analytics in their apps.

Sources:
- [Apple App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
