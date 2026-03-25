## iOS Protected Resources and Permissions

iOS requires apps to declare why they need access to protected resources. If your app uses a protected API without the corresponding usage description key in Info.plist, the app will **crash at runtime** or be **rejected by App Store review**.

### How it works

- **Bare React Native / Electron**: add keys to `ios/{AppName}/Info.plist`
- **Expo**: add keys to `app.json` under `expo.ios.infoPlist`

The coding agent must check that every protected resource used by the app has its corresponding usage description key added.

### Expo app.json example

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSCameraUsageDescription": "This app uses the camera to take profile photos.",
        "NSPhotoLibraryUsageDescription": "This app accesses your photos to let you choose a profile picture.",
        "NSLocationWhenInUseUsageDescription": "This app uses your location to show nearby stores.",
        "NSFaceIDUsageDescription": "This app uses Face ID to securely log you in."
      }
    }
  }
}
```

### Bare React Native Info.plist example

```xml
<key>NSCameraUsageDescription</key>
<string>This app uses the camera to take profile photos.</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>This app accesses your photos to let you choose a profile picture.</string>
```

### Complete list of protected resource keys

**Camera and media:**

| Key | Resource | When required |
|---|---|---|
| `NSCameraUsageDescription` | Camera | Any camera access (photo, video, QR scanning) |
| `NSMicrophoneUsageDescription` | Microphone | Audio recording, video with audio, voice calls |
| `NSPhotoLibraryUsageDescription` | Photo library (read) | Reading/selecting photos or videos |
| `NSPhotoLibraryAddUsageDescription` | Photo library (write) | Saving photos or videos to library |
| `NSAppleMusicUsageDescription` | Apple Music / Media Library | Accessing user's music library |

**Location:**

| Key | Resource | When required |
|---|---|---|
| `NSLocationWhenInUseUsageDescription` | Location (foreground) | GPS while app is in foreground |
| `NSLocationAlwaysAndWhenInUseUsageDescription` | Location (always) | GPS in background. Must also include WhenInUse key. |
| `NSLocationAlwaysUsageDescription` | Location (always, legacy) | Deprecated — use AlwaysAndWhenInUse instead |

**Contacts and calendars:**

| Key | Resource | When required |
|---|---|---|
| `NSContactsUsageDescription` | Contacts | Reading or writing contacts |
| `NSCalendarsUsageDescription` | Calendars (full access) | Reading and writing calendar events |
| `NSCalendarsWriteOnlyAccessUsageDescription` | Calendars (write only, iOS 17+) | Writing calendar events without reading |
| `NSRemindersUsageDescription` | Reminders | Reading or writing reminders |

**Biometrics and identity:**

| Key | Resource | When required |
|---|---|---|
| `NSFaceIDUsageDescription` | Face ID | Using Face ID for authentication |

**Health:**

| Key | Resource | When required |
|---|---|---|
| `NSHealthShareUsageDescription` | HealthKit (read) | Reading health data |
| `NSHealthUpdateUsageDescription` | HealthKit (write) | Writing health data |
| `NSHealthClinicalHealthRecordsShareUsageDescription` | Clinical health records | Reading clinical health records |

**Connectivity:**

| Key | Resource | When required |
|---|---|---|
| `NSBluetoothAlwaysUsageDescription` | Bluetooth (iOS 13+) | Any Bluetooth access |
| `NSBluetoothPeripheralUsageDescription` | Bluetooth (legacy) | Deprecated in iOS 13 — use AlwaysUsageDescription |
| `NSLocalNetworkUsageDescription` | Local network | Discovering/connecting to devices on local network |
| `NFCReaderUsageDescription` | NFC | Reading NFC tags |
| `NSNearbyInteractionUsageDescription` | Nearby Interaction (U1 chip) | Using UWB for spatial awareness |

**Motion and sensors:**

| Key | Resource | When required |
|---|---|---|
| `NSMotionUsageDescription` | Motion / Accelerometer | Accessing accelerometer, gyroscope, pedometer |

**Speech and Siri:**

| Key | Resource | When required |
|---|---|---|
| `NSSpeechRecognitionUsageDescription` | Speech recognition | Using speech-to-text |
| `NSSiriUsageDescription` | Siri / Intents | Integrating with SiriKit |

**Tracking and advertising:**

| Key | Resource | When required |
|---|---|---|
| `NSUserTrackingUsageDescription` | App Tracking Transparency (iOS 14+) | Accessing IDFA for tracking. Required if using ad attribution. |

**HomeKit and smart home:**

| Key | Resource | When required |
|---|---|---|
| `NSHomeKitUsageDescription` | HomeKit | Controlling smart home devices |

**Gaming:**

| Key | Resource | When required |
|---|---|---|
| `NSGKFriendListUsageDescription` | Game Center friends list | Accessing Game Center friends. Without this, all Friends API calls error. |

**Other:**

| Key | Resource | When required |
|---|---|---|
| `NSVideoSubscriberAccountUsageDescription` | TV provider | Accessing TV provider account (tvOS/iOS) |

### How the coding agent should check permissions

When reviewing code or adding features that access protected resources, follow this process:

1. **Scan the codebase** for usage of protected APIs. Common patterns to search for:
   - Camera: `expo-camera`, `react-native-camera`, `ImagePicker.launchCamera`, `AVCaptureSession`
   - Photos: `expo-image-picker`, `@react-native-camera-roll/camera-roll`, `PHPhotoLibrary`
   - Location: `expo-location`, `react-native-geolocation`, `CLLocationManager`
   - Contacts: `expo-contacts`, `react-native-contacts`
   - Bluetooth: `react-native-ble-plx`, `expo-bluetooth` (if available)
   - Microphone: `expo-av`, `react-native-audio-recorder`
   - Notifications: push notification libraries (not a usage description key, but requires entitlement)
   - Tracking: `expo-tracking-transparency`, `react-native-tracking-transparency`
   - Face ID: `expo-local-authentication`, `react-native-biometrics`
   - Health: `react-native-health`, `expo-health` (if available)
   - NFC: `react-native-nfc-manager`
   - Motion: `expo-sensors`, `react-native-sensors`

2. **Check Info.plist / app.json** for the corresponding usage description key.

3. **If a key is missing**, add it with a clear, specific description of why the app needs that access. Apple rejects apps with vague descriptions like "This app needs access to your camera."

4. **Good usage descriptions** are specific and user-friendly:
   - Good: "This app uses the camera to scan QR codes for product information."
   - Bad: "Camera access is required."
   - Bad: "This app needs camera permission."

5. **Don't add keys you don't need.** Only include usage descriptions for resources your app actually accesses. Adding unnecessary keys may trigger App Store review questions.

### Privacy Manifest (iOS 17+)

Starting May 2024, apps must also include a **Privacy Manifest** (`PrivacyInfo.xcprivacy`) that declares:
- **Required Reason APIs** used by the app (e.g., `NSUserDefaults`, file timestamp APIs, system boot time)
- **Collected data types** (for the App Privacy nutrition label)
- **Tracking domains**

For Expo, use the `expo-privacy-manifest-polyfill-plugin` or configure directly in `app.json`:
```json
{
  "expo": {
    "ios": {
      "privacyManifests": {
        "NSPrivacyAccessedAPITypes": [
          {
            "NSPrivacyAccessedAPIType": "NSPrivacyAccessedAPICategoryUserDefaults",
            "NSPrivacyAccessedAPITypeReasons": ["CA92.1"]
          }
        ]
      }
    }
  }
}
```

### Key rules

- Every protected resource API used in the app MUST have a corresponding usage description key.
- Missing keys cause runtime crashes or App Store rejection (ITMS-90683).
- Usage descriptions must be user-facing, specific, and honest about why access is needed.
- Only add keys for resources the app actually uses — unnecessary keys raise review flags.
- When adding a new feature that uses a protected resource, add the usage description key in the same commit.
- For Expo managed workflow, all keys go in `app.json` under `expo.ios.infoPlist`. For bare/Electron, add to `Info.plist` directly.
- Always search for the latest Apple documentation for any new protected resource keys — Apple adds new ones with each iOS version.

Sources:
- [Apple: Protected Resources](https://developer.apple.com/documentation/bundleresources/protected-resources)
- [iOS Dev Recipes: Permission Keys](https://www.iosdev.recipes/info-plist/permissions/)
- [Apple: NSUserTrackingUsageDescription](https://developer.apple.com/documentation/bundleresources/information-property-list/nsusertrackingusagedescription)
- [Apple: NSCalendarsWriteOnlyAccessUsageDescription](https://developer.apple.com/documentation/bundleresources/information-property-list/nscalendarswriteonlyaccessusagedescription)
