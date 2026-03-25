## Apple HIG Patterns and Inputs — Quick Reference

**This is a snapshot for quick reference. Always search for the latest Apple HIG before making design decisions.**

### Launching

- Show a launch screen that matches the app's initial state (not a branding splash)
- Launch into the previously viewed screen/state when possible
- Avoid requiring setup or login before showing content (let users explore first)

### Onboarding

- Keep it brief — 1-3 screens maximum
- Show value immediately, don't explain what's obvious from the UI
- Defer sign-up/login until the user needs it (not at first launch)
- Request permissions in context (not all upfront during onboarding)

### Accessing private data

- Request permission only when the feature is needed (not at launch)
- Explain why access is needed before the system prompt appears
- Provide a clear fallback if permission is denied
- See `ios-permissions.md` for the complete list of protected resource keys

### Loading

- Show content as soon as it's available (progressive loading)
- Use activity indicators for indeterminate waits
- Use progress bars for determinate operations
- Make loading states feel fast — show skeleton screens or placeholder content
- Never block the entire UI while loading secondary content

### Modality

- Use modality sparingly — only for focused tasks that require completion or dismissal
- Present sheets for self-contained tasks
- Alert for critical information requiring acknowledgment
- Full-screen modal only when the task requires the entire screen (photo editing, composing)
- Always provide a clear way to dismiss (close button, swipe down)

### Managing notifications

- Don't send notifications unless the user opted in or the content is genuinely time-sensitive
- Group related notifications
- Provide notification actions for quick responses
- Support notification summary and focus modes
- Rich notifications: include images, actions, and interactive content

### Settings

- Minimize settings — prefer smart defaults
- Keep settings in-app (not in the Settings app, unless system-level like notifications)
- Group related settings logically
- Show the current value next to each setting

### Searching

- Place search prominently (top of lists, tab bar)
- Show search suggestions and recent searches
- Provide scoping options for large content sets
- Show results as the user types (live search)
- Support voice search where appropriate

### Feedback

- Use haptics for physical feedback (see Haptics below)
- Show inline validation for form fields
- Use toasts/banners for non-critical confirmations
- Use alerts only for critical errors requiring acknowledgment
- Provide sound feedback for significant actions (send, delete)

### Undo and redo

- Support undo for destructive or significant actions
- iOS: shake to undo (system default), or provide explicit undo UI
- Show a brief "undo" option (snackbar/toast) after destructive actions
- Multi-level undo preferred over single-level

### Entering data

- Use the appropriate keyboard type (`emailAddress`, `phonePad`, `URL`, `numberPad`, `decimalPad`)
- Pre-fill known values (name, email from account)
- Use pickers instead of free-text for constrained values (date, time, options)
- Validate inline as the user types, not after submission
- Support paste, autofill, and password managers

### Drag and drop

- Support drag and drop for content manipulation (reordering, moving between apps)
- Show a preview of the dragged content
- Highlight valid drop targets
- Support multi-item drag on iPad

---

### Inputs

**Touchscreen gestures:**

| Gesture | Action |
|---|---|
| Tap | Select, activate |
| Long press | Preview, context menu |
| Swipe | Navigate, delete, reveal actions |
| Pinch | Zoom in/out |
| Rotate | Rotate content |
| Pan | Scroll, move |
| Edge swipe (left) | Back navigation |
| Pull down | Refresh, dismiss |

**Haptics:**

| Type | Use for |
|---|---|
| Selection | Scrolling through picker values |
| Impact (light/medium/heavy) | UI elements snapping into place |
| Notification (success/warning/error) | Task completion, alerts |

Use haptics to reinforce visual feedback, not replace it. Don't overuse — haptic fatigue is real.

**Keyboards:**

- Always set the correct `keyboardType` on text fields
- Set `textContentType` for autofill (`username`, `password`, `emailAddress`, `fullStreetAddress`, etc.)
- Set `returnKeyType` to match the action (`done`, `next`, `search`, `send`, `go`)
- Support hardware keyboard shortcuts on iPad
- Respect the keyboard safe area — content should scroll above the keyboard

**Apple Pencil (iPadOS):**

- Support double-tap for tool switching
- Support pressure sensitivity and tilt where relevant
- Scribble: handwriting-to-text in any text field (system default on iPadOS 14+)

**Game controllers:**

- Map controls to standard MFi gamepad layout
- Support both controller and touch input
- Show appropriate button glyphs based on connected controller type

### Ratings and reviews

- Use `SKStoreReviewController` — system enforces max **3 prompts per 365 days**
- Ask at moments of satisfaction (after completing a task, level, or milestone)
- Never force users to rate/review to access features
- Never create custom rating prompts or incentivize ratings

### Managing accounts

- **Sign in with Apple is required** if your app offers any third-party sign-in
- Account deletion must be supported if account creation is supported (App Store requirement since June 2022)
- Delay sign-up until the user needs it — let users explore first
- Support guest checkout in commerce apps

### visionOS spatial interactions

- Primary input: **look (eyes) + pinch (hand)** — indirect interaction
- Minimum interactive target: **60 points** diameter (larger than iOS's 44pt)
- Provide hover feedback when gaze rests on interactive elements
- **Privacy: NEVER use gaze direction to infer user interest, change content based on where user looks, or record eye tracking data**
- Hands rest naturally — don't require sustained arm positions or precise hand placement

### Key rules

- Request permissions in context, not upfront
- Show content before asking for login
- Use the correct keyboard type for every text field
- Support undo for destructive actions
- Use haptics to reinforce, not replace, visual feedback
- Keep modality to a minimum — prefer inline interactions
- Always provide a way to dismiss modals and sheets
- Minimum touch targets: 44pt (iOS/iPadOS), 60pt (visionOS)
- Sign in with Apple required if offering any social sign-in
- Account deletion required if account creation is supported
- Max 3 rating prompts per year via SKStoreReviewController

Sources:
- [Apple HIG: Patterns](https://developer.apple.com/design/human-interface-guidelines/patterns)
- [Apple HIG: Inputs](https://developer.apple.com/design/human-interface-guidelines/inputs)
