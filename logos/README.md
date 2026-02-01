# nudj Brand Assets

This directory contains the public assets for the nudj application.

## Logo Variants

*   **`logo-transparent.svg`**: The primary logo (Dark Mode). Light shape on transparent background. Use on dark backgrounds. **Contains animation.**
*   **`logo-light-mode.svg`**: The Light Mode variant. Dark charcoal shape on transparent background. Use on light/white backgrounds. **Contains animation.**
*   **`logo-adaptive.svg`**: The "Smart" variant. Uses `currentColor` for the main shape. It will automatically be white or black (or any color) depending on the text color of its parent container. Perfect for apps that switch themes dynamically. **Contains animation.**
*   **`logo-with-bg.svg`**: The logo with the official dark charcoal (`#1a1a1a`) background baked in. Use this when the logo needs to stand alone (e.g., social media, READMEs). **Contains animation.**

## PWA Icons

These icons are static PNGs generated from `logo-with-bg.svg` and are used for the Progressive Web App manifest.

*   **`icon-192.png`**: Standard 192x192 icon for home screens.
*   **`icon-512.png`**: Standard 512x512 icon for splash screens and app stores.
*   **`icon-maskable-512.png`**: A maskable version of the 512px icon. Safe for Android's adaptive icons (circle, squircle, etc.). The logo is centered with sufficient padding to allow cropping.
*   **`favicon.ico`**: 32x32 icon for browser tabs.

## Colors

*   **Background**: `#1a1a1a` (Deep Charcoal)
*   **Primary Shape (Dark Mode)**: `#e8e8e8` (Warm Off-White)
*   **Primary Shape (Light Mode)**: `#1a1a1a` (Deep Charcoal)
*   **Accent**: `#f5a623` (Amber)
