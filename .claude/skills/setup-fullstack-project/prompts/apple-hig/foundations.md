## Apple HIG Foundations — Quick Reference

**This is a snapshot for quick reference. Always search for the latest Apple Human Interface Guidelines before making design decisions.**

### Core design principles

- **Clarity** — legible text, precise icons, subtle adornments, function-driven design
- **Deference** — fluid motion and crisp interface that never compete with content
- **Depth** — visual layers and realistic motion convey hierarchy

### Accessibility requirements

- Minimum touch target: **44x44 points**
- Text contrast: **4.5:1** for normal text, **3:1** for large text and UI elements
- Support **Dynamic Type** (all size categories from xSmall to AX5)
- Support **VoiceOver** with meaningful labels on all interactive elements
- Support **Reduce Motion**, **Reduce Transparency**, **Bold Text**, **Increase Contrast**
- Provide captions for media content

### Color

Use **semantic/system colors** (not hardcoded hex) so UI adapts to light/dark mode:
- Blue (`systemBlue`) for primary actions
- Red (`systemRed`) for destructive actions
- Use label colors (primary → quaternary) for text hierarchy
- Use background colors (systemBackground, secondary, tertiary) for surfaces
- Support **Display P3** color space
- Never rely on color alone to convey information

### Dark mode

- Not simply an inversion — foreground brightness increases, backgrounds use true black (#000000) or near-black (#1C1C1E)
- Use semantic colors that auto-adapt
- Test in BOTH appearances
- Primary dark background: `#000000` (OLED) or `#1C1C1E`
- Secondary: `#1C1C1E`, Tertiary: `#2C2C2E`

### Typography

San Francisco font family: SF Pro (iOS/iPadOS/macOS), SF Compact (watchOS), SF Mono (code).

| Style | Size (pt) | Weight |
|---|---|---|
| Large Title | 34 | Regular |
| Title 1 | 28 | Regular |
| Title 2 | 22 | Regular |
| Title 3 | 20 | Regular |
| Headline | 17 | Semibold |
| Body | 17 | Regular |
| Callout | 16 | Regular |
| Subheadline | 15 | Regular |
| Footnote | 13 | Regular |
| Caption 1 | 12 | Regular |
| Caption 2 | 11 | Regular |

Minimum font size: **11pt**. Always use text styles (not hardcoded sizes) for Dynamic Type support.

### Layout

- Follow an **8-point grid** for spacing
- Standard content margins: **16-20pt** from screen edges
- Keep content within **safe areas** (avoid Dynamic Island, rounded corners, home indicator)
- Use Auto Layout with **leading/trailing** (not left/right) for RTL support

**UI component heights:**

| Component | Height |
|---|---|
| Status bar | 54pt |
| Navigation bar | 44pt (compact), 96pt (large title) |
| Tab bar | 49pt (+34pt home indicator = 83pt total) |
| Search bar | 36pt |
| Toolbar | 44pt |

### Images and scale factors

| Scale | Density | Usage |
|---|---|---|
| @1x | 1:1 | Older Mac displays |
| @2x | 2:1 | Retina (iPhone, iPad, Mac Retina) |
| @3x | 3:1 | Super Retina (iPhone Pro/Max) |

Use an 8px grid. Provide all scale variants in asset catalogs.

### SF Symbols

6,900+ symbols, 9 weights, 3 scales. Four rendering modes: monochrome, hierarchical, palette, multicolor. Prefer SF Symbols over custom icons for consistency.

### Motion

- Use animation purposefully (status, feedback, instruction)
- Prefer spring animations for natural-feeling motion
- Keep animations brief and non-blocking
- Support **Reduce Motion** accessibility setting

### Right-to-left

- Entire interface mirrors for RTL languages (Arabic, Hebrew)
- Use leading/trailing constraints (not left/right)
- Do NOT mirror: phone numbers, playback controls, clocks, graphs

### Writing

- Be clear, direct, respectful
- Title Case for navigation/buttons, Sentence case for body text
- Address users with "you" and "your"
- Use gender-neutral, inclusive language

### Platform-specific notes

| Platform | Key patterns |
|---|---|
| iOS | Tab bar bottom, nav bar top, large title, gesture navigation |
| iPadOS | Sidebars, multitasking (Split View, Slide Over), pointer support |
| macOS | Menu bar, multiple windows, sidebars, toolbars, richer icons |
| watchOS | Vertical scrolling, Digital Crown, circular icons, glanceable |
| tvOS | Focus-based navigation, parallax layered images, large typography |
| visionOS | Spatial windows/volumes, glass material, eye+hand tracking, 3-layer icons |

Sources:
- [Apple HIG: Foundations](https://developer.apple.com/design/human-interface-guidelines/foundations)
