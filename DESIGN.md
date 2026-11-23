---
name: Pixel Office v3.1 Design System
inspiration:
  - VoltAgent/awesome-design-md/linear.app
  - VoltAgent/awesome-design-md/raycast
  - VoltAgent/awesome-design-md/voltagent
---

# Pixel Office · DESIGN.md

## Visual Direction
Obsidian developer-craft HUD inspired by **Linear**, **Raycast**, and **VoltAgent**: a full-bleed interactive pixel-art campus surrounded by razor-thin floating dark-glass chrome with 1px hairlines, top specular highlights, restrained accents, and tabular telemetry.

## Surface Ladder & Hairlines
- **Canvas Backdrop**: `#07080a` (`--bg-canvas`) — continuous near-black frame behind the pixel world.
- **Surface 1 (HUD / Cards)**: `rgba(13, 14, 16, 0.90)` (`--surface-1`) + `backdrop-filter: blur(16px)`.
- **Surface 2 (Nested Groups / Modals)**: `#0f1011` (`--surface-2`).
- **Surface 3 (Inputs / Controls / Hover)**: `#141516` (`--surface-3`) and `#191a1b` (`--surface-4`).
- **Hairline Borders**: `#23252a` (`--hairline`), `#34343a` (`--hairline-strong`), and top edge highlight `inset 0 1px 0 rgba(255, 255, 255, 0.06)`.
- **Keycaps**: `linear-gradient(180deg, #16171a 0%, #0d0e10 100%)` with 1px `#2a2c32` border and 2px bottom bezel.

## Disciplined Accents & Semantic Telemetry
- **Linear Lavender (`#5e6ad2` / `#828fff`)**: Selected room/agent highlight bar, focus rings, active tab indicator.
- **Raycast White CTA (`#ffffff`, `#000000` ink, `#e8e8e8` pressed)**: Primary modal save/submit buttons.
- **VoltAgent Emerald (`#00d992`)**: Live connection beacon (`Ao Vivo`), terminal/shell badges, active worker indicator.
- **Semantic Status**: Waiting/attention `#ffc533`, Error `#ff6161`, Reading/Info `#57c1ff`, Gemini/Dreaming `#a855f7`.

## Typography & Radii
- **Sans**: `'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif` with `font-feature-settings: "calt", "kern", "liga", "ss03";` and `font-variant-numeric: tabular-nums;`.
- **Mono**: `'Cascadia Code', 'JetBrains Mono', Consolas, monospace` strictly for clocks, paths, tokens, and shortcuts.
- **Radius Scale**: `4px` badges/keycaps, `6px` small pills/agent rows, `8px` inputs/buttons, `12px` floating cards & modals.
