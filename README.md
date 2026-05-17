# Cyberdeck 25 OS

Identifier: cyberdeck-25-os

Created: Thu Oct 23 01:14:53 UTC 2025

A reactive visualizer for the FCC cyberdeck hardware: 1 momentary key, 3 toggle switches, and 4 rotary encoders feed a grid of canvas visualizations selected from a desktop-style picker.

## Run it

### Remote

Live build at <https://cyberdeck-25-os.fcc.lol>. Auto-deploys on every push to `main` via `.github/workflows/deploy.yml`.

### Local

```sh
./start.sh
```

(or `npm start` — same effect.) Installs deps if `node_modules` is missing, then starts Vite at <http://localhost:5173> and opens Chromium in kiosk mode.

### Desktop shortcut on Raspberry Pi

From inside the cloned repo on the Pi:

```sh
./install-desktop.sh
```

Generates a personalized `cyberdeck.desktop` launcher on `~/Desktop` (with absolute paths to this checkout's `start.sh` and icon). Double-click it to launch; pick "Execute in Terminal" on the first-run prompt so the dev-server log is visible.

The app opens a `socket.io` connection to `http://localhost:3001` for hardware input. Without that bridge running you'll see `DISCONNECTED` in the debug overlay and all encoder/switch values stay at zero — but the picker, launch animation, and visualizations still render, so it's fine for visual testing.

## Controls

| Action | Effect |
|---|---|
| double-click an icon | open that visualization |
| drag an icon | reposition it; layout persists in `localStorage` |
| single-click an icon | select (label gets a highlight box) |
| `Esc` | return to the picker |
| `Space` (inside a viz) | toggle the debug overlay |

## Hardware input mapping

Every visualization wires the same five hardware controls the same way:

| Input | Role |
|---|---|
| `KEY` | invert background (black ↔ white) |
| `RED` / `GREEN` / `BLUE` switches | enable each color channel |
| `E1` | density / count |
| `E2` | speed / rate *(currently flaky — never load-bearing)* |
| `E3` | size / scale / amplitude |
| `E4` | rotation / twist / distortion |

Encoder values are snapshotted at the moment a visualization opens, so every viz starts at `E1..E4 = 0` regardless of where the physical knobs are sitting.

## Visualizations

Particles, Oscilloscope Waves, Geometric Mosaic, Perspective Tunnel, Metaballs Fluid, Hyperspace Starfield, Fractal Tree, Spectrum Bars, Kaleidoscope Mandala, Matrix Rain, Lissajous Harmonograph.

Each is a self-contained canvas component under `src/apps/visualizations/`. Add a new one by dropping a file there and registering it in the `VISUALIZATIONS` array in `src/App.jsx`.

## Notes for the Raspberry Pi target

- Picker icons are bundled Twemoji SVGs (`public/emoji/`) so they render identically regardless of system emoji fonts.
- Every visualization caps its expensive controls (particle count, recursion depth, grid density, etc.) so a runaway encoder can't push render cost past what a Pi can hit at 60fps.
