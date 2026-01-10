# UI Design Specification

## 🎨 Brand Identity & Theme
- **Theme:** Deep Dark Mode.
- **Background:** `#0B0E14` (Deep Charcoal/Black).
- **Primary Accent (Acquisition):** `#22C55E` (Emerald Green) with a 20px outer glow.
- **Secondary Accent (Disposition):** `#3B82F6` (Royal Blue) with a 20px outer glow.
- **Card Backgrounds:** High-transparency glassmorphism (rgba 255, 255, 255, 0.05) with 1px border.

## 📱 Components & Layout
- **Global:** Use `Inter` or `Geist` sans-serif font. Rounded corners should be `rounded-2xl` (16px).
- **Home Screen:**
    - Profile Section: Avatar on left, "Daily Streak" with a fire icon on right.
    - Mode Selectors: Two large vertical-stack buttons with neon borders and icons.
    - Weekly Goal: A thick circular progress ring (Green).
- **Persona Selector:**
    - A horizontal snap-carousel (Swiper.js style).
    - Active card has a highlighted neon border; inactive cards are dimmed.
- **Live Call HUD:**
    - Top: Small transcript bubble showing the AI's last line.
    - Center: Live audio waveform visualization.
    - Bottom: Two radial gauges (Speedometer style) for "Pacing" and "Certainty."

## ⚡ Animations (Framer Motion)
- **Transitions:** Use `framer-motion` for slide-ins when switching steps.
- **Pulse:** The "Start Call" button should have a subtle breathing glow animation.