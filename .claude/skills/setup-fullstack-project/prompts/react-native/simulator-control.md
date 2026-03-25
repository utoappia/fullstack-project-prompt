## Simulator/Emulator Control for AI Coding Agents

When working on mobile app projects, the coding agent should be able to see and interact with the iOS Simulator and Android Emulator — take screenshots, read the UI tree, tap elements, type text, and verify visual output. This enables visual debugging, UI testing, and screenshot verification without manual intervention.

**This is a quick reference. Always search online for the latest tools and versions — this space is evolving rapidly.**

### Environment check

Before attempting simulator/emulator control, verify the environment:

**iOS Simulator:**
```bash
# Check if Xcode command line tools are installed
xcode-select -p

# List available simulators
xcrun simctl list devices

# Check if a simulator is booted
xcrun simctl list devices | grep Booted

# Boot a simulator
xcrun simctl boot "iPhone 16 Pro"

# Take a screenshot
xcrun simctl io booted screenshot screenshot.png

# Open a URL in the simulator
xcrun simctl openurl booted "myapp://deeplink"
```

**Android Emulator:**
```bash
# Check if adb is available
adb devices

# List available AVDs
emulator -list-avds

# Start an emulator
emulator -avd Pixel_7_API_34 &

# Take a screenshot
adb exec-out screencap -p > screenshot.png

# Tap at coordinates
adb shell input tap 500 1000

# Type text
adb shell input text "hello"

# Swipe
adb shell input swipe 500 1500 500 500 300

# Install an APK
adb install app-debug.apk

# Launch an app
adb shell am start -n com.myapp/.MainActivity
```

### AI agent tools for simulator/emulator control

These tools are specifically designed to give AI coding agents "eyes and hands" on mobile devices:

#### agent-device (recommended for Claude Code)

Lightweight CLI designed for AI agents. Structured accessibility tree snapshots with element references.

```bash
# Install
npx skills add callstackincubator/agent-device

# Usage
agent-device open MyApp --platform ios
agent-device snapshot -i                    # Get interactive elements with refs
# Output: @e5 [button] "Settings"  @e6 [textfield] "Email"

agent-device click @e5                      # Click element by ref
agent-device fill @e6 "test@example.com"    # Type into field
agent-device screenshot page.png            # Capture screenshot
agent-device scroll down                    # Scroll
agent-device close
```

- Supports iOS simulators + Android emulators
- Token-efficient: returns only interactive elements with accessibility data
- Deterministic replay: record actions as `.ad` scripts
- GitHub: https://github.com/callstackincubator/agent-device

#### MobAI (MCP server for any AI agent)

Desktop app providing MCP server + HTTP API for device control.

```bash
# Install MobAI desktop app from https://mobai.run
# Connect via MCP server in Claude Code settings, or via HTTP API

# Capabilities via MCP:
# - List/connect devices (physical + simulators)
# - Take screenshots
# - Read UI accessibility tree
# - Tap, type, swipe native apps
# - Control Safari/Chrome WebViews with CSS selectors
# - Run MobAI Script (cross-platform DSL)
```

- Supports iOS + Android (physical devices + simulators/emulators)
- MCP server integration for Claude Code, Cursor, Codex
- Free tier: 1 device, 100 API calls/day
- GitHub: https://github.com/MobAI-App/mobai-mcp

#### Maestro (E2E testing framework)

YAML-based mobile UI testing. Good for automated test suites, less for interactive agent use.

```yaml
# flow.yaml
appId: com.myapp
---
- launchApp
- tapOn: "Log In"
- inputText:
    id: "email_field"
    text: "test@example.com"
- tapOn: "Submit"
- assertVisible: "Welcome"
- screenshot: "login_complete.png"
```

```bash
# Install
curl -Ls "https://get.maestro.mobile.dev" | bash

# Run a flow
maestro test flow.yaml

# Record a flow interactively
maestro record
```

