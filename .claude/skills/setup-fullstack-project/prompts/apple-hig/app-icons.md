## Apple App Icons — All Platforms

Apple requires a single 1024x1024 master icon. The system generates all runtime sizes automatically (except macOS, which needs manual sizes). The platform applies corner masks — never bake rounded corners into your icon asset.

**This is a quick reference. Always search for the latest Apple HIG app icons documentation before finalizing icon assets.**

### Master icon spec

- Size: **1024x1024 px**
- Format: **PNG**, no transparency (all pixels opaque)
- Color space: **Display P3** recommended
- Shape: full square — the system applies superellipse masks automatically
- No drop shadows, no rounded corners in the asset

### iOS / iPadOS icon sizes

| Context | Points | @2x (px) | @3x (px) |
|---|---|---|---|
| Home Screen (iPhone) | 60pt | 120x120 | 180x180 |
| Home Screen (iPad) | 76pt | 152x152 | — |
| Home Screen (iPad Pro) | 83.5pt | 167x167 | — |
| Spotlight | 40pt | 80x80 | 120x120 |
| Settings | 29pt | 58x58 | 87x87 |
| Notifications | 20pt | 40x40 | 60x60 |
| App Store | 512pt | 1024x1024 | — |

Xcode auto-generates all runtime sizes from the 1024x1024 master.

### macOS icon sizes (must supply all manually)

| Points | @1x (px) | @2x (px) |
|---|---|---|
| 16pt | 16x16 | 32x32 |
| 32pt | 32x32 | 64x64 |
| 128pt | 128x128 | 256x256 |
| 256pt | 256x256 | 512x512 |
| 512pt | 512x512 | 1024x1024 |

Package as `.icns` file containing all sizes. macOS icons are visually richer than iOS — may include subtle shadows and depth.

### watchOS icon sizes

- Icons are **circular** (system masks square asset to circle)
- No text accompanies the icon on the watch
- Master: 1024x1024 — Xcode auto-generates all runtime sizes

### tvOS icon sizes

- App Store: **1280x768 px** (wide aspect)
- Must be **layered images** (2-5 layers) for parallax focus effect
- Background layer must be opaque
- Top Shelf image: 1920x1080 px (16:9)
- Top Shelf wide: 2320x720 px

### visionOS icon sizes

- 1024x1024 px, circular mask applied by system
- Supports up to **3 layers** for 3D depth effect
- Each layer is a separate flat, square image

### Expo configuration

```json
{
  "expo": {
    "icon": "./assets/icon.png",
    "ios": {
      "icon": "./assets/ios-icon.png"
    }
  }
}
```

Provide a 1024x1024 PNG. Expo generates all iOS sizes.

### Pre-build checklist for the coding agent

1. **1024x1024 master exists** — PNG, opaque, no transparency, no rounded corners.
2. **No baked corners** — the system applies superellipse masking. If the icon has manually rounded corners, it will show a gap between the corner and the mask.
3. **Artwork works at small sizes** — check the icon at 29pt (58px @2x). Simple, single focal point.
4. **No text in the icon** — text is illegible at small sizes.
5. **No transparency/alpha** — transparent pixels show as black on iOS.
6. **macOS: all sizes provided** — if building for macOS, verify all 10 size variants exist in the `.icns` file.
7. **tvOS: layered image** — if building for tvOS, verify parallax layers are provided.
8. **Display P3 color space** — for best color reproduction on modern displays.

### Key rules

- One 1024x1024 master icon for iOS/iPadOS/watchOS/visionOS (auto-generated sizes).
- macOS requires manually providing all 10 size variants.
- tvOS requires wide-format (1280x768) layered images.
- Never include rounded corners, drop shadows, or transparency in the icon asset.
- Keep the design simple — it must be recognizable at 40x40 pixels.
- Always verify icon assets are included and correct before submitting to App Store.

Sources:
- [Apple HIG: App Icons](https://developer.apple.com/design/human-interface-guidelines/app-icons)
