# 6 MW BoS Inverter & MV Switchgear Shed - 3D

Interactive **Three.js** scene (Vite). 60 x 100 kW inverters (6.0 MWac), LV combiner, 6.3 MVA 0.8/33 kV transformer and a 33 kV MV lineup in one shed. No PV modules are modelled. A 3D scene fits better than a flat diagram because trenches, racks, clearances and cable routes are spatial.

## Run
```
npm install
npm run dev        # http://localhost:5173
npm run build      # -> dist/
npm run verify     # after build: headless Chrome/Edge load, fails on console errors, saves ./shots/*.png
```

## Modelled
- **Inverter hall:** 2 wall racks x 2 tiers x 15 = 60 inverters, 1.3 m pitch (airflow/cable gap), status LEDs, heat-sink fins, louvres. DC enters from outside trenches via a wall gland strip; AC conduits drop into floor trenches.
- **LV:** 4 feeder cabinets (15 x 160 A MCCB each) + 5000 A main ACB, busbar trunking to the transformer.
- **Transformer bay:** 6.3 MVA 0.8/33 kV Dyn11 cast-resin, interlocked mesh fence.
- **MV room:** 5-panel 36 kV metal-clad lineup (IN, TX VCB, OUT, aux/VT, spare), breaker lamps (click a panel to trip/close), busbar duct, arc exhaust, HV/arc-flash labels, X-ray mode. MV cables exit through a sealed wall transit toward the substation.
- **Infrastructure:** recessed trenches with ladder trays and cover plates, floor striping, arc-flash boundary and insulating mat, roof fans, ceiling duct, louvres, split A/C, clean-agent and extinguishers, emergency/LED lighting, earth bar.

## UI
Orbit/pan/zoom, camera presets, 16 layer toggles (inverters, MV, trenches, HVAC, fire/safety...), front-wall cutaway, opacity, X-ray, click-to-inspect, clickable callouts, tabs for summary / sizing calculator / single-line.

## 6 MW / 100 kW BoS summary
- **Grouping:** 15 inverters per rack tier = 1.5 MW per MCCB cabinet; 4 cabinets into a 5000 A ACB (4.5 kA at 800 V for 6.3 MVA).
- **Trenches:** DC in from outside, separate LV AC trenches per rack, separate MV trench; keep power/control segregated, bend radius 15 x OD, fire-stopped transits.
- **Heat:** ~60 x 1.5 kW + TX ~45 kW = ~135 kW, about 7.5 m3/s at dT 15 K; filtered low intake, high exhaust, dedicated A/C for MV room.
- **MV protection / clearances:** 36 kV 1250 A 25 kA/1 s internal-arc gear with exhaust duct, TX VCB 50/51 50N/51N 49, interlocked earthing, 1.5 m arc-flash boundary + insulating mat, 1.0 m aisles, two egress routes.
Values are illustrative concept figures, not a design.

## Files
`src/build.js` geometry - `src/helpers.js` materials/signs/cables - `src/main.js` renderer/UI - `src/panels.js` info tabs - `scripts/verify.mjs` render check.
