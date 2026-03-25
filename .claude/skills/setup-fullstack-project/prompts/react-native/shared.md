## React Native Conventions

- Use `StyleSheet.create()` for styles. Avoid inline style objects.
- Use platform-specific file extensions (`.ios.ts`, `.android.ts`) for divergent platform code. Use `Platform.OS` for minor differences.
- Handle safe areas with `react-native-safe-area-context` or Expo's `SafeAreaView`.
- Use `react-native-reanimated` for animations, not the built-in `Animated` API.
- Images: use `@2x` and `@3x` suffixes for resolution-aware assets.
- Use `FlatList` or `FlashList` for long lists, never `ScrollView` with `.map()`.
- Handle keyboard avoidance with `KeyboardAvoidingView` or `react-native-keyboard-aware-scroll-view`.
- Test on both iOS and Android before considering a feature complete.
