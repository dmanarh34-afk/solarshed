import { THREE, mat, glow, box, cyl, put, tube, mergedBoxes, ladder, sign, hvSign, arcSign, mimic, stripeTex, meshTex, canvasTex } from './helpers.js';

/* ---------------------------------------------------------------
   Geometry conventions (metres): X = shed length, Y = up, Z = depth.
   Shed interior x -11.9..15.9, z -4.4..4.4, height 4.5.
   Zones (west -> east): inverter hall | LV AC combiner | TX bay | MV room
---------------------------------------------------------------- */
const XS = Array.from({ length: 15 }, (_, i) => -17.2 + 1.3 * i); // inverter columns
const TIER_Y = [0.5, 1.65]; // bottom of each tier
const C = { dc: '#d0262e', dcneg: '#1d2124', ac: '#e0a02e', mv: '#c8232c', cond: '#98a2ab', cu: '#c87533' };

export const shellMats = [];
export const xrayMats = [];

export function buildPlant(ctx) {
  const { add, label, tag, anim } = ctx;
  const out = { frontWall: null, internals: [], leds: [] };
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  /* ============================ SHELL ============================ */
  const ghost = (color) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.85, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide });
    shellMats.push(m);
    return m;
  };
  const edgeMat = new THREE.LineBasicMaterial({ color: 0x8a9aaa });
  const wall = (w, h, d, x, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), ghost('#cfd6dd'));
    put(m, x, h / 2, z);
    m.add(new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), edgeMat));
    return m;
  };
  const back = wall(34.7, 4.5, 0.2, -1.25, -4.5);
  const front = wall(34.7, 4.5, 0.2, -1.25, 4.5);
  out.frontWall = front;
  add('shell', back); add('shell', front);
  add('shell', wall(0.2, 4.5, 9, -18.5, 0)); add('shell', wall(0.2, 4.5, 9, 16, 0));
  // doors
  for (const dz of [-0.46, 0.46]) {
    add('shell', put(box(0.07, 2.2, 0.9, '#6f808e', { metalness: 0.5 }), -18.46, 1.1, dz));
    add('shell', put(box(0.04, 0.05, 0.6, '#c9ced3', { metalness: 0.8 }), -18.4, 1.0, dz * 0.45));
  }
  add('shell', put(box(0.07, 2.1, 0.9, '#6f808e', { metalness: 0.5 }), 15.96, 1.05, 2.6));
  label('shell', [-18.7, 2.5, 0], 'Double door (outward opening, panic bars)\n+ 2nd egress east wall', 'shell');

  // roof + steelwork
  const roof = new THREE.Mesh(new THREE.BoxGeometry(35.3, 0.25, 9.8), ghost('#aab4be'));
  put(roof, -1.25, 4.625, 0);
  add('roof', roof);
  for (let x = -17; x <= 15; x += 2) add('roof', put(box(0.1, 0.3, 9.1, '#5f6d79', { metalness: 0.6 }), x, 4.35, 0));
  for (const z of [-3, 0, 3]) add('roof', put(box(34, 0.07, 0.07, '#5f6d79', { metalness: 0.6 }), -1.25, 4.52, z));
  label('roof', [-4, 4.9, 0], 'Roof: steel purlins, ghosted. NO PV modules on roof, walls or yard', 'shell');

  /* ============================ SLAB / TRENCHES ============================ */
  const yard = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), new THREE.MeshStandardMaterial({ color: '#4a4e52', roughness: 1 }));
  yard.rotation.x = -Math.PI / 2; yard.position.y = -0.41; yard.receiveShadow = true;
  add('slab', yard);

  const shape = new THREE.Shape();
  const S = (x, z) => new THREE.Vector2(x, -z);
  shape.setFromPoints([S(-18.8, -4.8), S(16.3, -4.8), S(16.3, 4.8), S(-18.8, 4.8)]);
  const hole = (pts) => { const p = new THREE.Path(); p.setFromPoints(pts.map(([x, z]) => S(x, z))); return p; };
  // C-shaped LV trench (rear row + front row + cross trench at x~4.1)
  shape.holes.push(hole([[-17.9, -3.65], [4.4, -3.65], [4.4, 3.65], [-17.9, 3.65], [-17.9, 3.1], [3.8, 3.1], [3.8, -3.1], [-17.9, -3.1]]));
  // L-shaped MV trench (TX -> MV panels -> east wall)
  shape.holes.push(hole([[8.9, 0.8], [9.5, 0.8], [9.5, -3.4], [15.9, -3.4], [15.9, -4.3], [8.9, -4.3]]));
  const slabGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.4, bevelEnabled: false });
  slabGeo.rotateX(-Math.PI / 2); slabGeo.translate(0, -0.4, 0);
  const slab = new THREE.Mesh(slabGeo, mat('#6f757c', { roughness: 0.95, metalness: 0 }));
  slab.receiveShadow = true; slab.castShadow = true;
  add('slab', slab);

  const trough = (x0, x1, z0, z1, h = 0.36) => {
    const w = x1 - x0, d = z1 - z0, g = new THREE.Group();
    g.add(put(box(w, 0.04, d, '#8d9399', { roughness: 0.95 }), (x0 + x1) / 2, -0.39, (z0 + z1) / 2));
    if (w >= d) {
      g.add(put(box(w, h, 0.06, '#8d9399', { roughness: 0.95 }), (x0 + x1) / 2, -0.4 + h / 2, z0 + 0.03));
      g.add(put(box(w, h, 0.06, '#8d9399', { roughness: 0.95 }), (x0 + x1) / 2, -0.4 + h / 2, z1 - 0.03));
    } else {
      g.add(put(box(0.06, h, d, '#8d9399', { roughness: 0.95 }), x0 + 0.03, -0.4 + h / 2, (z0 + z1) / 2));
      g.add(put(box(0.06, h, d, '#8d9399', { roughness: 0.95 }), x1 - 0.03, -0.4 + h / 2, (z0 + z1) / 2));
    }
    return g;
  };
  // outside DC trenches (rear/front) incl. branches out to the PV field
  for (const s of [-1, 1]) {
    add('slab', trough(-20, 3.6, Math.min(5.1 * s, 5.5 * s), Math.max(5.1 * s, 5.5 * s)));
    add('slab', trough(-20, -19.6, Math.min(5.5 * s, 13 * s), Math.max(5.5 * s, 13 * s)));
    add('slab', put(ladder(23.5, 0.3), -8.2, -0.3, 5.3 * s));
  }
  // MV outgoing trough in the yard
  add('slab', trough(15.9, 25, -4.4, -3.4));

  // trench ladders
  for (const s of [-1, 1]) add('slab', put(ladder(22.2, 0.5), -6.7, -0.3, 3.375 * s));
  const lx = ladder(6.5, 0.6); lx.rotation.y = Math.PI / 2; add('slab', put(lx, 4.1, -0.3, 0));
  add('slab', put(ladder(7.0, 0.7), 12.4, -0.3, -3.85));
  const lz = ladder(4.4, 0.5); lz.rotation.y = Math.PI / 2; add('slab', put(lz, 9.2, -0.3, -1.3));

  // trench cover plates (partial so cables stay visible)
  const cov = [];
  const plate = (x, z, w, d) => cov.push([x, 0.012, z, w, 0.025, d]);
  for (const s of [-1, 1]) for (let i = 0; i < 16; i++) if (i % 3 !== 1) plate(-17 + i * 1.3, 3.375 * s, 1.25, 0.58);
  for (let i = 0; i < 5; i++) if (i % 2 === 0) plate(4.1, -2.6 + i * 1.3, 0.62, 1.25);
  for (let i = 0; i < 5; i++) if (i !== 2) plate(9.2, 0.2 - i * 0.85, 0.62, 0.8);
  add('covers', mergedBoxes(cov, '#5d646b', { metalness: 0.7, roughness: 0.4 }));

  label('slab', [-19.8, 0.4, -9], 'DC trench from PV field\n(1500 Vdc homeruns, outside)', 'dc');
  label('slab', [-6, 0, 3.375], 'LV AC cable trench + ladder tray\n(inverter AC collection)', 'ac');
  label('slab', [4.1, 0, -3.2], 'Cross trench\ninto LV combiner', 'ac');
  label('slab', [12.4, 0, -3.85], 'MV cable trench\n(bend radius 15 x OD)', 'mv');

  /* ============================ INVERTERS ============================ */
  const finGeo = [], louvGeo = [], dcPlus = [], dcMinus = [];
  for (let k = 0; k < 14; k++) finGeo.push([-0.36 + k * 0.055, 0.375, 0.0, 0.018, 0.055, 0.3]);
  for (let k = 0; k < 6; k++) louvGeo.push([0.27, 0.12 - k * 0.04, 0.186, 0.28, 0.012, 0.004]);
  for (let k = 0; k < 6; k++) { dcPlus.push([-0.38 + k * 0.062, -0.38, 0, 0.022, 0.06, 0.022]); dcMinus.push([-0.38 + k * 0.062 + 0.03, -0.38, 0, 0.022, 0.06, 0.022]); }
  const nameplate = sign('SUN-100K\n100 kW  3P 800 Vac', 0.32, 0.11, { bg: '#c9d0d6', fg: '#1b2227', border: '#59636b' });
  const ledMats = { run: glow('#27ff6a', 2), comm: glow('#3aa0ff', 2), warn: glow('#ffb020', 2) };
  const invAll = [];

  function inverter(row, tier, i) {
    const s = row === 0 ? -1 : 1; // rear wall / front wall
    const bY = TIER_Y[tier], cy = bY + 0.35, zc = s * 4.16;
    const g = new THREE.Group();
    g.add(put(box(0.9, 0.6, 0.02, '#3b4249', { metalness: 0.6 }), 0, 0, -0.19));
    g.add(put(box(1.0, 0.7, 0.36, '#c3cad0', { roughness: 0.4, metalness: 0.2 }), 0, 0, 0));
    g.add(put(box(0.96, 0.66, 0.008, '#dfe4e7', { roughness: 0.35 }), 0, 0, 0.184));
    g.add(put(mergedBoxes(finGeo, '#4a5259', { metalness: 0.7, roughness: 0.35 }), 0, 0, 0));
    g.add(put(mergedBoxes(louvGeo, '#2c3237', { roughness: 0.5 }), 0, 0, 0));
    g.add(put(box(0.3, 0.17, 0.006, '#202529'), 0.27, 0.07, 0.186));
    const np = nameplate.clone(); np.position.set(-0.22, -0.2, 0.19); g.add(np);
    // status LEDs: RUN / COMM / ALARM
    const alarm = row === 0 && tier === 1 && i === 4;
    const leds = [[-0.4, 0.27, alarm ? ledMats.warn : ledMats.run, 'run'], [-0.34, 0.27, ledMats.comm, 'comm'], [-0.28, 0.27, alarm ? ledMats.warn : glow('#3a2a08', 0.1), 'alarm']];
    leds.forEach(([x, y, m, k]) => { const l = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 8), m); l.position.set(x, y, 0.192); g.add(l); });
    // DC inputs (bottom) + AC gland
    g.add(put(mergedBoxes(dcPlus, C.dc, { roughness: 0.5 }), 0, 0, 0));
    g.add(put(mergedBoxes(dcMinus, '#15181a', { roughness: 0.5 }), 0, 0, 0));
    g.add(put(cyl(0.04, 0.04, 0.07, '#8c969f', { metalness: 0.7 }), -0.46, -0.385, 0));
    g.position.set(XS[i], cy, zc);
    if (row === 1) g.rotation.y = Math.PI;
    g.updateMatrixWorld(true);
    const W = (lx, wy, lz) => g.localToWorld(V(lx, wy - cy, lz));
    // --- cabling (built in inverter-local coords so front row mirrors automatically)
    const gap = -0.65;
    for (let k = 0; k < 2; k++) {
      const gx = gap + 0.01 + k * 0.03 + tier * 0.06, px = -0.3 + k * 0.03;
      add('dc', tube([W(gx, -0.3, -1.14 + 0.0), W(gx, 0.3, -0.8), W(gx, 0.3, -0.27), W(gx, 0.3, -0.22), W(gx, bY - 0.14, -0.22), W(px, bY - 0.1, -0.05), W(px, bY - 0.04, 0)], 0.011, k ? C.dcneg : C.dc));
    }
    const ax = gap - 0.11 + tier * 0.06;
    add('ac', tube([W(-0.46, bY - 0.05, 0), W(-0.46, bY - 0.14, -0.1), W(ax, bY - 0.17, -0.14), W(ax, 0.12, -0.14), W(ax, -0.04, 0.35), W(ax, -0.2, 0.785)], 0.028, C.cond, { metalness: 0.5 }));
    const nm = `INV-${row === 0 ? 'R' : 'F'}${tier + 1}-${String(i + 1).padStart(2, '0')}`;
    tag(g, {
      title: nm + (alarm ? '  (demo ALARM state)' : ''),
      sub: '100 kW string / central-string inverter, wall-rack mounted',
      specs: [['Rating', '100 kWac / 110 kVA, 3-phase'], ['AC output', '800 Vac, 79 A, 50/60 Hz'], ['DC input', 'max 1500 Vdc, 10-12 MPPT strings, MC4 connectors'], ['DC entry', 'from outside DC trench via gland strip at 0.3 m'], ['Cooling', 'natural convection heat-sink fins + louvres; ~1.5 kW loss'], ['Status LEDs', alarm ? 'RUN off / COMM blue / ALARM amber (grid fault demo)' : 'RUN green / COMM blue (blinks) / ALARM off'], ['Protection', 'DC SPD T1+T2, AFCI, RCMU, AC SPD; AC MCCB in LV combiner']],
      layer: 'inv',
    });
    out.leds.push({ run: leds[0][2], comm: ledMats.comm, alarm: alarm, phase: Math.random() * 6 });
    add('inv', g);
    invAll.push(g);
  }
  for (let row = 0; row < 2; row++) for (let t = 0; t < 2; t++) for (let i = 0; i < 15; i++) inverter(row, t, i);

  // mounting rails
  for (const s of [-1, 1]) for (const t of [0, 1]) {
    add('inv', put(box(19.4, 0.06, 0.05, '#7a8590', { metalness: 0.7 }), -8.1, TIER_Y[t] + 0.15, s * 4.36));
    add('inv', put(box(19.4, 0.06, 0.05, '#7a8590', { metalness: 0.7 }), -8.1, TIER_Y[t] + 0.55, s * 4.36));
  }
  // DC trunk tubes in outside troughs + branch up to the array
  for (const s of [-1, 1]) for (const [k, col] of [[0, C.dc], [1, C.dcneg]]) {
    add('dc', tube([V(-19.8, -0.25, s * 13), V(-19.8, -0.25, s * 5.3 + (k ? 0.07 : -0.07)), V(-19.4, -0.25, s * 5.3 + (k ? 0.07 : -0.07)), V(3.0, -0.25, s * 5.3 + (k ? 0.07 : -0.07))], 0.045, col));
  }
  // gland strips where DC cables pierce the wall
  for (const s of [-1, 1]) add('dc', put(box(19.8, 0.12, 0.28, '#4b5560', { metalness: 0.6 }), -8.1, 0.3, s * 4.5));
  label('inv', [-8, 2.65, -4.2], '60 x 100 kW inverters = 6.0 MWac\n2 racks x 2 tiers x 15, wall-mounted', 'inv');
  label('inv', [-15, 0.2, 4.2], 'DC inputs (bottom) <- gland strip <- outside DC trench', 'dc');
  label('inv', [-9, 1.45, 4.15], 'Status LEDs RUN / COMM / ALARM\nHeat-sink fins on top, louvres front', 'inv');
  label('inv', [-1.5, 1.3, -3.8], 'AC output conduit -> floor trench', 'ac');
  // rack-front clearance labels done via floor decals

  /* ============================ LV AC COMBINER ============================ */
  function lvCab(i) {
    const g = new THREE.Group();
    const main = i === 2;
    g.add(put(box(0.9, 2.2, 0.9, '#b4bec8'), 0, 1.1, 0));
    g.add(put(box(0.84, 2.0, 0.02, '#dbe1e6'), 0, 1.1, 0.46));
    g.add(put(box(0.9, 0.08, 0.9, '#6a7580'), 0, 2.24, 0));
    if (main) {
      g.add(put(box(0.6, 0.55, 0.12, '#15191c'), 0, 1.45, 0.52));
      g.add(put(box(0.34, 0.1, 0.05, '#d33'), 0, 1.45, 0.6));
      g.add(put(box(0.5, 0.18, 0.02, '#0b2430', {}), 0, 0.95, 0.48));
      g.add(put(box(0.5, 0.18, 0.005, '#4fd0ff', { emissive: '#4fd0ff', emissiveIntensity: 0.6 }), 0, 0.95, 0.495));
      g.add(put(sign('MAIN ACB 5000 A / 800 V\n4-pole, 50 kA', 0.5, 0.16, { bg: '#f5f1e0', border: '#333' }), 0, 1.9, 0.475));
    } else {
      const li = [];
      for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) {
        g.add(put(box(0.13, 0.14, 0.06, '#181c20'), -0.28 + c * 0.28, 1.7 - r * 0.2, 0.5));
        g.add(put(box(0.03, 0.05, 0.03, '#e8761c'), -0.28 + c * 0.28, 1.7 - r * 0.2, 0.545));
        const l = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 6), ledMats.run); l.position.set(-0.28 + c * 0.28 + 0.1, 1.7 - r * 0.2, 0.535); g.add(l);
      }
      const rowName = i < 2 ? 'REAR' : 'FRONT', tr = i % 2 === 0 ? 1 : 2;
      g.add(put(sign(`${rowName} RACK TIER ${i < 2 ? i + 1 : 5 - i - 0}\n15 x 160 A MCCB`, 0.6, 0.18, { bg: '#f5f1e0', border: '#333' }), 0, 0.5, 0.475));
    }
    g.add(put(hvSign(0.12, 'DANGER\n800 V'), 0.32, 0.9, 0.475).translateY(0));
    g.rotation.y = -Math.PI / 2;
    g.position.set(4.1, 0, [-1.8, -0.9, 0, 0.9, 1.8][i]);
    g.userData.noRay = false;
    tag(g, {
      title: main ? 'LV main ACB cabinet' : `LV AC combiner cabinet ${i + 1}`,
      sub: main ? 'Combines 4 feeder cabinets, 5000 A ACB, feeds step-up transformer' : '15 x 160 A MCCB feeders, one per inverter, bus-tied to main ACB',
      specs: [['Voltage', '800 Vac, 3-phase, 50/60 Hz'], ['Short-circuit', 'Icu 50 kA / 1 s'], ['Entry', 'cables from cross trench below, 6.3 MVA TX'], ['Metering', 'multifunction meter, anti-islanding CT/VT']],
      layer: 'lv',
    });
    add('lv', g);
  }
  for (let i = 0; i < 5; i++) lvCab(i);
  // LV busbar trunking to transformer
  add('lv', put(box(2.2, 0.32, 0.6, '#b9c0c6', { metalness: 0.5 }), 5.65, 1.95, 0));
  add('lv', put(box(0.12, 0.34, 0.62, '#6a7580'), 4.62, 1.95, 0));
  for (const x of [5.0, 6.3]) add('lv', put(box(0.04, 0.55, 0.04, '#6a7580'), x, 2.25, 0));
  add('lv', put(sign('LV BUSBAR TRUNKING 5000 A', 0.9, 0.12, { bg: '#f5f1e0', border: '#333' }), 5.65, 1.95, 0.305));
  // LV collector cables in trench -> cabinets
  const cabZ = { 0: [-1.8, -1], 1: [-0.9, -1], 3: [0.9, 1], 4: [1.8, 1] };
  [[-1, 0, 0, -1.8], [-1, 1, 1, -0.9], [1, 0, 4, 1.8], [1, 1, 3, 0.9]].forEach(([s, t, , cz]) => {
    const zt = 3.375 * s + (t ? 0.12 : -0.12);
    add('ac', tube([V(-17.4, -0.22, zt), V(3.6, -0.22, zt), V(4.0 + 0.06 * (t * 2 - 1), -0.22, zt + 0.2 * s * -1), V(4.0 + 0.06 * (t * 2 - 1), -0.22, cz), V(4.0 + 0.06 * (t * 2 - 1), 0.5, cz)], 0.05, C.ac));
  });
  label('lv', [4.1, 2.45, 0], 'LV AC combiner: 4 x 15 MCCB feeders\n-> 5000 A main ACB, 800 V', 'lv');
  label('lv', [5.65, 2.3, 0], 'LV busbar trunking to TX', 'lv');

  /* ============================ TRANSFORMER ============================ */
  const tx = new THREE.Group();
  tx.add(put(box(2.1, 0.15, 1.9, '#2b4a75', { metalness: 0.5 }), 0, 0.075, 0));
  tx.add(put(box(0.4, 0.14, 1.9, '#59636b', { metalness: 0.8 }), 0, 1.62, 0));
  tx.add(put(box(0.4, 0.14, 1.9, '#59636b', { metalness: 0.8 }), 0, 0.22, 0));
  for (const z of [-0.62, 0, 0.62]) {
    tx.add(put(box(0.2, 1.5, 0.2, '#59636b', { metalness: 0.8 }), 0, 0.92, z));
    tx.add(put(cyl(0.27, 0.27, 1.45, '#d08a2f', { metalness: 0.6, roughness: 0.4 }, 28), 0, 0.92, z));
    tx.add(put(cyl(0.35, 0.35, 1.2, '#7a431a', { roughness: 0.55 }, 28), 0, 0.92, z));
    for (const y of [0.55, 0.92, 1.29]) tx.add(put(cyl(0.355, 0.355, 0.025, '#2c1a0c', {}, 28), 0, y, z));
    tx.add(put(cyl(0.05, 0.075, 0.28, '#d4d9de', { metalness: 0.3 }), 0, 1.84, z));
    tx.add(put(cyl(0.03, 0.03, 0.08, C.cu, { metalness: 0.9 }), 0, 2.01, z));
    tx.add(put(box(0.3, 0.06, 0.1, C.cu, { metalness: 0.9 }), -0.82, 1.12, z * 0.9)); // LV terminals
  }
  // enclosure
  const encMat = new THREE.MeshStandardMaterial({ color: '#9fb0c0', transparent: true, opacity: 0.13, depthWrite: false, side: THREE.DoubleSide });
  const enc = new THREE.Mesh(new THREE.BoxGeometry(2.1, 2.1, 2.0), encMat); enc.position.y = 1.05;
  enc.add(new THREE.LineSegments(new THREE.EdgesGeometry(enc.geometry), new THREE.LineBasicMaterial({ color: 0x6e8aa6 })));
  tx.add(enc);
  tx.add(put(sign('TRANSFORMER 6300 kVA\nCast-resin  Dyn11  AN/AF\n0.8 / 33 kV   uk = 7 %\nIP31  Class F/F', 0.9, 0.42, { bg: '#d7dde2', fg: '#111', border: '#555', title: true }), 0, 0.6, 1.012));
  tx.add(put(hvSign(0.3), 0.7, 1.35, 1.012));
  tx.add(put(box(0.18, 0.12, 0.08, '#eee'), -0.7, 1.6, 1.01));
  tx.add(put(new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 8), ledMats.run), -0.7, 1.6, 1.055));
  tx.position.set(7.7, 0, 0);
  tag(tx, {
    title: 'Step-up transformer 0.8 / 33 kV, 6.3 MVA',
    sub: 'Cast-resin (dry-type) indoor unit; oil-immersed ONAN on an outdoor bund is the common alternative',
    specs: [['Rating', '6300 kVA, 0.8 kV LV / 33 kV HV, Dyn11'], ['Impedance', '7 % (limits MV fault current & inrush)'], ['Losses', 'no-load ~5.5 kW, load ~42 kW at 100 %'], ['LV current', '4547 A at 800 V - 5000 A busbar trunking'], ['HV current', '110 A at 33 kV'], ['Protection', 'winding temp PT100 trip, MV VCB overcurrent / earth fault, Buchholz not required (dry-type)']],
    layer: 'tx',
  });
  add('tx', tx);
  // fence around TX bay
  const fm = new THREE.MeshStandardMaterial({ map: meshTex(), transparent: true, side: THREE.DoubleSide, alphaTest: 0.2, roughness: 0.7 });
  fm.map.wrapS = fm.map.wrapT = THREE.RepeatWrapping;
  const fence = (x, z, w, rot) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 1.7), fm); m.position.set(x, 0.85, z); m.rotation.y = rot; return m; };
  [fence(7.55, -1.9, 4.5, 0), fence(7.55, 1.9, 4.5, 0), fence(5.3, 0, 3.8, Math.PI / 2), fence(9.8, 0, 3.8, Math.PI / 2)].forEach((m) => add('tx', m));
  for (const [x, z] of [[5.3, -1.9], [5.3, 1.9], [9.8, -1.9], [9.8, 1.9], [7.55, 1.9], [7.55, -1.9]]) add('tx', put(cyl(0.035, 0.035, 1.75, '#e5c100'), x, 0.875, z));
  add('tx', put(sign('DANGER - HV EQUIPMENT\nAUTHORISED PERSONS ONLY\nKey-interlocked gate', 1.2, 0.4, { bg: '#e4261f', fg: '#fff', border: '#fff', title: true }), 7.55, 1.2, 1.91));
  add('tx', put(box(0.14, 0.1, 0.05, '#f2c500'), 5.3, 1.0, 1.9)); // padlock/key box
  label('tx', [7.7, 2.35, 0], 'Step-up TX 6.3 MVA 0.8/33 kV (Dyn11)\ncast-resin, in interlocked bay', 'tx');

  /* ============================ MV SWITCHGEAR ============================ */
  const cabMat = mat('#cfd6dc', {});
  const mvDefs = [
    { id: 'P1', name: 'COLLECTOR IN', desc: 'Ring-in from upstream bay (cable switch/VCB)', kind: 'vcb-in', closed: true },
    { id: 'P2', name: 'TX FEEDER', desc: 'VCB protecting 6.3 MVA transformer (50/51, 50N/51N, 49)', kind: 'vcb', closed: true },
    { id: 'P3', name: 'COLLECTOR OUT', desc: 'VCB to collector substation / next bay', kind: 'vcb-out', closed: true },
    { id: 'P4', name: 'AUX / VT', desc: 'Fused switch to 33/0.4 kV aux transformer + metering VTs', kind: 'fuse', closed: true },
    { id: 'P5', name: 'SPARE', desc: 'Future feeder bay, earthed', kind: 'spare', closed: false },
  ];
  const mvPanels = [];
  mvDefs.forEach((d, i) => {
    const g = new THREE.Group();
    const bm = new THREE.MeshStandardMaterial({ color: '#cfd6dc', roughness: 0.5, metalness: 0.25 });
    const dm = new THREE.MeshStandardMaterial({ color: '#dfe5ea', roughness: 0.45, metalness: 0.2 });
    xrayMats.push(bm, dm);
    const mb = (w, h, dd, m) => { const x = new THREE.Mesh(new THREE.BoxGeometry(w, h, dd), m); x.castShadow = true; x.receiveShadow = true; return x; };
    g.add(put(mb(0.9, 2.2, 1.0, bm), 0, 1.1, 0));
    g.add(put(mb(0.84, 0.56, 0.02, dm), 0, 1.84, 0.51));   // LV compartment door
    g.add(put(mb(0.84, 1.0, 0.02, dm), 0, 1.04, 0.51));    // breaker door
    g.add(put(mb(0.84, 0.46, 0.02, dm), 0, 0.26, 0.51));   // cable compartment door
    // relay + indicators
    g.add(put(box(0.24, 0.15, 0.015, '#0b1f27'), -0.2, 1.9, 0.525));
    g.add(put(box(0.22, 0.12, 0.004, '#58d8ff', { emissive: '#58d8ff', emissiveIntensity: 0.5 }), -0.2, 1.9, 0.534));
    g.add(put(box(0.04, 0.04, 0.02, '#888'), 0.16, 1.93, 0.53)); g.add(put(box(0.04, 0.04, 0.02, '#c22'), 0.26, 1.93, 0.53)); g.add(put(box(0.04, 0.04, 0.02, '#2a8'), 0.26, 1.82, 0.53));
    g.add(put(cyl(0.025, 0.025, 0.03, '#222', {}, 12), 0.1, 1.8, 0.535).rotateX(Math.PI / 2));
    g.add(put(sign(`${d.id}  ${d.name}`, 0.78, 0.09, { bg: '#1d2b3a', fg: '#fff', title: true }), 0, 2.13, 0.522));
    // mimic + breaker lamps
    g.add(put(mimic(d.kind, 0.44, 0.62), -0.14, 1.08, 0.525));
    const lampC = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 10), glow('#ff2a2a', d.closed ? 2.5 : 0.08)); lampC.position.set(0.28, 1.35, 0.535);
    const lampO = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 10), glow('#26e55a', d.closed ? 0.08 : 2.5)); lampO.position.set(0.28, 1.27, 0.535);
    lampC.material = lampC.material.clone(); lampO.material = lampO.material.clone();
    const lampS = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 10), glow('#ffd23a', 1.6)); lampS.position.set(0.28, 1.19, 0.535);
    g.add(lampC, lampO, lampS);
    g.add(sign('I', 0.04, 0.04, { bg: null, fg: '#d00', ppm: 300 })).children.at(-1).position.set(0.34, 1.35, 0.526);
    g.add(put(sign('O', 0.04, 0.04, { bg: null, fg: '#0a0', ppm: 300 }), 0.34, 1.27, 0.526));
    g.add(put(box(0.05, 0.22, 0.03, '#222'), 0.3, 0.95, 0.53));  // handle
    g.add(put(box(0.1, 0.05, 0.02, '#888'), 0.3, 0.8, 0.525));   // racking port
    // VPIS
    for (let k = 0; k < 3; k++) g.add(put(cyl(0.015, 0.015, 0.02, '#ff9a2a', { emissive: '#ff6a00', emissiveIntensity: d.kind === 'spare' ? 0 : 1 }, 10).rotateX(Math.PI / 2), -0.12 + k * 0.06, 0.38, 0.526));
    g.add(put(sign('VPIS', 0.16, 0.04, { bg: null, fg: '#223', ppm: 300 }), 0, 0.31, 0.526));
    g.add(put(hvSign(0.16), -0.3, 0.15, 0.525));
    g.add(put(arcSign(0.3), 0.18, 0.18, 0.525));
    // earth switch handle
    g.add(put(box(0.14, 0.03, 0.03, '#e6c100'), 0.12, 0.5, 0.53));
    g.position.set(10.6 + 0.9 * i, 0, -3.8);
    // internals (X-ray): breaker poles + CTs
    const internal = new THREE.Group();
    if (d.kind !== 'spare' && d.kind !== 'vt') for (let k = 0; k < 3; k++) {
      internal.add(put(cyl(0.055, 0.055, 0.5, '#e8e3d3', { roughness: 0.4 }, 14), -0.2 + k * 0.2, 1.04, -0.05));
      internal.add(put(cyl(0.07, 0.07, 0.12, '#444', {}, 14), -0.2 + k * 0.2, 1.38, -0.05));
      internal.add(put(box(0.04, 0.5, 0.05, C.cu, { metalness: 0.9 }), -0.2 + k * 0.2, 0.55, -0.3));
    }
    internal.visible = false; g.add(internal); out.internals.push(internal);
    tag(g, {
      title: `MV panel ${d.id} - ${d.name}`,
      sub: d.desc,
      specs: [['Type', 'Metal-clad, withdrawable VCB, IAC AFLR 25 kA / 1 s'], ['Rating', '36 kV, 1250 A, 25 kA / 3 s'], ['Insulation', 'Air-insulated (SF6-free), 70 kV 1 min / 170 kV BIL'], ['Indications', 'CLOSED (red) / OPEN (green) lamps, spring-charged (yellow), VPIS voltage presence'], ['Labels', 'DANGER 33 kV + arc-flash/shock label on every door'], ['State', d.kind === 'spare' ? 'OPEN, earthed (spare)' : 'CLOSED (in service)']],
      breaker: { closed: d.closed, lampC, lampO, kind: d.kind },
      layer: 'mv',
    });
    g.userData.breaker = g.userData.info.breaker;
    mvPanels.push(g);
    add('mv', g);
  });
  // busbar ducting on top + arc exhaust
  add('mv', put(box(4.5, 0.26, 0.62, '#b7bec5', { metalness: 0.5 }), 12.4, 2.35, -3.8));
  for (let i = 0; i < 5; i++) add('mv', put(box(0.7, 0.04, 0.5, '#8f98a1'), 10.6 + 0.9 * i, 2.49, -3.8));
  add('mv', put(box(0.45, 0.5, 0.7, '#9aa4ad', { metalness: 0.5 }), 14.9, 2.45, -4.05));
  add('mv', put(box(0.46, 0.44, 0.02, '#e4261f'), 14.9, 2.45, -3.68));
  add('mv', put(sign('ARC EXHAUST\nDUCT', 0.4, 0.14, { bg: '#f5f1e0', border: '#333' }), 14.9, 2.2, -3.69));
  add('mv', put(sign('33 kV BUSBAR DUCT  |  36 kV 1250 A', 1.6, 0.12, { bg: '#f5f1e0', border: '#333' }), 12.4, 2.4, -3.485));
  // internal 3-phase busbar (X-ray)
  const bb = new THREE.Group();
  [1.62, 1.72, 1.82].forEach((y, k) => bb.add(put(box(4.5, 0.06, 0.05, [C.cu, '#d6a24a', '#b86a2b'][k], { metalness: 0.9, roughness: 0.3 }), 12.4, y, -4.05)));
  bb.visible = false; add('mv', bb); out.internals.push(bb);
  // floor insulating mat + stand
  label('mv', [12.4, 2.8, -3.8], 'MV switchgear 36 kV metal-clad, 1250 A, 25 kA/1 s\nbusbar duct + arc exhaust', 'mv');
  label('mv', [10.6, 2.25, -3.3], 'P1 collector IN', 'mv');
  label('mv', [11.5, 2.4, -3.3], 'P2 TX VCB', 'mv');
  label('mv', [12.4, 2.25, -3.3], 'P3 collector OUT', 'mv');
  label('mv', [13.3, 2.4, -3.3], 'P4 aux / VT', 'mv');
  label('mv', [14.2, 2.25, -3.3], 'P5 spare (open)', 'mv');
  label('mv', [12.4, 0.25, -2.6], 'ARC-FLASH BOUNDARY 1.5 m + insulating mat', 'fire');

  /* ============================ MV CABLES ============================ */
  const MVc = C.mv, mvt = (pts) => add('mvc', tube(pts, 0.036, MVc, { roughness: 0.4 }));
  [-0.62, 0, 0.62].forEach((zk, j) => {
    const xd = 9.05 + 0.15 * j, zt = -4.05 + 0.12 * j, xe = 11.3 + 0.2 * j;
    mvt([V(7.7, 2.0, zk), V(7.7, 2.8, zk), V(xd, 2.8, zk), V(xd, 0.1, zk), V(xd, -0.22, zk), V(xd, -0.22, zt), V(xe, -0.22, zt), V(xe, 0.5, zt)]);
    mvt([V(10.6 - 0.2 + 0.2 * j, 0.5, -3.5 - 0.07 * j), V(10.6 - 0.2 + 0.2 * j, -0.22, -3.5 - 0.07 * j), V(15, -0.22, -3.5 - 0.07 * j), V(22, -0.22, -3.5 - 0.07 * j), V(25, -0.22, -3.5 - 0.07 * j)]);
    mvt([V(12.4 - 0.2 + 0.2 * j, 0.5, -4.14 - 0.07 * j), V(12.4 - 0.2 + 0.2 * j, -0.22, -4.14 - 0.07 * j), V(15, -0.22, -4.14 - 0.07 * j), V(22, -0.22, -4.14 - 0.07 * j), V(25, -0.22, -4.14 - 0.07 * j)]);
  });
  label('mvc', [8.9, 2.85, 0.4], 'MV cables TX HV -> MV panel P2\n(3 x 1c 95 mm2 Al XLPE, 33 kV)', 'mv');
  label('mvc', [24.5, 0, -3.5], '33 kV IN (from upstream bay)', 'mv');
  label('mvc', [24.5, 0, -4.2], '33 kV OUT -> collector substation\n(~15 circuits x 8 bays at 600 MWp)', 'mv');
  label('mvc', [17.2, 1.25, -3.9], 'Wall penetration, fire-stopped\n+ sealed cable transit', 'mv');
  add('mvc', put(box(0.25, 0.6, 1.05, '#555e66', { metalness: 0.6 }), 16.0, 0.0, -3.85));

  /* ============================ HVAC / VENTILATION ============================ */
  const fans = [];
  [-15, -10, -5, 0, 7.7, 12.5].forEach((x) => {
    const f = new THREE.Group();
    f.add(put(cyl(0.5, 0.55, 0.45, '#a8b2bb', { metalness: 0.6 }, 28), 0, 0.22, 0));
    const hub = new THREE.Group();
    for (let k = 0; k < 5; k++) { const b = box(0.4, 0.015, 0.1, '#394149'); b.position.set(0.2, 0, 0); const pv = new THREE.Group(); pv.rotation.y = k * Math.PI * 2 / 5; pv.add(b); b.rotation.x = 0.35; hub.add(pv); }
    hub.position.y = 0.46; f.add(hub);
    f.add(put(cyl(0.52, 0.52, 0.03, '#1a1f23', {}, 28), 0, 0.47, 0));
    f.position.set(x, 4.75, 0);
    f.userData.hub = hub;
    fans.push(hub);
    add('hvac', f);
    // roof curb duct inside
    add('hvac', put(box(0.9, 0.2, 0.9, '#c3cad1', { metalness: 0.5 }), x, 4.3, 0));
  });
  anim.push((t, dt) => fans.forEach((h) => { h.rotation.y += dt * 9; }));
  add('hvac', put(box(31, 0.34, 0.5, '#c3cad1', { metalness: 0.5, roughness: 0.4 }), -1.5, 4.1, 0));
  for (let x = -16; x <= 14; x += 3) add('hvac', put(box(0.55, 0.05, 0.55, '#e3e8ec'), x, 3.9, 0));
  // louvres on rear wall + west wall (outside faces)
  const louver = (w, h) => {
    const g = new THREE.Group();
    g.add(put(box(w, h, 0.06, '#7b858e', { metalness: 0.6 }), 0, 0, 0));
    const sl = []; for (let y = -h / 2 + 0.08; y < h / 2 - 0.04; y += 0.07) sl.push([0, y, 0.035, w - 0.1, 0.02, 0.06]);
    g.add(mergedBoxes(sl, '#aeb7bf', { metalness: 0.5 })); return g;
  };
  [-15, -8, -3, 2, 12].forEach((x) => { const l = louver(1.2, 0.7); l.rotation.y = Math.PI; add('hvac', put(l, x, 3.5, -4.64)); });
  [-15, -8, -3].forEach((x) => add('hvac', put(louver(1.2, 0.7), x, 0.5, 4.64)));
  // split A/C in MV room + condensers outside
  [[15.75, 3.0, -1.2], [15.75, 3.0, 2.0]].forEach(([x, y, z]) => {
    const u = new THREE.Group();
    u.add(box(0.28, 0.3, 0.95, '#f2f4f5', { roughness: 0.3 }));
    u.add(put(box(0.02, 0.06, 0.8, '#2a2f33'), -0.15, -0.08, 0));
    u.add(put(sign('', 0.1, 0.03, { bg: '#2a7' }), -0.15, 0.08, 0.3).rotateY(-Math.PI / 2));
    add('hvac', put(u, x, y, z));
    add('hvac', put(box(0.4, 0.75, 0.9, '#c9d0d6', { metalness: 0.4 }), 16.7, 0.4, z));
    add('hvac', put(cyl(0.3, 0.3, 0.03, '#222', {}, 24).rotateZ(Math.PI / 2), 16.92, 0.45, z));
    add('hvac', tube([V(15.85, 2.9, z + 0.3), V(16.3, 2.5, z + 0.3), V(16.5, 0.6, z + 0.3)], 0.014, '#b7792e'));
  });
  label('hvac', [-1, 4.0, 0], 'Ceiling supply duct + diffusers\n(forced ventilation, filtered)', 'hvac');
  label('hvac', [7.7, 5.5, 0], 'Roof exhaust fans, thermostat / VSD controlled\n~7.5 m3/s removes ~135 kW heat at dT 15 K', 'hvac');
  label('hvac', [-8, 3.6, -4.7], 'Intake louvres (low) / relief louvres (high)', 'hvac');
  label('hvac', [16.7, 1.1, 0.4], 'Split A/C + condenser\nfor MV room (dust-sealed, N+1)', 'hvac');

  /* ============================ FIRE / SAFETY ============================ */
  const extinguisher = (x, z, rot = 0, y = 0.28) => {
    const g = new THREE.Group();
    g.add(put(cyl(0.075, 0.075, 0.45, '#c0141c', { metalness: 0.3 }, 16), 0, 0.22, 0));
    g.add(put(cyl(0.03, 0.04, 0.1, '#222', {}, 10), 0, 0.5, 0));
    g.add(put(box(0.07, 0.025, 0.03, '#222'), 0.04, 0.55, 0));
    g.add(put(sign('CO2', 0.13, 0.08, { bg: '#fff', fg: '#111' }), 0, 0.22, 0.078));
    g.rotation.y = rot; g.position.set(x, y, z);
    return g;
  };
  [[-18.2, -4.25, 0], [3.0, -4.25, 0], [15.7, 3.7, -Math.PI / 2], [15.7, -2.2, -Math.PI / 2]].forEach(([x, z, r], i) => {
    add('fire', extinguisher(x, z, r, 0.9));
    add('fire', put(sign('FIRE\nEXTINGUISHER', 0.28, 0.28, { bg: '#d22', fg: '#fff', border: '#fff' }), x + (r ? -0.1 : 0), 1.8, z + (r ? 0 : 0.03)));
  });
  // clean-agent suppression, MV room
  [[15.3, -1.7], [15.3, -2.3]].forEach(([x, z]) => {
    add('fire', put(cyl(0.12, 0.12, 1.2, '#b7101a', { metalness: 0.4 }), x, 0.6, z));
    add('fire', put(cyl(0.04, 0.04, 0.16, '#d4b100', {}, 10), x, 1.28, z));
  });
  const pipe = [V(15.3, 1.3, -2.0), V(15.3, 4.05, -2.0), V(15.3, 4.05, -3.2), V(10.2, 4.05, -3.2)];
  add('fire', tube(pipe, 0.025, '#b7101a'));
  add('fire', tube([V(13, 4.05, -3.2), V(13, 4.05, -1.8)], 0.02, '#b7101a'));
  [11, 12.5, 14].forEach((x) => { add('fire', put(cyl(0.01, 0.045, 0.1, '#d4b100', {}, 10), x, 3.97, -3.2)); });
  add('fire', put(box(0.28, 0.36, 0.1, '#b7101a'), 15.78, 1.35, -0.4).rotateY(0));
  add('fire', put(sign('CLEAN AGENT\nRELEASE PANEL\nABORT | HOLD', 0.28, 0.2, { bg: '#fff', fg: '#900', border: '#900' }), 15.72, 1.4, -0.4).rotateY(-Math.PI / 2));
  // smoke detectors, call points, strobes, exit signs, emergency light
  const det = [];
  for (let x = -16; x <= 14; x += 3) for (const z of [-2.5, 2.5]) {
    add('fire', put(cyl(0.06, 0.06, 0.04, '#f2f4f5', {}, 16), x, 4.42, z));
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.01, 6, 6), glow('#ff2a2a', 2)); l.position.set(x + 0.04, 4.395, z); add('fire', l); det.push(l);
  }
  anim.push((t) => det.forEach((l, i) => { l.material.emissiveIntensity = (Math.sin(t * 3 + i) > 0.9) ? 3 : 0.1; }));
  add('fire', put(box(0.1, 0.1, 0.05, '#d11'), -18.42, 1.4, 1.3).rotateY(0)); // call point
  add('fire', put(box(0.1, 0.1, 0.05, '#d11'), 15.82, 1.4, 1.0));
  add('fire', put(sign('EXIT', 0.5, 0.18, { bg: '#0a8a3a', fg: '#fff', title: true }), -18.48, 2.55, 0).rotateY(Math.PI / 2));
  add('fire', put(sign('EXIT', 0.5, 0.18, { bg: '#0a8a3a', fg: '#fff', title: true }), 15.88, 2.45, 2.6).rotateY(-Math.PI / 2));
  [[-17, 4.1], [1, 4.1], [7.7, 3.4], [13, 4.1]].forEach(([x, y], i) => {
    add('fire', put(box(0.3, 0.1, 0.12, '#f4f4f4'), x, y, i % 2 ? -4.1 : 4.1));
    add('fire', put(box(0.04, 0.04, 0.02, '#ffe8a0', { emissive: '#ffe8a0', emissiveIntensity: 1.2 }), x - 0.08, y, i % 2 ? -4.03 : 4.03));
  });
  // PPE / safety cabinet + first aid
  add('fire', put(box(0.9, 1.9, 0.4, '#e6c100'), 15.65, 0.95, -0.3 + 2.0 * 0));
  add('fire', put(sign('ARC-FLASH PPE\nHV GLOVES / HOT STICK\nEARTHING KIT', 0.7, 0.4, { bg: '#fff', fg: '#111', border: '#c00', title: true }), 15.44, 1.3, -0.3).rotateY(-Math.PI / 2));
  add('fire', put(box(0.28, 0.28, 0.1, '#0a8a3a'), -18.4, 1.3, -2.6));
  add('fire', put(sign('+', 0.2, 0.2, { bg: '#fff', fg: '#0a8a3a', border: '#0a8a3a' }), -18.345, 1.3, -2.6).rotateY(Math.PI / 2));
  // perimeter earth bar (green/yellow)
  add('fire', tube([V(-18.4, 0.18, -4.3), V(15.8, 0.18, -4.3), V(15.8, 0.18, 4.3)], 0.012, '#a6c21a'));
  add('fire', tube([V(-18.4, 0.18, -4.3), V(-18.4, 0.18, 4.3), V(3.5, 0.18, 4.3)], 0.012, '#a6c21a'));
  label('fire', [15.3, 1.5, -2.0], 'Clean-agent suppression (MV room):\ncylinders, ceiling nozzles, release panel', 'fire');
  label('fire', [3.0, 1.9, -4.25], 'CO2 extinguisher + signage', 'fire');
  label('fire', [-4, 4.45, 2.5], 'Addressable smoke detection (VESDA option)', 'fire');
  label('fire', [15.4, 2.2, -0.3], 'Arc-flash PPE, hot stick, earthing kit', 'fire');
  label('fire', [-18.3, 2.8, 0], 'Exit + emergency lighting + call point', 'fire');
  label('fire', [-18.1, 0.3, -3.8], 'Perimeter earth bar (grounding ring)', 'fire');

  /* ============================ LIGHTING ============================ */
  const batt = [];
  for (let x = -17; x <= 14; x += 2.5) for (const z of [-2.1, 2.1]) batt.push([x, 4.2, z, 1.2, 0.05, 0.12]);
  add('light', mergedBoxes(batt, '#fffbe8', { emissive: '#fff4c8', emissiveIntensity: 1.8, roughness: 0.3 }));
  [-15, -9, -3, 2, 7.7, 12.5].forEach((x) => { const l = new THREE.PointLight('#fff2d6', 9, 18, 1.6); l.position.set(x, 3.9, 0); add('light', l); });
  label('light', [-17, 4.3, -2.1], 'LED battens 300 lux, with emergency inverter', 'light');

  /* ============================ FLOOR MARKINGS ============================ */
  const decal = (x0, x1, z0, z1, mapOrColor, o = {}) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), mapOrColor.isTexture ? new THREE.MeshStandardMaterial({ map: mapOrColor, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3, transparent: !!o.alpha }) : new THREE.MeshStandardMaterial({ color: mapOrColor, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
    m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, o.y ?? 0.006, (z0 + z1) / 2); m.receiveShadow = true;
    return m;
  };
  const stripe = stripeTex();
  const strip = (x0, x1, z0, z1) => {
    const t = stripe.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(Math.max(1, (x1 - x0) * 3), Math.max(1, (z1 - z0) * 3));
    return decal(x0, x1, z0, z1, t);
  };
  // yellow aisle edge lines in front of inverter racks (keep-clear 1 m beyond rack)
  for (const z of [-2.95, 2.95]) add('marks', decal(-18, 3.4, z - 0.04, z + 0.04, '#f2c500'));
  // hazard strips: TX bay border
  add('marks', strip(5.15, 9.95, -2.05, -1.95)); add('marks', strip(5.15, 9.95, 1.95, 2.05));
  add('marks', strip(5.15, 5.25, -2.05, 2.05)); add('marks', strip(9.85, 9.95, -2.05, 2.05));
  // clearance in front of LV combiner
  add('marks', decal(2.55, 3.65, -2.3, -2.2, '#f2c500')); add('marks', decal(2.55, 3.65, 2.2, 2.3, '#f2c500')); add('marks', decal(2.5, 2.6, -2.3, 2.3, '#f2c500'));
  // MV arc-flash boundary (red) + insulating mat (black ribbed)
  for (const [a, b, c, d] of [[9.9, 14.85, -1.84, -1.76], [9.9, 14.85, -3.3, -3.22], [9.9, 10.0, -3.3, -1.76], [14.75, 14.85, -3.3, -1.76]]) add('marks', decal(a, b, c, d, '#d71f26'));
  add('marks', decal(10.2, 14.6, -3.28, -2.45, '#16191c', { y: 0.008 }));
  add('marks', decal(10.4, 14.4, -3.1, -2.95, '#2a2f33', { y: 0.009 }));
  // text decals
  const flat = (text, w, h, x, z, o) => { const s = sign(text, w, h, o); s.rotation.x = -Math.PI / 2; s.position.set(x, 0.011, z); return s; };
  add('marks', flat('ARC-FLASH BOUNDARY 1.5 m\nCAT 4 PPE REQUIRED', 3.6, 0.55, 12.4, -2.1, { bg: null, fg: '#d71f26', title: true }));
  add('marks', flat('INSULATING MAT  IEC 61111 CL.4', 3.0, 0.3, 12.4, -2.75, { bg: null, fg: '#cfd5da' }));
  add('marks', flat('TX BAY  -  33 kV\nKEEP OUT', 3.2, 0.7, 7.55, 2.3, { bg: null, fg: '#f2c500', title: true }));
  add('marks', flat('KEEP CLEAR 1.0 m', 2.0, 0.3, 3.0, 0, { bg: null, fg: '#f2c500' }));
  add('marks', flat('INVERTER HALL  -  60 x 100 kW = 6.0 MWac', 10, 0.5, -8, 1.6, { bg: null, fg: '#fff3a8', title: true }));
  add('marks', flat('MV SWITCHGEAR ROOM', 3.6, 0.5, 12.4, 1.2, { bg: null, fg: '#e8eef2', title: true }));
  // green escape route with chevrons
  const esc = canvasTex('esc', 512, 64, (c) => { c.fillStyle = '#0a8a3a'; c.fillRect(0, 0, 512, 64); c.fillStyle = '#fff'; for (let i = 0; i < 8; i++) { c.beginPath(); c.moveTo(i * 64 + 8, 8); c.lineTo(i * 64 + 40, 32); c.lineTo(i * 64 + 8, 56); c.lineTo(i * 64 + 20, 56); c.lineTo(i * 64 + 52, 32); c.lineTo(i * 64 + 20, 8); c.fill(); } });
  add('marks', decal(-17.9, -3.4, 0.35, 0.8, esc));
  // arc flash warning sign on rear wall near MV + wall signs
  add('marks', put(sign('MV SWITCHGEAR ROOM\nAuthorised persons only\nPermit-to-work required', 1.5, 0.6, { bg: '#e4261f', fg: '#fff', title: true, border: '#fff' }), 9.8, 1.9, -4.38));
  add('marks', put(sign('INVERTER HALL\nDC live when illuminated\nIsolate DC before touching', 1.5, 0.6, { bg: '#f2c500', fg: '#111', title: true, border: '#111' }), -6, 3.3, -4.38));
  label('marks', [12.4, 0.02, -2.1], 'Arc-flash boundary + hazard striping', 'fire');

  return out;
}
