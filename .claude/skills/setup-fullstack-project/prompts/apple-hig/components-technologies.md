## Apple HIG Components and Technologies — Quick Reference

**This is a snapshot for quick reference. Always search for the latest Apple HIG before implementing UI components.**

### Navigation components

**Navigation bar:** top of screen, shows title + back button + action buttons. Supports large title (96pt) and inline title (44pt). Use large title for top-level screens, inline for pushed screens.

**Tab bar:** bottom of screen, 2-5 tabs. Each tab is a separate navigation stack. Highlight the active tab. Use SF Symbols for tab icons (filled style when selected). Tab bar height: 49pt + 34pt home indicator.

**Sidebar (iPadOS/macOS):** primary navigation in regular-width layouts. Collapsible. Replaces tab bar on iPad in landscape.

### Content components

**Lists/Tables:** grouped or plain style. Support swipe actions (delete, archive, flag). Pull-to-refresh for updatable content. Use section headers for grouped content.

**Scroll views:** support rubber-banding (bounce). Show scroll indicators. Support pull-to-refresh.

**Search bar:** 36pt height. Place at top of scrollable content. Supports scope buttons for filtering categories.

### Action components

**Buttons:** minimum 44x44pt touch target. Filled style for primary actions, outlined/plain for secondary. Destructive actions in red. Use verbs for button labels ("Save", "Delete", not "OK").

**Alerts:** use sparingly — only for critical information. Maximum 2-3 buttons. Destructive button on the left (iOS) or styled in red. Cancel button on the right or as the last option.

**Action sheets (iOS):** present from bottom. List of actions related to current context. Include a cancel button. Destructive actions in red.

**Context menus:** long-press to reveal. Show preview of the item. Group related actions with separators. Include destructive actions at the bottom in red.

**Sheets:** present from bottom, draggable to dismiss. Use for focused tasks. Support detents (medium = half screen, large = full). Provide a close/done button.

### Form components

**Text fields:** single-line input. Set `keyboardType`, `textContentType`, `returnKeyType`. Show placeholder text. Validate inline.

**Text views:** multi-line input. Support scrolling within the view.

**Switches/Toggles:** binary on/off. Green when on (system default). Don't add labels like "On"/"Off" — the switch state is clear.

**Segmented controls:** 2-5 segments. For switching between views or filter modes. Equal-width segments.

**Pickers:** use for constrained value selection (date, time, options). Wheel pickers are iOS standard. Inline pickers for less prominent selections.

**Sliders:** for continuous values within a range. Show min/max icons or labels. Use for non-precise values (volume, brightness).

**Steppers:** for precise numeric increment/decrement. Show current value next to the stepper.

### Feedback components

**Progress indicators:** determinate (bar) for known duration, indeterminate (spinner) for unknown. Place near the content being loaded.

**Toasts/Banners:** brief, non-modal feedback. Auto-dismiss after 2-4 seconds. Don't require user interaction to dismiss.

### Status bar

Always visible (54pt). Shows time, battery, signal. Adapt text color to content (light or dark style). Don't hide the status bar unless in full-screen immersive content (video, games).

---

### Technologies

**Sign in with Apple:**
- Required if app offers any third-party sign-in (Google, Facebook, etc.)
- Use the system-provided button (ASAuthorizationAppleIDButton)
- Support both email and "Hide My Email" relay
- Handle account deletion (required since June 2022)

**In-app purchase / StoreKit:**
- Use the StoreKit 2 API for purchases and subscriptions
- Display prices fetched from the App Store (never hardcode)
- Show subscription terms near the purchase button
- Include a "Restore Purchases" button
- See `revenuecat/` prompts for RevenueCat integration patterns

**WidgetKit / Live Activities:**
- Widgets: glanceable, read-only, tappable to open app
- Sizes: small (2x2), medium (4x2), large (4x4), extra large (iPad 4x4)
- Lock screen widgets: circular, rectangular, inline
- Live Activities: time-sensitive updates on lock screen and Dynamic Island
- Use SwiftUI for widget views

**Apple Pay:**
- Use the system-provided Apple Pay button
- Show Apple Pay as the first/most prominent payment option
- Support both payment and subscription flows
- Requires Apple Pay entitlement and merchant ID configuration

**App Clips:**
- Lightweight (<15MB) version of your app for instant use
- Launched via NFC, QR code, Safari banner, Maps, or Messages
- Focus on a single task
- Offer option to download the full app

**SharePlay:**
- Synchronize content playback across FaceTime participants
- Support group activities API
- Show participants and playback controls

**Siri / App Intents:**
- Expose key actions as App Intents for Siri and Shortcuts
- Provide clear, concise intent phrases
- Support parameterized intents for flexibility

**CarPlay:**
- Limited to approved categories: audio, communication, driving task, EV charging, fueling, navigation, parking, quick food ordering
- Use CarPlay-specific templates (not custom UI)
- Support Siri for hands-free interaction

**HealthKit:**
- Request only the health data types your app actually needs
- Explain clearly why each data type is needed
- Don't gate core functionality behind health data access
- Handle denied permissions gracefully

### WidgetKit sizes (iPhone)

| Family | Size (pt) | Use |
|---|---|---|
| systemSmall | 169x169 | Single tap target, ~4 pieces of info |
| systemMedium | 360x169 | Multiple tap targets |
| systemLarge | 360x376 | Rich content |
| systemExtraLarge | iPadOS only | Dashboard-style |

Widgets are not mini-apps. They showcase glanceable, relevant content. Tapping deep-links into the app.

### Live Activities (iPhone 14 Pro+)

Four presentations:
- **Compact** (Dynamic Island): leading + trailing around TrueDepth camera
- **Minimal** (Dynamic Island, multiple activities): small circular/oval
- **Expanded**: shown on touch-and-hold of compact
- **Lock Screen**: banner at top — only for important updates

Design for all four presentations.

### Alert vs action sheet

- **Alert**: 1-2 buttons, critical information requiring acknowledgment
- **Action sheet**: 3+ choices related to an action. Always include Cancel at bottom. Destructive actions in red at top.
- Use action sheet (not multi-button alert) when offering more than 2 options.

### Key rules

- Use system-provided components whenever possible — they come with built-in accessibility, Dark Mode support, and platform behavior.
- Follow platform conventions for component placement (tab bar at bottom on iOS, sidebar on iPadOS).
- Minimum touch target: 44x44pt for all interactive elements (60pt on visionOS).
- Sign in with Apple is required if you offer any third-party sign-in option.
- Never hardcode prices — always fetch from StoreKit/RevenueCat.
- Test all components in both light and dark mode, and with Dynamic Type.
- Tab bars: 3-5 tabs on iPhone. Never hide tabs based on context — dim unavailable ones instead.
- Alerts are for critical info only. Use action sheets for 3+ choices.
- Widgets must be glanceable — not mini-apps.

Sources:
- [Apple HIG: Components](https://developer.apple.com/design/human-interface-guidelines/components)
- [Apple HIG: Technologies](https://developer.apple.com/design/human-interface-guidelines/technologies)