- Cross-platform (iOS + Android)
- YAML-based, no code needed
- CI/CD friendly (runs in Docker)
- GitHub: https://github.com/mobile-dev-inc/Maestro

### When to use each tool

| Tool | Best for | Agent integration |
|---|---|---|
| `xcrun simctl` / `adb` | Basic screenshots, app launch, quick checks | Any agent (CLI) |
| agent-device | AI agent interactive development, visual debugging | Claude Code (skill) |
| MobAI | Cross-agent MCP support, WebView testing | Any MCP-compatible agent |
| Maestro | Automated E2E test suites, CI/CD | Test runner (not interactive) |
| Detox | React Native gray-box testing, CI/CD | Test runner |
| Appium | Cross-platform WebDriver testing, complex flows | Test runner |

### What the coding agent should do

**At project setup:**
1. Check if `xcrun simctl` is available (iOS). If not, tell the user to install Xcode.
2. Check if `adb` is available (Android). If not, tell the user to install Android Studio or standalone SDK tools.
3. Check if any AI-agent device control tools are installed (`agent-device`, MobAI). If not, suggest installing one based on the user's agent.
4. Search online for the latest versions of these tools — new tools in this space emerge frequently.

**During development:**
1. When implementing UI changes, take a screenshot of the simulator/emulator to verify the change visually.
2. When debugging UI issues, use the accessibility tree snapshot to understand the element hierarchy.
3. When the user reports a visual bug, take a screenshot and compare against the expected behavior.
4. Before submitting for review, take screenshots of key screens on multiple device sizes.

**Before app submission:**
1. Take screenshots on all required device sizes for App Store / Play Store listings.
2. Verify app icons appear correctly on the home screen (see `android-icons.md` and `apple-hig/app-icons.md`).
3. Test critical flows end-to-end using device control tools.

### Keeping tools current

**The tools listed above are a snapshot from when this prompt was written. This ecosystem changes rapidly — tools get abandoned, forked, renamed, or superseded by better alternatives on a monthly basis.**

Every time you work with simulator/emulator control, if web search is available:

1. **Check for updates to installed tools.** Run `npm outdated` or check the tool's GitHub releases page. These tools often release breaking changes or critical fixes. Compare the installed version against the latest.

2. **Search for newer/better alternatives.** Search for `"AI agent mobile simulator control 2026"` or `"MCP server iOS Android automation latest"`. New tools in this space appear frequently. If you find a significantly better tool, suggest it to the user and document the switch in `Documentation/decisions/`.

3. **Check if installed tools are still maintained.** Look at the GitHub repo — when was the last commit? Are issues being responded to? If the tool appears abandoned (no commits in 6+ months, unresolved critical issues), suggest migrating to an active alternative.

4. **Check compatibility with the current environment.** After Xcode or Android Studio updates, device control tools often break. Verify the tool works with the installed Xcode/Android SDK version.

If web search is NOT available, use the installed tools as-is but add a note: `// TODO: verify simulator control tool is still current and check for updates`.

### Key rules

- Always verify the simulator/emulator environment is set up before attempting device control.
- Prefer structured accessibility tree tools (agent-device, MobAI) over raw coordinate-based taps — they're more reliable across device sizes.
- Take screenshots at key development milestones to visually verify changes.
- **Every session involving device control: search online for the latest tools and check for updates to installed ones.** This ecosystem evolves faster than most.
- If no device control tool is available, fall back to `xcrun simctl screenshot` (iOS) and `adb exec-out screencap` (Android) for basic screenshots.
- When switching tools, document the decision in `Documentation/decisions/` with rationale.

Sources:
- [agent-device](https://github.com/callstackincubator/agent-device)
- [MobAI](https://mobai.run/)
- [Maestro](https://github.com/mobile-dev-inc/Maestro)
- [Agent Device Blog Post](https://www.callstack.com/blog/agent-device-ai-native-mobile-automation-for-ios-android)
