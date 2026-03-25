## Android App Icons

Android requires multiple icon assets at different densities, plus a separate Google Play Store listing icon. Missing or incorrectly sized icons cause build warnings, blurry icons, or Play Store rejection.

### Icon types required

| Icon | Purpose | Format |
|---|---|---|
| **Adaptive icon** (foreground + background) | App launcher on Android 8+ | PNG or XML vector |
| **Legacy icon** | App launcher on Android 7 and below | PNG |
| **Round icon** | Round launcher variant (some OEMs) | PNG |
| **Google Play Store icon** | Store listing | 512x512 PNG, 32-bit, sRGB, max 1024KB |

### Adaptive icons (Android 8.0+ / API 26+)

Adaptive icons have two layers — **foreground** and **background** — that the OS composites and masks into different shapes (circle, squircle, rounded square, etc.) depending on the device.

**Canvas and safe zone:**
- Full canvas: **108x108 dp** (the OS crops ~18dp on each side)
- Safe zone: **66x66 dp** centered (your artwork must fit within this area)
- Anything outside the safe zone may be clipped by the device's icon mask

**File structure in the Android project:**
```
android/app/src/main/res/
├── mipmap-mdpi/
│   ├── ic_launcher.png            (48x48 px)
│   ├── ic_launcher_round.png      (48x48 px)
│   ├── ic_launcher_foreground.png (108x108 px)
│   └── ic_launcher_background.png (108x108 px)
├── mipmap-hdpi/
│   ├── ic_launcher.png            (72x72 px)
│   ├── ic_launcher_round.png      (72x72 px)
│   ├── ic_launcher_foreground.png (162x162 px)
│   └── ic_launcher_background.png (162x162 px)
├── mipmap-xhdpi/
│   ├── ic_launcher.png            (96x96 px)
│   ├── ic_launcher_round.png      (96x96 px)
│   ├── ic_launcher_foreground.png (216x216 px)
│   └── ic_launcher_background.png (216x216 px)
├── mipmap-xxhdpi/
│   ├── ic_launcher.png            (144x144 px)
│   ├── ic_launcher_round.png      (144x144 px)
│   ├── ic_launcher_foreground.png (324x324 px)
│   └── ic_launcher_background.png (324x324 px)
├── mipmap-xxxhdpi/
│   ├── ic_launcher.png            (192x192 px)
│   ├── ic_launcher_round.png      (192x192 px)
│   ├── ic_launcher_foreground.png (432x432 px)
│   └── ic_launcher_background.png (432x432 px)
└── mipmap-anydpi-v26/
    ├── ic_launcher.xml            (adaptive icon definition)
    └── ic_launcher_round.xml      (round adaptive icon definition)
```

**Adaptive icon XML (`mipmap-anydpi-v26/ic_launcher.xml`):**
```xml
<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
```

### Density-to-pixel size reference

| Density | Legacy icon | Adaptive layer | Scale |
|---|---|---|---|
| mdpi | 48x48 | 108x108 | 1x |
| hdpi | 72x72 | 162x162 | 1.5x |
| xhdpi | 96x96 | 216x216 | 2x |
| xxhdpi | 144x144 | 324x324 | 3x |
| xxxhdpi | 192x192 | 432x432 | 4x |

### Google Play Store icon

- Size: **512x512 px**
- Format: 32-bit PNG, sRGB color space
- Max file size: 1024 KB
- Shape: full square (Google Play applies rounded corners automatically at 30% radius)
- No transparency, no drop shadows (Play Store adds these dynamically)
- Upload in Google Play Console under Store Listing

### Expo configuration

For Expo managed workflow, provide a single high-resolution icon and Expo generates all sizes:

```json
{
  "expo": {
    "icon": "./assets/icon.png",
    "android": {
      "icon": "./assets/android-icon.png",
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon-foreground.png",
        "backgroundImage": "./assets/adaptive-icon-background.png",
        "backgroundColor": "#FFFFFF"
      }
    }
  }
}
```

- `foregroundImage`: 1024x1024 px recommended (Expo downscales). Keep artwork within the center 66% (safe zone).
- `backgroundImage`: 1024x1024 px, or use `backgroundColor` for a solid color instead.
- `icon`: fallback for legacy devices. 1024x1024 px recommended.

### Pre-build checklist

When building the app binary, the coding agent should verify:

1. **Adaptive icon layers exist** — both `foregroundImage` and either `backgroundImage` or `backgroundColor` are set (Expo), or all `mipmap-*` directories have foreground + background PNGs (bare RN).

2. **All density buckets are populated** — for bare RN, check that all 5 density folders (mdpi through xxxhdpi) have icons. Missing densities cause blurry icons on those devices.

3. **Safe zone compliance** — the foreground artwork fits within the center 66% of the canvas. Open the foreground image and verify no important content is in the outer 18dp border.

4. **Correct pixel dimensions** — verify each file matches the expected size for its density bucket (see table above). Incorrectly sized icons cause scaling artifacts.

5. **No transparency in background layer** — the background must be fully opaque. Transparent backgrounds show as black on some launchers.

6. **Round icon variant exists** — some OEMs (Samsung, etc.) use `ic_launcher_round`. Ensure `mipmap-anydpi-v26/ic_launcher_round.xml` exists.

7. **Google Play Store icon** — 512x512 PNG, no transparency, no rounded corners (store applies them), under 1024KB.

8. **`AndroidManifest.xml` references** — verify the manifest points to the correct icon resources:
   ```xml
   <application
       android:icon="@mipmap/ic_launcher"
       android:roundIcon="@mipmap/ic_launcher_round"
       ...>
   ```

### Common issues

- **Blurry icons**: missing a density bucket — the OS upscales from a lower density.
- **Clipped artwork**: foreground content outside the 66% safe zone gets cut by the device mask.
- **Black background**: transparent adaptive icon background. Use a solid color or opaque image.
- **Play Store rejection**: icon > 1024KB, or icon contains misleading badges/text.
- **Missing round icon**: Samsung and some launchers show a broken icon placeholder.

### Key rules

- Always provide adaptive icons (foreground + background layers) — legacy-only icons look outdated on modern Android.
- Keep critical foreground content within the center 66% safe zone.
- For Expo, provide 1024x1024 px source images and let Expo handle downscaling.
- For bare RN, use Android Asset Studio or a similar tool to generate all density variants.
- Verify icons at every density before building the release APK/AAB.
- The Google Play Store icon is separate from the app launcher icon — don't forget to upload it.

Sources:
- [Google Play Icon Design Specifications](https://developer.android.com/distribute/google-play/resources/icon-design-specifications)
- [Android Adaptive Icons Guide](https://developer.android.com/guide/practices/ui_guidelines/icon_design_adaptive)
- [Android Screen Densities](https://developer.android.com/training/multiscreen/screendensities)
