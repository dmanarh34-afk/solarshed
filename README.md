# BoS Inverter & MV Switchgear Shed - 3D (two scenes)

Interactive **Three.js** scenes (Vite). Switch between them with the buttons at the top (or URL hash `#6mw` / `#633kw`). No PV modules are modelled.

| Scene | Inverters | AC | Step-up | MV |
|---|---|---|---|---|
| **6 MW** | 60 x 100 kW (2 racks x 2 tiers x 15) | 6.0 MWac, ~7.5 MWp | 6.3 MVA 0.8/33 kV | 5-panel 36 kV metal-clad lineup |
| **633 kW** | 6 x 100 kW on Unistrut rack (+ outlined 7th slot) | 600 kWac for 633 kWp (DC/AC 1.055); 7 units = 700 kWac, 0.90 | 630 kVA 0.4/11 kV | 3-panel 11 kV RMU (TX protection, ring in/out) |

## Run
```
npm install
npm run dev        # http://localhost:5173
npm run build      # -> dist/
npm run verify     # after build: headless Chrome/Edge, both scenes, fails on console errors, screenshots in ./shots
```

## Features
Orbit camera, view presets per scene, 16 layer toggles, front-wall cutaway, wall opacity, X-ray (busbars/switch poles), click-to-inspect equipment, clickable callouts, switch/earth-switch indicators with interlock (click an MV panel), engineering note, sizing calculator and single-line tab per scene.

## 633 kW scene
633 kWp DC / 6 x 100 kW = 600 kWac, DC/AC 1.055 (negligible clipping); optional 7th unit gives 700 kWac and N+1. Inverters have DC disconnects, status LEDs and bottom glands; DC enters via wall sleeves from an outside trench; AC goes through a grated trench to a 6 x 160 A MCCB combiner with SPD and metering, a 1250 A ACB, busbar trunking, the 630 kVA transformer bay and the 11 kV RMU. Perforated overhead tray for controls, exhaust fans + louvres + split A/C (~17 kW heat, ~0.9 m3/s), CO2 extinguishers, exit/emergency lighting, floor striping, 1.2 m arc-flash boundary.

## 6 MW scene
See the in-app note: 60-inverter grouping, trench routing, ~135 kW heat (~7.5 m3/s), 25 kA/1 s internal-arc MV gear, 1.5 m arc-flash boundary.

Values are illustrative concept figures, not a design.

## Files
`src/build.js` (6 MW) - `src/build633.js` (633 kW) - `src/helpers.js` - `src/main.js` (renderer, UI, scene switching) - `src/panels.js` - `scripts/verify.mjs`.
