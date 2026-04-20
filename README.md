# Dice Forge

A grimdark, 3D, browser-based dice simulator for tabletop gaming — with
first-class support for **Warhammer 40,000** and **Warhammer
Underworlds**. Built as a lightweight, offline-capable PWA: zero
trackers, zero ads, installable on desktop and mobile.

![Dice Forge — a 3D tabletop dice simulator](./docs/screenshot.png)
<!-- Screenshot placeholder — add once captured. -->

## Features

- **True 3D dice** — Three.js + cannon-es physics drop real polyhedra
  (tetrahedron for D4, cube for D6, octahedron for D8, pentagonal
  trapezohedron for D10 / D100, dodecahedron for D12, icosahedron for
  D20) into a stone-and-gilt tray, tumbling and settling naturally.
- **Accurate dice graphics** — pip-patterned D6s, hand-drawn
  Underworlds symbols (crossed swords, hammer, starburst, shield,
  dodge diamond, lightning, focus sigil, crit star), numbered faces
  for the rest.
- **Pool builder** — chain together any combination of D3, D4, D6, D8,
  D10, D12, D20, D% and any custom Dn (2–1000 sides), plus the three
  Underworlds dice (Attack, Defence, Magic).
- **Success thresholds** — roll pools against a 2+/3+/4+/5+/6+ target
  and see a live success count.
- **WH40K helpers** — built-in Wound Chart (Strength vs. Toughness)
  and Save Throw calculator (Armour + AP, with Invuln override).
- **Presets** — save named pools, plus built-in presets for common
  scenarios; instant reload.
- **Session stats** — roll count, dice rolled, average, criticals,
  fumbles.
- **Roll history** — the last 50 rolls, re-loadable with one tap.
- **Shake-to-roll** — on mobile, shake the device to roll (iOS
  requires permission on first use).
- **Lock & select dice** — long-press to lock a die across rolls,
  tap to select dice for a targeted re-roll.
- **Celebrations** — gold emissive pulse + particle burst on
  criticals; red desaturate + shake on fumbles; screen shimmer for
  all-success, camera shake for all-fail.
- **Grimdark theme** — deep midnight palette, gilded accents, Cinzel
  display type, parchment legends. Light-mode theme available.
- **Accessible fallback** — full SVG fallback for reduced-motion or
  no-WebGL environments; keyboard-navigable die results; screen-reader
  labels on every interactive element.
- **PWA** — installable, service-worker cached, works offline after
  first load.

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| `Space` or `Enter` | Roll all dice |
| `L` (while a die is focused) | Lock / unlock the die |
| `Enter` / `Space` (while a die is focused) | Select / deselect |

## Quickstart

```bash
# Install
npm install

# Run dev server (http://localhost:5173/dice/)
npm run dev

# Production build
npm run build

# Preview the built bundle
npm run preview
```

## Tech stack

- **[Vite](https://vitejs.dev/)** — build tool, dev server.
- **Vanilla JavaScript** — no UI framework; CSS layers for style
  isolation; quasi-Redux state in `src/main.js`.
- **[Three.js](https://threejs.org/)** — WebGL renderer for 3D dice.
- **[cannon-es](https://github.com/pmndrs/cannon-es)** — rigid-body
  physics for the tumble.
- **[@fontsource/cinzel](https://fontsource.org/fonts/cinzel)** —
  self-hosted Cinzel display font (no CDN calls).
- **Service Worker** — offline caching.

## Project structure

```
src/
  main.js                       # Bootstrap + state + event wiring
  style.css                     # Design tokens + all component styles
  sw.js                         # Service worker
  assets/
    dice-svgs.js                # Isometric SVG dice (chips + fallback)
  modules/
    DiceEngine.js               # Pure PRNG roll logic
    Dice3DRenderer.js           # Three.js scene + physics + dice meshes
    DiceGeometry.js             # D10 trapezohedron + face-normal tables
    DiceTextures.js             # Canvas textures for die faces
    AnimationManager.js         # CSS animations (fallback)
    AudioManager.js             # Roll / success / fail sounds
    HistoryManager.js           # sessionStorage history
    ParticleSystem.js           # 2D canvas particle burst
    PresetsManager.js           # localStorage presets
    UIRenderer.js               # DOM mutation (pool, results, etc.)
    WH40KHelper.js              # Wound + save calculations
```

## Contributing

Issues and PRs welcome. This is a weekend-project-style codebase —
small, dependency-light, and easy to hack on.

## License

MIT.
