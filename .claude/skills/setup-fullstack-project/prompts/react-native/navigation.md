## Navigation

### Expo Router (file-based)
- Pages go in `app/` directory. File names become routes.
- Use `app/_layout.tsx` for layout wrappers (Stack, Tabs, Drawer).
- Use `app/(tabs)/` group for tab navigation.
- Use `app/[param].tsx` for dynamic routes.
- Navigate with `router.push()`, `router.replace()`, `<Link>`.
- Use `useLocalSearchParams()` to read route params.
- Use `app/+not-found.tsx` for 404 handling.

### React Navigation (bare RN)
- Define navigation structure in a central `navigation/` directory.
- Type navigation props with `NativeStackScreenProps` and `CompositeScreenProps`.
- Use `useNavigation()` hook typed with your `RootStackParamList`.
- Deep linking: configure `linking` prop on `NavigationContainer`.
