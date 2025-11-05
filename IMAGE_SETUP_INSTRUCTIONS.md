# Image Setup Instructions

## Images to Add

You need to manually save these two images to complete the app branding:

### 1. Uttarakhand State Emblem
- **File to save:** The first image you shared (Uttarakhand emblem with text "उत्तराखण्ड राज्य")
- **Save as:** `assets/images/uttarakhand-emblem.png`
- **Where it appears:** Login screen, at the top above the app title
- **Recommended size:** The image should be clear and high-resolution (at least 200x200 pixels)

### 2. Trekker Logo (trek.png)
- **File to save:** The second image you shared (trekker with backpack illustration)
- **Save as:** `assets/images/trek.png`
- **Where it appears:** 
  - Home screen (main dashboard), centered above the app title
  - App logo/branding element throughout the app
- **Recommended size:** Clear, high-resolution PNG (at least 300x300 pixels)

## Steps to Add Images

1. **Download/Save the Images:**
   - Save the Uttarakhand emblem image as `uttarakhand-emblem.png`
   - Save the trekker illustration as `trek.png`

2. **Place in Correct Folder:**
   - Navigate to: `C:\Users\Taraksh Goyal\Desktop\coding\sih_tele\admin-app\assets\images\`
   - Copy both images into this folder

3. **Verify the Files:**
   - Check that the files are named exactly:
     - `uttarakhand-emblem.png`
     - `trek.png`
   - Make sure they're in PNG format with transparent backgrounds if possible

## What's Been Updated

The following screens have been modified to include these images:

1. **Login Screen** (`app/auth/login.tsx`):
   - Added Uttarakhand emblem at the top
   - Emblem appears above "SURAKSHIT" title

2. **Home Screen** (`app/index.tsx`):
   - Added trekker logo prominently
   - Logo appears centrally as the main branding element

## Next Steps After Adding Images

After you've saved the images:

1. **Test in Development:**
   ```bash
   cd "C:\Users\Taraksh Goyal\Desktop\coding\sih_tele\admin-app"
   npx expo start
   ```

2. **Build for Production:**
   If building from the short path:
   ```bash
   cd C:\a\admin-app
   npm ci
   cd android
   .\gradlew.bat clean assembleRelease
   ```

## Optional: Update App Icon

If you want to use the trekker image as your app icon too, you can:

1. Create icon versions:
   - `icon.png` (1024x1024) - Main app icon
   - `android-icon-foreground.png` (432x432) - For Android adaptive icon
   - `splash-icon.png` (200x200) - For splash screen

2. Replace the existing files in `assets/images/` folder

3. Run:
   ```bash
   npx expo prebuild --clean
   ```

## Troubleshooting

If images don't appear:
- Check file names are exactly as specified (case-sensitive)
- Ensure images are in PNG format
- Clear app cache and restart: `npx expo start -c`
- Check image file sizes aren't corrupted

## Current App Branding

- **App Name:** SURAKSHIT
- **Subtitle:** Admin App
- **State Emblem:** Uttarakhand (on login)
- **Main Logo:** Trekker illustration (on home screen)
- **Color Scheme:** Dynamic (light/dark mode support)
