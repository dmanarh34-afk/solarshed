import { THREE, mat, glow, box, cyl, put, tube, mergedBoxes, ladder, sign, hvSign, arcSign, mimic, stripeTex, meshTex, canvasTex } from './helpers.js';
import { shellMats, xrayMats } from './build.js';

/* ---------------------------------------------------------------
   633 kWp DC / 6 x 100 kW AC compact inverter shed (metres).
   Shed inner x -7.9..11.9, z -2.9..2.9, height 3.8.
   Everything is on the back wall, west -> east:
   inverter rack | (7th slot) | LV combiner + ACB | TX bay | 11 kV RMU
---------------------------------------------------------------- */
const XI = Array.from({ length: 6 }, (_, i) => -6.9 + 1.3 * i);
const BY = 0.8; // inverter bottom
const C = { dc: '#d0262e', dcneg: '#1d2124', ac: '#e0a02e', mv: '#c8232c', cond: '#98a2ab', cu: '#c87533' };

export function buildCompact(ctx) {
  const { add, label, tag, anim } = ctx;
  const out = { frontWall: null, internals: [], leds: [] };
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  /* ---------- shell ---------- */
  const ghost = (c) => { const m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide }); shellMats.push(m); return m; };
  const edgeMat = new THREE.LineBasicMaterial({ color: 0x8a9aaa });
  const wall = (w, h, d, x, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), ghost('#cfd6dd')); put(m, x, h / 2, z); m.add(new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), edgeMat)); return m; };
  const front = wall(20.2, 3.8, 0.2, 2, 3);
  out.frontWall = front;
  add('shell', wall(20.2, 3.8, 0.2, 2, -3)); add('shell', front);
  add('shell', wall(0.2, 3.8, 6, -8, 0)); add('shell', wall(0.2, 3.8, 6, 12, 0));
  add('shell', put(box(0.07, 2.1, 0.9, '#6f808e', { metalness: 0.5 }), -7.96, 1.05, 1.5));
  add('shell', put(box(0.04, 0.05, 0.4, '#c9ced3', { metalness: 0.8 }), -7.9, 1.0, 1.2));
  add('shell', put(box(0.07, 2.1, 0.9, '#6f808e', { metalness: 0.5 }), 11.96, 1.05, 1.6));
  label('shell', [-8.2, 2.4, 1.5], 'Exit door (outward, panic bar)\n+ 2nd exit east wall', 'shell');
  const roof = new THREE.Mesh(new THREE.BoxGeometry(20.8, 0.2, 6.8), ghost('#aab4be')); put(roof, 2, 3.9, 0); add('roof', roof);
  for (let x = -7; x <= 11; x += 2) add('roof', put(box(0.1, 0.25, 6.3, '#5f6d79', { metalness: 0.6 }), x, 3.65, 0));
  label('roof', [2, 4.3, 0], 'Roof ghosted. NO PV modules on roof, walls or yard', 'shell');

  /* ---------- slab + trenches ---------- */
  const yard = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), new THREE.MeshStandardMaterial({ color: '#4a4e52', roughness: 1 }));
  yard.rotation.x = -Math.PI / 2; yard.position.y = -0.41; yard.receiveShadow = true; add('slab', yard);
  const shape = new THREE.Shape(); const S = (x, z) => new THREE.Vector2(x, -z);
  shape.setFromPoints([S(-8.3, -3.3), S(12.3, -3.3), S(12.3, 3.3), S(-8.3, 3.3)]);
  const hole = (pts) => { const p = new THREE.Path(); p.setFromPoints(pts.map(([x, z]) => S(x, z))); return p; };
  shape.holes.push(hole([[-7.6, -2.25], [2.0, -2.25], [2.0, -2.8], [3.9, -2.8], [3.9, -1.75], [-7.6, -1.75]])); // LV trench
  shape.holes.push(hole([[7.9, -1.2], [8.5, -1.2], [8.5, -2.2], [11.9, -2.2], [11.9, -2.8], [7.9, -2.8]]));      // MV trench
  const sg = new THREE.ExtrudeGeometry(shape, { depth: 0.4, bevelEnabled: false }); sg.rotateX(-Math.PI / 2); sg.translate(0, -0.4, 0);
  const slab = new THREE.Mesh(sg, mat('#6f757c', { roughness: 0.95, metalness: 0 })); slab.receiveShadow = true; slab.castShadow = true; add('slab', slab);
  const trough = (x0, x1, z0, z1, h = 0.36) => {
    const w = x1 - x0, d = z1 - z0, g = new THREE.Group(), m = '#8d9399';
    g.add(put(box(w, 0.04, d, m, { roughness: 0.95 }), (x0 + x1) / 2, -0.39, (z0 + z1) / 2));
    if (w >= d) { for (const z of [z0 + 0.03, z1 - 0.03]) g.add(put(box(w, h, 0.06, m, { roughness: 0.95 }), (x0 + x1) / 2, -0.4 + h / 2, z)); }
    else for (const x of [x0 + 0.03, x1 - 0.03]) g.add(put(box(0.06, h, d, m, { roughness: 0.95 }), x, -0.4 + h / 2, (z0 + z1) / 2));
    return g;
  };
  add('slab', trough(-9, 0.4, -3.7, -3.2)); add('slab', trough(-9, -8.6, -12, -3.7)); add('slab', put(ladder(9.4, 0.3), -4.3, -0.3, -3.45));
  add('slab', trough(11.9, 20, -2.8, -2.2));
  add('slab', put(ladder(9.6, 0.4), -2.9, -0.3, -2.0)); add('slab', put(ladder(4.0, 0.5), 9.9, -0.3, -2.5));
  // grating covers (partial)
  const grate = canvasTex('grate', 64, 64, (c) => { c.fillStyle = '#4a5057'; c.fillRect(0, 0, 64, 64); c.strokeStyle = '#8f9aa4'; c.lineWidth = 3; for (let i = 4; i < 64; i += 8) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, 64); c.stroke(); } });
  const gm = new THREE.MeshStandardMaterial({ map: grate, metalness: 0.6, roughness: 0.5 });
  const cg = new THREE.Group();
  const plate = (x, z, w, d) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.025, d), gm); m.position.set(x, 0.013, z); m.receiveShadow = true; cg.add(m); };
  for (let i = 0; i < 8; i++) if (i % 3 !== 1) plate(-7.0 + i * 1.3, -2.0, 1.25, 0.5);
  for (let i = 0; i < 3; i++) if (i !== 1) plate(8.2, -1.3 - i * 0.0, 0.6, 0.1);
  for (let i = 0; i < 3; i++) if (i !== 1) plate(9.4 + i * 1.0, -2.5, 0.95, 0.55);
  add('covers', cg);
  label('slab', [-8.8, 0.4, -9], 'DC trench from PV array\n(1000-1500 Vdc homeruns)', 'dc');
  label('slab', [-3.5, 0, -2.0], 'Grated LV cable trench + ladder tray\n(inverter AC collection)', 'ac');
  label('slab', [10.0, 0, -2.5], 'MV cable trench\n(11 kV)', 'mv');

  /* ---------- inverters ---------- */
  const finGeo = [], louvGeo = [], dcPlus = [], dcMinus = [];
  for (let k = 0; k < 14; k++) finGeo.push([-0.36 + k * 0.055, 0.375, 0.0, 0.018, 0.055, 0.3]);
  for (let k = 0; k < 6; k++) louvGeo.push([0.27, 0.12 - k * 0.04, 0.186, 0.28, 0.012, 0.004]);
  for (let k = 0; k < 6; k++) { dcPlus.push([-0.38 + k * 0.062, -0.38, 0, 0.022, 0.06, 0.022]); dcMinus.push([-0.38 + k * 0.062 + 0.03, -0.38, 0, 0.022, 0.06, 0.022]); }
  const nameplate = sign('SUN-100K\n100 kW  3P 400 Vac', 0.32, 0.11, { bg: '#c9d0d6', fg: '#1b2227', border: '#59636b' });
  const led = { run: glow('#27ff6a', 2), comm: glow('#3aa0ff', 2) };

  function inverter(i) {
    const cy = BY + 0.35, zc = -2.66;
    const g = new THREE.Group();
    g.add(put(box(0.9, 0.6, 0.02, '#3b4249', { metalness: 0.6 }), 0, 0, -0.19));
    g.add(put(box(1.0, 0.7, 0.36, '#c3cad0', { roughness: 0.4, metalness: 0.2 }), 0, 0, 0));
    g.add(put(box(0.96, 0.66, 0.008, '#dfe4e7', { roughness: 0.35 }), 0, 0, 0.184));
    g.add(mergedBoxes(finGeo, '#4a5259', { metalness: 0.7, roughness: 0.35 }));
    g.add(mergedBoxes(louvGeo, '#2c3237', { roughness: 0.5 }));
    g.add(put(box(0.3, 0.17, 0.006, '#202529'), 0.27, 0.07, 0.186));
    const np = nameplate.clone(); np.position.set(-0.22, -0.2, 0.19); g.add(np);
    [[-0.4, led.run], [-0.34, led.comm], [-0.28, glow('#3a2a08', 0.1)]].forEach(([x, m]) => { const l = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 8), m); l.position.set(x, 0.27, 0.192); g.add(l); });
    // DC disconnect (rotary switch)
    g.add(put(box(0.14, 0.14, 0.05, '#2a2f33'), 0.3, -0.2, 0.2));
    g.add(put(cyl(0.04, 0.04, 0.03, '#f2c500', {}, 16).rotateX(Math.PI / 2), 0.3, -0.2, 0.235));
    g.add(put(box(0.09, 0.02, 0.02, '#d11'), 0.3, -0.2, 0.255));
    g.add(put(mergedBoxes(dcPlus, C.dc, { roughness: 0.5 }), 0, 0, 0)); g.add(put(mergedBoxes(dcMinus, '#15181a', { roughness: 0.5 }), 0, 0, 0));
    g.add(put(cyl(0.04, 0.04, 0.07, '#8c969f', { metalness: 0.7 }), -0.46, -0.385, 0)); // AC gland
    g.position.set(XI[i], cy, zc); g.updateMatrixWorld(true);
    const W = (lx, wy, lz) => g.localToWorld(V(lx, wy - cy, lz));
    for (let k = 0; k < 2; k++) {
      const gx = -0.64 + k * 0.03, px = -0.3 + k * 0.03;
      add('dc', tube([W(gx, -0.3, -0.79), W(gx, 0.3, -0.62), W(gx, 0.3, -0.27), W(gx, 0.3, -0.22), W(gx, BY - 0.14, -0.22), W(px, BY - 0.1, -0.05), W(px, BY - 0.04, 0)], 0.011, k ? C.dcneg : C.dc));
    }
    add('dc', put(cyl(0.05, 0.05, 0.32, '#d6a33a', { metalness: 0.3 }, 14).rotateX(Math.PI / 2), XI[i] - 0.625, 0.3, -3.0)); // wall sleeve
    const ax = -0.76;
    add('ac', tube([W(-0.46, BY - 0.05, 0), W(-0.46, BY - 0.14, -0.1), W(ax, BY - 0.17, -0.14), W(ax, 0.12, -0.14), W(ax, -0.04, 0.3), W(ax, -0.2, 0.66)], 0.028, C.cond, { metalness: 0.5 }));
    out.leds.push({ comm: led.comm, phase: Math.random() * 6 });
    tag(g, {
      title: `INV-${i + 1}`, sub: '100 kW string inverter, Unistrut-rack mounted',
      specs: [['Rating', '100 kWac / 110 kVA, 3-phase'], ['AC output', '400 Vac, 144 A, 50/60 Hz'], ['DC input', 'max 1100-1500 Vdc, 10-12 strings, MC4'], ['DC disconnect', 'integrated rotary isolator on front (yellow/red)'], ['Entry', 'DC via wall sleeve from outside trench; bottom cable glands'], ['Clearance', 'min 0.3 m sides, 0.5 m above, 1.0 m front aisle'], ['Status LEDs', 'RUN green / COMM blue (blinks) / ALARM off']],
    });
    add('inv', g);
  }
  XI.forEach((_, i) => inverter(i));
  // heavy-duty Unistrut rack: rails, end posts, braces, base plates
  for (const y of [BY + 0.12, BY + 0.58]) add('inv', put(box(9.6, 0.05, 0.045, '#7a8590', { metalness: 0.7 }), -3.2, y, -2.875));
  for (const x of [-7.82, 1.5]) {
    add('inv', put(box(0.06, 2.0, 0.06, '#7a8590', { metalness: 0.7 }), x, 1.0, -2.8));
    add('inv', put(box(0.2, 0.02, 0.2, '#59636b', { metalness: 0.7 }), x, 0.01, -2.75));
  }
  add('inv', put(box(0.04, 0.9, 0.03, '#7a8590', { metalness: 0.7 }), 1.5, 1.45, -2.82).rotateZ(0.5));
  // 7th slot outline
  const slotM = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.0, 0.7, 0.36)), new THREE.LineBasicMaterial({ color: 0xffb020 }));
  slotM.position.set(0.9, BY + 0.35, -2.66); add('inv', slotM);
  // DC trunk in outside trough
  for (const [k, c] of [[0, C.dc], [1, C.dcneg]]) add('dc', tube([V(-8.8, -0.25, -12), V(-8.8, -0.25, -3.45 + (k ? 0.07 : -0.07)), V(-8.3, -0.25, -3.45 + (k ? 0.07 : -0.07)), V(0, -0.25, -3.45 + (k ? 0.07 : -0.07))], 0.04, c));
  add('dc', put(box(9.2, 0.1, 0.28, '#4b5560', { metalness: 0.6 }), -3.3, 0.3, -3.0)); // sleeve plate
  label('inv', [-3.4, 2.2, -2.5], '6 x 100 kW string inverters on Unistrut rack\n= 600 kWac for 633 kWp DC (ratio 1.055)', 'inv');
  label('inv', [0.9, 1.9, -2.5], '7th unit slot (optional redundancy:\n7 x 100 kW = 700 kW, 0.90 loading)', 'inv');
  label('inv', [-5.6, 0.25, -2.4], 'DC feeders via wall sleeves from outside trench;\nbottom cable glands', 'dc');
  label('inv', [-6.3, 1.65, -2.5], 'Status LEDs + DC disconnect (yellow/red rotary)', 'inv');

  /* ---------- LV combiner + ACB ---------- */
  const lvTop = (g) => g.add(put(box(0.9, 0.06, 0.8, '#6a7580'), 0, 2.03, 0));
  function lvCab(kind) {
    const g = new THREE.Group();
    g.add(put(box(0.9, 2.0, 0.8, '#b4bec8'), 0, 1.0, 0)); g.add(put(box(0.84, 1.9, 0.02, '#dbe1e6'), 0, 1.0, 0.41)); lvTop(g);
    if (kind === 'comb') {
      for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) {
        g.add(put(box(0.18, 0.15, 0.06, '#181c20'), -0.17 + c * 0.34, 1.62 - r * 0.22, 0.44));
        g.add(put(box(0.03, 0.05, 0.03, '#e8761c'), -0.17 + c * 0.34, 1.62 - r * 0.22, 0.485));
        const l = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 6), led.run); l.position.set(-0.17 + c * 0.34 + 0.11, 1.62 - r * 0.22, 0.475); g.add(l);
      }
      g.add(put(box(0.5, 0.14, 0.04, '#0b2430'), 0, 0.95, 0.43)); g.add(put(box(0.46, 0.1, 0.005, '#4fd0ff', { emissive: '#4fd0ff', emissiveIntensity: 0.6 }), 0, 0.95, 0.452));
      g.add(put(box(0.5, 0.16, 0.05, '#2e7d32'), 0, 0.68, 0.43));
      g.add(put(sign('AC COMBINER\n6 x 160 A MCCB\nSPD T2 | METER', 0.6, 0.26, { bg: '#f5f1e0', border: '#333', title: true }), 0, 0.3, 0.425));
    } else {
      g.add(put(box(0.6, 0.55, 0.12, '#15191c'), 0, 1.4, 0.45)); g.add(put(box(0.34, 0.1, 0.05, '#d33'), 0, 1.4, 0.52));
      g.add(put(box(0.5, 0.16, 0.02, '#0b2430'), 0, 0.95, 0.43)); g.add(put(box(0.46, 0.12, 0.005, '#4fd0ff', { emissive: '#4fd0ff', emissiveIntensity: 0.6 }), 0, 0.95, 0.443));
      g.add(put(sign('MAIN ACB 1250 A / 400 V\n4-pole, 50 kA', 0.55, 0.2, { bg: '#f5f1e0', border: '#333', title: true }), 0, 0.5, 0.425));
    }
    g.add(put(hvSign(0.12, 'DANGER\n400 V'), 0.32, 0.2, 0.425));
    g.position.set(kind === 'comb' ? 2.45 : 3.35, 0, -2.4);
    tag(g, {
      title: kind === 'comb' ? 'LV AC combiner / distribution panel' : 'LV main ACB panel',
      sub: kind === 'comb' ? 'Collects 6 inverter AC feeders with MCCB protection, SPD and metering' : 'Main air circuit breaker to the step-up transformer',
      specs: kind === 'comb' ? [['Feeders', '6 x 160 A MCCB (one per inverter, 7th spare way)'], ['Surge protection', 'AC SPD type 2, 40 kA'], ['Metering', 'multifunction meter + CTs'], ['Voltage', '400 Vac, 3P+N, Icu 36 kA'], ['Entry', 'cables from floor trench below']] : [['Rating', '1250 A ACB, 4P, Icu 50 kA'], ['Load', '600 kW = 866 A at 400 V, pf 1'], ['Protection', 'LSIG trip unit, shunt trip from MV relay'], ['Output', 'busbar trunking to transformer LV terminals']],
      layer: 'lv',
    });
    add('lv', g);
  }
  lvCab('comb'); lvCab('main');
  add('lv', put(box(1.5, 0.3, 0.45, '#b9c0c6', { metalness: 0.5 }), 4.55, 1.95, -2.2));
  add('lv', put(sign('LV BUSBAR TRUNKING 1250 A', 0.9, 0.1, { bg: '#f5f1e0', border: '#333' }), 4.55, 1.95, -1.97));
  for (let k = 0; k < 3; k++) {
    add('ac', tube([V(-7.3, -0.22, -2.08 + 0.08 * k), V(2.0, -0.22, -2.08 + 0.08 * k), V(2.3 + 0.1 * k, -0.22, -2.3 - 0.08 * k), V(2.3 + 0.1 * k, 0.6, -2.3 - 0.08 * k)], 0.04, C.ac));
  }
  label('lv', [2.9, 2.5, -2.4], 'LV AC combiner (6 x MCCB, SPD, meter)\n+ 1250 A main ACB', 'lv');
  label('lv', [4.55, 2.4, -2.2], 'LV busbar trunking to TX', 'lv');

  /* ---------- transformer ---------- */
  const tx = new THREE.Group();
  tx.add(put(box(1.8, 0.12, 1.5, '#2b4a75', { metalness: 0.5 }), 0, 0.06, 0));
  for (const y of [0.18, 1.45]) tx.add(put(box(0.3, 0.11, 1.5, '#59636b', { metalness: 0.8 }), 0, y, 0));
  for (const z of [-0.4, 0, 0.4]) {
    tx.add(put(box(0.14, 1.3, 0.14, '#59636b', { metalness: 0.8 }), 0, 0.82, z));
    tx.add(put(cyl(0.2, 0.2, 1.3, '#d08a2f', { metalness: 0.6, roughness: 0.4 }, 24), 0, 0.82, z));
    tx.add(put(cyl(0.26, 0.26, 1.05, '#7a431a', { roughness: 0.55 }, 24), 0, 0.82, z));
    for (const y of [0.55, 0.82, 1.09]) tx.add(put(cyl(0.265, 0.265, 0.02, '#2c1a0c', {}, 24), 0, y, z));
    tx.add(put(cyl(0.04, 0.06, 0.24, '#d4d9de', { metalness: 0.3 }), 0, 1.62, z));
    tx.add(put(cyl(0.025, 0.025, 0.07, C.cu, { metalness: 0.9 }), 0, 1.78, z));
  }
  const enc = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.9, 1.6), new THREE.MeshStandardMaterial({ color: '#9fb0c0', transparent: true, opacity: 0.13, depthWrite: false, side: THREE.DoubleSide }));
  enc.position.y = 0.95; enc.add(new THREE.LineSegments(new THREE.EdgesGeometry(enc.geometry), new THREE.LineBasicMaterial({ color: 0x6e8aa6 }))); tx.add(enc);
  tx.add(put(sign('TRANSFORMER 630 kVA\nCast-resin Dyn11\n0.4 / 11 kV  uk 5 %\nIP31  AN', 0.8, 0.4, { bg: '#d7dde2', fg: '#111', border: '#555', title: true }), -0.25, 0.55, 0.805));
  tx.add(put(hvSign(0.26, 'DANGER\n11 000 V'), 0.5, 1.2, 0.805));
  tx.position.set(6.2, 0, -1.7);
  tag(tx, {
    title: 'Step-up transformer 0.4 / 11 kV, 630 kVA', sub: 'Cast-resin indoor transformer in interlocked bay (LV-to-MV interface)',
    specs: [['Rating', '630 kVA, 0.4 kV LV / 11 kV HV, Dyn11'], ['LV current', '909 A at 400 V (1250 A ACB)'], ['HV current', '33 A at 11 kV'], ['Losses', 'no-load ~1.3 kW, load ~6.5 kW'], ['Protection', 'PT100 winding temp trip, MV TX-protection VCB (50/51, 50N/51N, 49)']],
    layer: 'tx',
  });
  add('tx', tx);
  const fm = new THREE.MeshStandardMaterial({ map: meshTex(), transparent: true, side: THREE.DoubleSide, alphaTest: 0.2, roughness: 0.7 });
  fm.map.wrapS = fm.map.wrapT = THREE.RepeatWrapping;
  const fence = (x, z, w, rot) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 1.7), fm); m.position.set(x, 0.85, z); m.rotation.y = rot; return m; };
  [fence(6.2, 0.1, 3.3, 0), fence(4.6, -1.4, 2.8, Math.PI / 2), fence(7.8, -1.4, 2.8, Math.PI / 2)].forEach((m) => add('tx', m));
  for (const [x, z] of [[4.6, 0.1], [7.8, 0.1], [4.6, -2.8], [7.8, -2.8]]) add('tx', put(cyl(0.035, 0.035, 1.75, '#e5c100'), x, 0.875, z));
  add('tx', put(sign('DANGER - 11 kV EQUIPMENT\nAUTHORISED PERSONS ONLY', 1.2, 0.34, { bg: '#e4261f', fg: '#fff', border: '#fff', title: true }), 6.2, 1.2, 0.12));
  label('tx', [6.2, 2.1, -1.7], 'Step-up TX 630 kVA 0.4/11 kV (Dyn11)\ncast-resin, fenced bay', 'tx');

  /* ---------- 11 kV RMU / MV panels ---------- */
  const defs = [
    { id: 'P1', name: 'TX PROTECTION', desc: 'VCB + relay protecting the 630 kVA transformer', closed: true },
    { id: 'P2', name: 'RING IN', desc: 'Load-break switch, incoming 11 kV ring cable', closed: true },
    { id: 'P3', name: 'RING OUT', desc: 'Load-break switch, outgoing 11 kV to grid connection point', closed: true },
  ];
  defs.forEach((d, i) => {
    const g = new THREE.Group();
    const bm = new THREE.MeshStandardMaterial({ color: '#cfd6dc', roughness: 0.5, metalness: 0.25 });
    const dm = new THREE.MeshStandardMaterial({ color: '#dfe5ea', roughness: 0.45, metalness: 0.2 });
    xrayMats.push(bm, dm);
    const mb = (w, h, dd, m) => { const x = new THREE.Mesh(new THREE.BoxGeometry(w, h, dd), m); x.castShadow = true; x.receiveShadow = true; return x; };
    g.add(put(mb(0.8, 1.8, 0.9, bm), 0, 0.9, 0));
    g.add(put(mb(0.76, 0.45, 0.02, dm), 0, 1.5, 0.46)); g.add(put(mb(0.76, 0.85, 0.02, dm), 0, 0.82, 0.46)); g.add(put(mb(0.76, 0.35, 0.02, dm), 0, 0.2, 0.46));
    g.add(put(box(0.2, 0.12, 0.015, '#0b1f27'), -0.2, 1.55, 0.475)); g.add(put(box(0.18, 0.1, 0.004, '#58d8ff', { emissive: '#58d8ff', emissiveIntensity: 0.5 }), -0.2, 1.55, 0.484));
    g.add(put(sign(`${d.id}  ${d.name}`, 0.72, 0.08, { bg: '#1d2b3a', fg: '#fff', title: true }), 0, 1.73, 0.475));
    g.add(put(mimic('vcb', 0.4, 0.55), -0.14, 0.9, 0.475));
    const mk = (c, y, v) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.02, 10, 10), glow(c, v)); m.material = m.material.clone(); m.position.set(0.26, y, 0.485); g.add(m); return m; };
    const lampC = mk('#ff2a2a', 1.18, 2.5), lampO = mk('#26e55a', 1.1, 0.08), lampE = mk('#ffd23a', 0.98, 0.08), lampN = mk('#f2f2f2', 0.9, 1.6);
    g.add(put(sign('I', 0.04, 0.04, { bg: null, fg: '#d00', ppm: 300 }), 0.32, 1.18, 0.476)); g.add(put(sign('O', 0.04, 0.04, { bg: null, fg: '#0a0', ppm: 300 }), 0.32, 1.1, 0.476));
    g.add(put(sign('E', 0.04, 0.04, { bg: null, fg: '#a80', ppm: 300 }), 0.32, 0.98, 0.476)); g.add(put(sign('E-', 0.05, 0.04, { bg: null, fg: '#333', ppm: 300 }), 0.325, 0.9, 0.476));
    g.add(put(box(0.1, 0.05, 0.03, '#888'), 0.26, 0.7, 0.48)); g.add(put(box(0.1, 0.05, 0.03, '#e6c100'), 0.26, 0.6, 0.48)); // switch + earth levers
    for (let k = 0; k < 3; k++) g.add(put(cyl(0.014, 0.014, 0.02, '#ff9a2a', { emissive: '#ff6a00', emissiveIntensity: 1 }, 10).rotateX(Math.PI / 2), -0.1 + k * 0.05, 0.3, 0.476));
    g.add(put(sign('VPIS', 0.14, 0.04, { bg: null, fg: '#223', ppm: 300 }), -0.03, 0.24, 0.476));
    g.add(put(hvSign(0.14, 'DANGER
11 000 V'), -0.26, 0.12, 0.475)); g.add(put(arcSign(0.26), 0.15, 0.14, 0.475));
    g.position.set(9.0 + 0.8 * i, 0, -2.4);
    const inner = new THREE.Group();
    for (let k = 0; k < 3; k++) { inner.add(put(cyl(0.05, 0.05, 0.4, '#e8e3d3', {}, 14), -0.18 + k * 0.18, 0.85, -0.05)); inner.add(put(box(0.04, 0.5, 0.04, C.cu, { metalness: 0.9 }), -0.18 + k * 0.18, 0.45, -0.3)); }
    inner.visible = false; g.add(inner); out.internals.push(inner);
    tag(g, {
      title: `RMU panel ${d.id} - ${d.name}`, sub: d.desc,
      specs: [['Type', 'Metal-enclosed 12 kV RMU, 630 A, 20 kA / 1 s, IAC AFL'], ['Indications', 'Switch CLOSED (red) / OPEN (green); earth switch ON (yellow) / OFF (white); VPIS'], ['Busbar', 'sealed busbar compartment above, 630 A'], ['Interlock', 'earth switch can only close with the switch open'], ['Signage', 'DANGER 11 kV + arc-flash label']],
      breaker: { closed: d.closed, earth: false, lampC, lampO, lampE, lampN, kind: 'rmu' },
      layer: 'mv',
    });
    add('mv', g);
  });
  add('mv', put(box(2.4, 0.3, 0.7, '#b7bec5', { metalness: 0.5 }), 9.8, 1.95, -2.45));
  add('mv', put(sign('BUSBAR COMPARTMENT  12 kV 630 A', 1.6, 0.1, { bg: '#f5f1e0', border: '#333' }), 9.8, 1.95, -2.095));
  const bb = new THREE.Group(); [1.5, 1.6, 1.7].forEach((y, k) => bb.add(put(box(2.4, 0.05, 0.05, [C.cu, '#d6a24a', '#b86a2b'][k], { metalness: 0.9, roughness: 0.3 }), 9.8, y, -2.6))); bb.visible = false; add('mv', bb); out.internals.push(bb);
  label('mv', [9.8, 2.4, -2.4], '11 kV RMU: TX protection / Ring IN / Ring OUT\nbreaker + earth-switch indicators, busbar compartment', 'mv');

  /* ---------- MV cables ---------- */
  const mvt = (pts) => add('mvc', tube(pts, 0.032, C.mv, { roughness: 0.4 }));
  [-0.38, 0, 0.38].forEach((dz, j) => {
    const zk = -1.7 + dz, xd = 8.05 + 0.1 * j, zt = -2.7 + 0.1 * j, xe = 8.8 + 0.2 * j;
    mvt([V(6.2, 1.8, zk), V(6.2, 2.5, zk), V(xd, 2.5, zk), V(xd, 0.1, zk), V(xd, -0.22, zk), V(xd, -0.22, zt), V(xe, -0.22, zt), V(xe, 0.5, zt)]);
    mvt([V(9.6 + 0.1 * j, 0.5, -2.3 - 0.06 * j), V(9.6 + 0.1 * j, -0.22, -2.3 - 0.06 * j), V(12, -0.22, -2.3 - 0.06 * j), V(19, -0.22, -2.3 - 0.06 * j)]);
    mvt([V(10.4 + 0.1 * j, 0.5, -2.62 - 0.06 * j), V(10.4 + 0.1 * j, -0.22, -2.62 - 0.06 * j), V(12, -0.22, -2.62 - 0.06 * j), V(19, -0.22, -2.62 - 0.06 * j)]);
  });
  add('mvc', put(box(0.25, 0.6, 0.7, '#555e66', { metalness: 0.6 }), 12.0, 0.0, -2.5));
  label('mvc', [8.2, 2.6, -1.4], 'MV cables TX HV -> RMU P1\n(3 x 1c 35 mm2 Al XLPE, 11 kV)', 'mv');
  label('mvc', [18.8, 0, -2.3], '11 kV IN (ring)', 'mv');
  label('mvc', [18.8, 0, -2.7], '11 kV OUT -> grid connection point', 'mv');
  label('mvc', [12.4, 0.9, -2.5], 'Wall transit, fire-stopped', 'mv');

  /* ---------- HVAC ---------- */
  const fans = [];
  [-5, -2.2].forEach((x) => {
    const f = new THREE.Group();
    f.add(put(cyl(0.38, 0.38, 0.08, '#a8b2bb', { metalness: 0.6 }, 28).rotateX(Math.PI / 2), 0, 0, 0));
    const hub = new THREE.Group();
    for (let k = 0; k < 5; k++) { const b = box(0.3, 0.012, 0.09, '#394149'); b.position.set(0.17, 0, 0); b.rotation.x = 0.4; const pv = new THREE.Group(); pv.rotation.z = k * Math.PI * 2 / 5; pv.add(b); hub.add(pv); }
    hub.position.z = 0.05; f.add(hub); fans.push(hub);
    f.position.set(x, 3.05, -2.85); add('hvac', f);
    add('hvac', put(box(0.9, 0.9, 0.3, '#7b858e', { metalness: 0.6 }), x, 3.05, -3.15)); // outside hood
  });
  anim.push((t, dt) => fans.forEach((h) => { h.rotation.z += dt * 10; }));
  const louver = (w, h) => { const g = new THREE.Group(); g.add(box(w, h, 0.06, '#7b858e', { metalness: 0.6 })); const sl = []; for (let y = -h / 2 + 0.08; y < h / 2 - 0.04; y += 0.07) sl.push([0, y, 0.035, w - 0.1, 0.02, 0.06]); g.add(mergedBoxes(sl, '#aeb7bf', { metalness: 0.5 })); return g; };
  [3, 6, 9].forEach((x) => add('hvac', put(louver(1.0, 0.7), x, 0.55, 3.12)));
  [-1, 1].forEach((z) => { const l = louver(1.0, 0.7); l.rotation.y = -Math.PI / 2; add('hvac', put(l, -8.12, 0.55, z * 0.9)); });
  // split A/C for RMU/TX zone
  const sp = new THREE.Group(); sp.add(box(0.28, 0.3, 0.95, '#f2f4f5', { roughness: 0.3 })); sp.add(put(box(0.02, 0.06, 0.8, '#2a2f33'), -0.15, -0.08, 0));
  add('hvac', put(sp, 11.75, 2.7, 0.2)); add('hvac', put(box(0.4, 0.75, 0.9, '#c9d0d6', { metalness: 0.4 }), 12.6, 0.4, 0.2));
  add('hvac', put(cyl(0.3, 0.3, 0.03, '#222', {}, 24).rotateZ(Math.PI / 2), 12.82, 0.45, 0.2));
  add('hvac', tube([V(11.85, 2.6, 0.5), V(12.3, 2.3, 0.5), V(12.4, 0.6, 0.5)], 0.014, '#b7792e'));
  // perforated overhead cable tray (control / comms / aux)
  const perf = canvasTex('perf', 64, 64, (c) => { c.fillStyle = '#9aa4ad'; c.fillRect(0, 0, 64, 64); c.fillStyle = '#1b2025'; for (let i = 8; i < 64; i += 16) for (let j = 8; j < 64; j += 16) { c.beginPath(); c.arc(i, j, 4, 0, 7); c.fill(); } });
  perf.wrapS = perf.wrapT = THREE.RepeatWrapping; perf.repeat.set(40, 1);
  const tray = new THREE.Group();
  const tb = new THREE.Mesh(new THREE.BoxGeometry(19, 0.02, 0.4), new THREE.MeshStandardMaterial({ map: perf, metalness: 0.5, roughness: 0.5 })); tray.add(tb);
  for (const z of [-0.2, 0.2]) tray.add(put(box(19, 0.08, 0.02, '#9aa4ad', { metalness: 0.5 }), 0, 0.04, z));
  for (let x = -9; x <= 9; x += 3) tray.add(put(box(0.02, 0.5, 0.02, '#7a8590'), x, 0.25, 0));
  tray.position.set(2, 3.05, -1.3); add('hvac', tray);
  add('hvac', tube([V(-7, 3.12, -1.35), V(11, 3.12, -1.35)], 0.025, '#2b5fd9'));
  label('hvac', [-3.6, 3.4, -2.9], 'Exhaust fans (hot air out high)\n~0.9 m3/s removes ~17 kW at dT 15 K', 'hvac');
  label('hvac', [6, 0.9, 3.1], 'Intake louvres (low, filtered)', 'hvac');
  label('hvac', [11.8, 2.9, 0.2], 'Split A/C for RMU/TX zone', 'hvac');
  label('hvac', [2, 3.4, -1.3], 'Perforated overhead cable tray\n(controls / comms / aux)', 'hvac');

  /* ---------- fire & safety ---------- */
  const ext = (x, y, z, rot) => {
    const g = new THREE.Group();
    g.add(put(cyl(0.075, 0.075, 0.45, '#2a2a2a', { metalness: 0.3 }, 16), 0, 0.22, 0)); g.add(put(cyl(0.03, 0.04, 0.1, '#222', {}, 10), 0, 0.5, 0));
    g.add(put(box(0.07, 0.025, 0.03, '#222'), 0.04, 0.55, 0)); g.add(put(sign('CO2', 0.13, 0.08, { bg: '#fff', fg: '#111' }), 0, 0.22, 0.078));
    g.add(put(cyl(0.077, 0.077, 0.1, '#c0141c', {}, 16), 0, 0.4, 0));
    g.rotation.y = rot; g.position.set(x, y, z); return g;
  };
  add('fire', ext(-7.8, 0.9, 2.3, Math.PI / 2)); add('fire', ext(11.8, 0.9, -0.5, -Math.PI / 2));
  add('fire', put(sign('CO2\nEXTINGUISHER', 0.3, 0.3, { bg: '#d22', fg: '#fff', border: '#fff', title: true }), -7.88, 1.8, 2.3).rotateY(Math.PI / 2));
  add('fire', put(sign('CO2\nEXTINGUISHER', 0.3, 0.3, { bg: '#d22', fg: '#fff', border: '#fff', title: true }), 11.88, 1.8, -0.5).rotateY(-Math.PI / 2));
  const dets = [];
  for (const x of [-4, 3, 9]) { add('fire', put(cyl(0.06, 0.06, 0.04, '#f2f4f5', {}, 16), x, 3.77, 0)); const l = new THREE.Mesh(new THREE.SphereGeometry(0.01, 6, 6), glow('#ff2a2a', 2)); l.position.set(x + 0.04, 3.75, 0); add('fire', l); dets.push(l); }
  anim.push((t) => dets.forEach((l, i) => { l.material.emissiveIntensity = Math.sin(t * 3 + i) > 0.9 ? 3 : 0.1; }));
  add('fire', put(box(0.1, 0.1, 0.05, '#d11'), -7.88, 1.4, 0.7));
  add('fire', put(sign('EXIT', 0.5, 0.18, { bg: '#0a8a3a', fg: '#fff', title: true }), -7.88, 2.4, 1.5).rotateY(Math.PI / 2));
  add('fire', put(sign('EXIT', 0.5, 0.18, { bg: '#0a8a3a', fg: '#fff', title: true }), 11.88, 2.4, 1.6).rotateY(-Math.PI / 2));
  [[-5, -2.8], [3, 2.8], [10, 2.8]].forEach(([x, z]) => { add('fire', put(box(0.3, 0.1, 0.12, '#f4f4f4'), x, 3.2, z)); add('fire', put(box(0.04, 0.04, 0.02, '#ffe8a0', { emissive: '#ffe8a0', emissiveIntensity: 1.2 }), x - 0.08, 3.2, z + (z < 0 ? 0.07 : -0.07))); });
  add('fire', tube([V(-7.8, 0.18, -2.88), V(11.8, 0.18, -2.88)], 0.012, '#a6c21a'));
  add('fire', tube([V(-7.8, 0.18, -2.88), V(-7.8, 0.18, 2.88)], 0.012, '#a6c21a'));
  label('fire', [-7.8, 1.9, 2.3], 'CO2 fire extinguisher + signage', 'fire');
  label('fire', [11.8, 1.9, -0.5], 'CO2 extinguisher (RMU zone)', 'fire');
  label('fire', [-4, 3.85, 0], 'Smoke detector (addressable)', 'fire');
  label('fire', [-7.8, 2.7, 1.0], 'Exit sign + emergency lighting + call point', 'fire');
  label('fire', [-7.7, 0.3, -1.5], 'Perimeter earth bar', 'fire');

  /* ---------- lighting ---------- */
  const batt = []; for (let x = -6; x <= 10; x += 3.2) for (const z of [-0.8, 1.6]) batt.push([x, 3.55, z, 1.2, 0.05, 0.12]);
  add('light', mergedBoxes(batt, '#fffbe8', { emissive: '#fff4c8', emissiveIntensity: 1.8, roughness: 0.3 }));
  [-5, 1, 6, 10].forEach((x) => { const l = new THREE.PointLight('#fff2d6', 8, 14, 1.6); l.position.set(x, 3.3, 0.4); add('light', l); });
  label('light', [-6, 3.7, -0.8], 'LED battens + emergency lights', 'light');

  /* ---------- floor markings ---------- */
  const decal = (x0, x1, z0, z1, m, o = {}) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), new THREE.MeshStandardMaterial(m.isTexture ? { map: m, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 } : { color: m, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
    mesh.rotation.x = -Math.PI / 2; mesh.position.set((x0 + x1) / 2, o.y ?? 0.006, (z0 + z1) / 2); mesh.receiveShadow = true; return mesh;
  };
  const strip = (x0, x1, z0, z1) => { const t = stripeTex().clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(Math.max(1, (x1 - x0) * 3), Math.max(1, (z1 - z0) * 3)); return decal(x0, x1, z0, z1, t); };
  add('marks', decal(-7.6, 3.9, -1.49, -1.41, '#f2c500')); // 1 m keep-clear line in front of inverters/LV
  add('marks', strip(4.5, 7.9, 0.05, 0.15)); add('marks', strip(4.5, 4.6, -2.85, 0.15)); add('marks', strip(7.8, 7.9, -2.85, 0.15));
  for (const [a, b, c, d] of [[8.4, 11.2, -0.79, -0.71], [8.4, 8.5, -1.95, -0.71], [11.1, 11.2, -1.95, -0.71]]) add('marks', decal(a, b, c, d, '#d71f26'));
  add('marks', decal(8.6, 11.0, -1.93, -1.35, '#16191c', { y: 0.008 }));
  const flat = (text, w, h, x, z, o) => { const s = sign(text, w, h, o); s.rotation.x = -Math.PI / 2; s.position.set(x, 0.011, z); return s; };
  add('marks', flat('ARC-FLASH BOUNDARY 1.2 m\nPPE REQUIRED', 2.6, 0.5, 9.8, -1.05, { bg: null, fg: '#d71f26', title: true }));
  add('marks', flat('INSULATING MAT', 1.8, 0.25, 9.8, -1.65, { bg: null, fg: '#cfd5da' }));
  add('marks', flat('TX BAY - 11 kV  KEEP OUT', 3.0, 0.4, 6.2, 0.6, { bg: null, fg: '#f2c500', title: true }));
  add('marks', flat('KEEP CLEAR 1.0 m', 2.0, 0.28, -3.4, -1.15, { bg: null, fg: '#f2c500' }));
  add('marks', flat('633 kWp BoS ROOM  -  6 x 100 kW', 6, 0.5, -3.2, 0.9, { bg: null, fg: '#fff3a8', title: true }));
  const esc = canvasTex('esc', 512, 64, (c) => { c.fillStyle = '#0a8a3a'; c.fillRect(0, 0, 512, 64); c.fillStyle = '#fff'; for (let i = 0; i < 8; i++) { c.beginPath(); c.moveTo(i * 64 + 8, 8); c.lineTo(i * 64 + 40, 32); c.lineTo(i * 64 + 8, 56); c.lineTo(i * 64 + 20, 56); c.lineTo(i * 64 + 52, 32); c.lineTo(i * 64 + 20, 8); c.fill(); } });
  add('marks', decal(-7.5, -2.5, 1.4, 1.75, esc));
  add('marks', put(sign('DC LIVE WHEN ILLUMINATED\nIsolate DC before touching', 1.5, 0.45, { bg: '#f2c500', fg: '#111', title: true, border: '#111' }), -3.4, 2.9, -2.88));
  add('marks', put(sign('MV EQUIPMENT\nPermit-to-work required', 1.4, 0.45, { bg: '#e4261f', fg: '#fff', title: true, border: '#fff' }), 8.0, 2.4, -2.88));
  label('marks', [9.8, 0.02, -1.0], 'Arc-flash boundary + insulating mat', 'fire');

  return out;
}
