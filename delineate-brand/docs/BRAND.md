# Delineate — Brand & Asset Guide

## Quick start

Drop the `favicon/` directory into your `public/` folder, then paste the
contents of `docs/head-tags.html` into your `<head>`. Import `docs/tokens.css`
as your first stylesheet. Done.

---

## File inventory

```
delineate-brand/
│
├── svg/
│   ├── icon-dark.svg          ← mark, dark bg (64×64)
│   ├── icon-light.svg         ← mark, light bg (64×64)
│   ├── icon-mark.svg          ← mark, transparent bg, uses currentColor
│   ├── lockup-dark.svg        ← icon + wordmark, dark (280×48)
│   ├── lockup-light.svg       ← icon + wordmark, light (280×48)
│   ├── lockup-dark@1x.png
│   ├── lockup-dark@2x.png
│   ├── lockup-dark@3x.png
│   ├── lockup-light@1x.png
│   ├── lockup-light@2x.png
│   └── lockup-light@3x.png
│
├── favicon/
│   ├── favicon.svg            ← primary favicon (SVG, light/dark via CSS media query)
│   ├── favicon.ico            ← fallback ICO (16, 32, 48px embedded)
│   ├── apple-touch-icon.png   ← 180×180, iOS home screen
│   ├── icon-192.png           ← PWA manifest icon
│   ├── icon-512.png           ← PWA manifest icon
│   ├── icon-dark-{n}.png      ← dark icons at 16,32,48,64,128,192,256,512,1024px
│   ├── icon-light-{n}.png     ← light icons at same sizes
│   └── site.webmanifest       ← PWA manifest
│
├── marketing/
│   ├── og-image.png           ← Open Graph share image (1200×630)
│   └── twitter-card.png       ← Twitter/X card (1200×600)
│
├── icons/
│   └── DelineateIcon.tsx      ← React component (icon + lockup)
│
└── docs/
    ├── head-tags.html         ← copy-paste <head> snippet
    ├── tokens.css             ← full CSS custom property token sheet
    └── BRAND.md               ← this file
```

---

## Color palette

| Token                    | Dark mode   | Light mode  | Usage                        |
|--------------------------|-------------|-------------|------------------------------|
| `--color-bg`             | `#1a1a1e`   | `#F4F5F8`   | Page background              |
| `--color-surface`        | `#222326`   | `#ffffff`   | Cards, panels                |
| `--color-surface-raised` | `#2a2a2e`   | `#f0f0f4`   | Modals, overlays             |
| `--color-text-primary`   | `#F4F5F8`   | `#222326`   | Body text                    |
| `--color-text-secondary` | `#9a9aaa`   | `#5a5a68`   | Labels, meta                 |
| `--color-accent`         | `#5e6ad2`   | `#5e6ad2`   | Focus, CTA, active state     |
| `--color-border`         | `rgba(255,255,255,0.07)` | `rgba(0,0,0,0.07)` | Default border |

### Priority colors (both modes)

| Priority | Color     |
|----------|-----------|
| Urgent   | `#eb5757` |
| High     | `#f2994a` |
| Medium   | `#f2c94c` |
| Low      | `#4cb782` |
| None     | `#6b7280` |

---

## Typography

**Primary font:** Inter (300, 400, 500 weights only)
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500&display=swap">
```

**Monospace (keyboard shortcuts, issue IDs):** JetBrains Mono
```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400&display=swap">
```

| Role            | Size    | Weight | Usage                  |
|-----------------|---------|--------|------------------------|
| Screen title    | 24px    | 300    | Page headings          |
| Section head    | 18px    | 500    | Group labels           |
| Card title      | 16px    | 400    | Issue titles           |
| Body            | 14px    | 400    | Descriptions           |
| Label / meta    | 11.5px  | 400    | Timestamps, IDs        |
| Key badge       | 11.5px  | 400    | Keyboard shortcut keys |

---

## Logo usage

### Do
- Use the SVG sources at all sizes above 16px
- Use `favicon.svg` as the primary browser favicon
- Use the lockup (icon + wordmark) for marketing, README headers, app nav
- Maintain the light/dark mode inversion — white card on dark, dark card on light

### Don't
- Don't alter stroke weights or card angles
- Don't use the mark on a mid-tone background (it needs contrast)
- Don't add drop shadows or glows to the mark
- Don't recolor the accent lines on the front card
- Don't stretch or non-uniformly scale

### Minimum sizes
| Context               | Min size |
|-----------------------|----------|
| Browser favicon       | 16×16    |
| Inline / sidebar icon | 20×20    |
| App nav lockup        | 28px tall (icon height) |
| Print / marketing     | 48px tall minimum |

---

## React usage

```tsx
import { DelineateIcon, DelineateLockup } from './icons/DelineateIcon';

// Icon only
<DelineateIcon size={24} />

// Force light mode
<DelineateIcon size={24} mode="light" />

// Lockup — auto adapts to OS theme
<DelineateLockup iconSize={28} fontSize={18} />
```

---

## Vite project setup

```
public/
  favicon/
    favicon.svg         ← from this package
    favicon.ico
    apple-touch-icon.png
    icon-192.png
    icon-512.png
    site.webmanifest
  marketing/
    og-image.png
    twitter-card.png

src/
  styles/
    tokens.css          ← import first
  components/
    DelineateIcon.tsx
```

`index.html`:
```html
<!-- paste contents of docs/head-tags.html here -->
```

`src/main.css` or `src/index.css`:
```css
@import './styles/tokens.css';
/* your styles below */
```

---

## Brand voice

**Tagline:** *Triage your Linear backlog at the speed of thought*

**Tone:** Direct, fast, technical. No fluff. Speaks to engineers who live in
their keyboard. Borrows Linear's own confidence without copying their voice.

**Keywords:** triage · backlog · keyboard-driven · fast · focused · Linear-native
