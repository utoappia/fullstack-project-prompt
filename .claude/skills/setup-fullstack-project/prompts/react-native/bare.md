## Bare React Native Conventions

- Use `@react-navigation/native` with stack, tab, and drawer navigators.
- After adding native dependencies, run `cd ios && pod install` for iOS.
- Modify `android/app/build.gradle` for Android-specific configuration.
- Modify `ios/Podfile` for iOS-specific configuration.
- Use `react-native-config` for environment variables.
- Link native modules manually if autolinking fails.
- For builds, use Xcode (iOS) and Android Studio or `./gradlew assembleRelease` (Android).
- Keep `metro.config.js` minimal — only add overrides when necessary.
