// Generates 2D plan-view layout drawings (SVG + PNG + PDF) for both systems into ./drawings
// usage: node scripts/drawings.mjs     (PNG export needs Chrome/Edge, same as verify)
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const S = 40;          // px per metre
const M = 70;          // sheet margin
const fmt = (n) => n.toFixed(1);

function sheet({ title, sub, xmin, xmax, zmin, zmax, body, legend, notes, id }) {
  const W = (xmax - xmin) * S + M * 2 + 330, H = Math.max((zmax - zmin) * S + M * 2 + 80, M + 62 + legend.length * 21 + 44 + notes.length * 38 + 110);
  const X = (x) => M + (x - xmin) * S, Z = (z) => M + 40 + (z - zmin) * S;
  const o = [];
  const R = (x0, x1, z0, z1, cls, extra = '') => o.push(`<rect class="${cls}" x="${fmt(X(x0))}" y="${fmt(Z(z0))}" width="${fmt((x1 - x0) * S)}" height="${fmt((z1 - z0) * S)}" ${extra}/>`);
  const P = (pts, cls) => o.push(`<polygon class="${cls}" points="${pts.map(([x, z]) => `${fmt(X(x))},${fmt(Z(z))}`).join(' ')}"/>`);
  const L = (x0, z0, x1, z1, cls) => o.push(`<line class="${cls}" x1="${fmt(X(x0))}" y1="${fmt(Z(z0))}" x2="${fmt(X(x1))}" y2="${fmt(Z(z1))}"/>`);
  const PL = (pts, cls) => o.push(`<polyline class="${cls}" fill="none" points="${pts.map(([x, z]) => `${fmt(X(x))},${fmt(Z(z))}`).join(' ')}"/>`);
  const T = (x, z, t, cls = 'lbl', anchor = 'middle') => t.split('\n').forEach((l, i) => o.push(`<text class="${cls}" x="${fmt(X(x))}" y="${fmt(Z(z) + i * 11)}" text-anchor="${anchor}">${l.replace(/&/g, '&amp;')}</text>`));
  const C = (x, z, r, cls) => o.push(`<circle class="${cls}" cx="${fmt(X(x))}" cy="${fmt(Z(z))}" r="${fmt(r * S)}"/>`);
  const N = (x, z, tx, tz, t, anchor = 'middle') => { L(x, z, tx, tz, 'lead'); C(x, z, 0.05, 'dot'); T(tx, tz - 0.08, t, 'note', anchor); };
  const DH = (x0, x1, z, t) => { L(x0, z, x1, z, 'dim'); L(x0, z - 0.2, x0, z + 0.2, 'dim'); L(x1, z - 0.2, x1, z + 0.2, 'dim'); T((x0 + x1) / 2, z - 0.1, t, 'dimt'); };
  const DV = (z0, z1, x, t) => { L(x, z0, x, z1, 'dim'); L(x - 0.2, z0, x + 0.2, z0, 'dim'); L(x - 0.2, z1, x + 0.2, z1, 'dim'); o.push(`<text class="dimt" transform="translate(${fmt(X(x) - 5)},${fmt(Z((z0 + z1) / 2))}) rotate(-90)" text-anchor="middle">${t}</text>`); };
  body({ R, P, L, PL, T, C, N, DH, DV });
  // legend
  const lx = M + (xmax - xmin) * S + 40;
  const leg = [`<text class="h" x="${lx}" y="${M + 40}">LEGEND</text>`];
  legend.forEach(([cls, t, kind], i) => {
    const y = M + 62 + i * 21;
    leg.push(kind === 'line' ? `<line class="${cls}" x1="${lx}" y1="${y - 4}" x2="${lx + 26}" y2="${y - 4}"/>` : `<rect class="${cls}" x="${lx}" y="${y - 12}" width="26" height="13"/>`);
    leg.push(`<text class="lg" x="${lx + 34}" y="${y}">${t}</text>`);
  });
  const ny = M + 62 + legend.length * 21 + 24;
  leg.push(`<text class="h" x="${lx}" y="${ny}">NOTES</text>`);
  notes.forEach((n, i) => n.split('\n').forEach((l, j) => leg.push(`<text class="lg" x="${lx}" y="${ny + 20 + i * 38 + j * 12}">${j ? '&#160;&#160;&#160;' : (i + 1) + '. '}${l.replace(/&/g, '&amp;')}</text>`)));
  // scale bar + title block
  const sbx = M, sby = H - 36;
  const tb = [
    `<rect class="tb" x="${W - 340}" y="${H - 70}" width="310" height="52"/>`,
    `<text class="th" x="${W - 330}" y="${H - 48}">DWG ${id}</text>`,
    `<text class="lg" x="${W - 330}" y="${H - 30}">Plan view, dimensions in m. Concept layout.</text>`,
    `<line class="dim" x1="${sbx}" y1="${sby}" x2="${sbx + 5 * S}" y2="${sby}"/>`,
    ...[0, 1, 2, 3, 4, 5].map((k) => `<line class="dim" x1="${sbx + k * S}" y1="${sby - 4}" x2="${sbx + k * S}" y2="${sby + 4}"/>`),
    `<text class="lg" x="${sbx}" y="${sby + 16}">0</text><text class="lg" x="${sbx + 5 * S}" y="${sby + 16}" text-anchor="middle">5 m</text>`,
    `<text class="lg" x="${sbx + 6 * S}" y="${sby + 4}">N &#8593; = rear wall at top (z-)</text>`,
  ];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="Arial, sans-serif">
<style>
 .bg{fill:#fff}.h{font:bold 13px Arial;fill:#111}.th{font:bold 15px Arial;fill:#111}.lg{font:11px Arial;fill:#222}.lbl{font:10px Arial;fill:#111}.note{font:10.5px Arial;fill:#111}.dimt{font:10px Arial;fill:#036}
 .wall{fill:#cfd3d6;stroke:#111;stroke-width:1.5}.floor{fill:#f4f5f6;stroke:none}.plinth{fill:none;stroke:#777;stroke-width:1;stroke-dasharray:6 4}
 .trench{fill:url(#hat);stroke:#555;stroke-width:1}.trough{fill:#e3e6e8;stroke:#555;stroke-width:1}.rack{fill:#7a8590;stroke:#333}
 .inv{fill:#cfe8ff;stroke:#036;stroke-width:1.2}.slot{fill:none;stroke:#e08a00;stroke-width:1.4;stroke-dasharray:5 3}.lv{fill:#ffe3a0;stroke:#8a5a00;stroke-width:1.2}
 .tx{fill:#f0cfa0;stroke:#7a431a;stroke-width:1.4}.coil{fill:#c9853a;stroke:#5a3010}.fence{fill:none;stroke:#c9a400;stroke-width:2;stroke-dasharray:8 4}
 .mv{fill:#ffc4c4;stroke:#900;stroke-width:1.2}.duct{fill:#ddd;stroke:#555}.arc{fill:none;stroke:#d00;stroke-width:1.8;stroke-dasharray:7 4}.mat{fill:#333;stroke:#000}
 .dc{stroke:#d0262e;stroke-width:2;fill:none}.ac{stroke:#e0a02e;stroke-width:2.4;fill:none}.mvc{stroke:#c8232c;stroke-width:2.4;fill:none}.ctl{stroke:#2b5fd9;stroke-width:1.6;stroke-dasharray:6 3;fill:none}
 .earth{stroke:#7ea000;stroke-width:1.5;fill:none}.fan{fill:#fff;stroke:#2a7;stroke-width:1.4}.louv{fill:#d7efe0;stroke:#2a7}.ac2{fill:#fff;stroke:#2a7;stroke-width:1.4}
 .ext{fill:#c0141c;stroke:#600}.det{fill:#fff;stroke:#c00}.exit{fill:#0a8a3a;stroke:#063}.door{fill:#fff;stroke:#111;stroke-width:1.4}.swing{fill:none;stroke:#111;stroke-width:.8;stroke-dasharray:3 3}
 .hz{fill:url(#haz);stroke:#111;stroke-width:.8}.line{stroke:#d9a800;stroke-width:2;fill:none}.route{stroke:#0a8a3a;stroke-width:3;stroke-dasharray:10 6;fill:none}
 .dim{stroke:#036;stroke-width:1;fill:none}.lead{stroke:#333;stroke-width:.8}.dot{fill:#333}.tb{fill:#fff;stroke:#111;stroke-width:1.5}.zone{fill:none;stroke:#888;stroke-width:1;stroke-dasharray:2 4}
</style>
<defs>
 <pattern id="hat" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="8" stroke="#777" stroke-width="1.4"/></pattern>
 <pattern id="haz" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5" height="10" fill="#f2c500"/><rect x="5" width="5" height="10" fill="#111"/></pattern>
</defs>
<rect class="bg" width="${W}" height="${H}"/>
<text class="th" x="${M}" y="34">${title}</text><text class="lg" x="${M}" y="50">${sub}</text>
${o.join('\n')}
${leg.join('\n')}
${tb.join('\n')}
</svg>`;
}

/* ------------------------------------------------------------------ 6 MW */
const legend = (extra = []) => [
  ['inv', 'Inverter 100 kW'], ['lv', 'LV combiner / ACB'], ['tx', 'Step-up transformer'], ['mv', 'MV switchgear'],
  ['trench', 'Cable trench (grated / covered)'], ['trough', 'Outside trough / MV yard trough'],
  ['dc', 'DC feeder', 'line'], ['ac', 'LV AC collector', 'line'], ['mvc', 'MV cable', 'line'], ['ctl', 'Overhead tray (controls/comms)', 'line'], ['earth', 'Earth bar', 'line'],
  ['fence', 'TX bay fence (key interlock)', 'line'], ['arc', 'Arc-flash boundary', 'line'], ['route', 'Escape route', 'line'], ['line', 'Keep-clear line 1.0 m', 'line'],
  ['fan', 'Exhaust fan'], ['louv', 'Intake louvre'], ['ext', 'Fire extinguisher / suppression'], ...extra,
];

const plan6 = sheet({
  id: 'BOS-6MW-PL-01', title: '6 MW BoS INVERTER & MV SWITCHGEAR SHED - GROUND FLOOR PLAN', sub: '60 x 100 kW string inverters (2 racks x 2 tiers x 15), 6.3 MVA 0.8/33 kV TX, 5-panel 33 kV MV lineup',
  xmin: -21, xmax: 26, zmin: -13, zmax: 13.2,
  legend: legend(),
  notes: ['Tiers stacked: each inverter symbol = 2 units\n(tier 1 at 0.5 m, tier 2 at 1.65 m).', 'DC feeders enter through gland strip at 0.3 m\nfrom outside troughs; fire-stopped.', 'LV AC in floor trenches -> cross trench ->\n4 feeder cabinets + 5000 A ACB.', 'MV: TX HV -> trench -> P2; P1/P3 exit east\nthrough sealed wall transit.', 'No PV modules on roof, walls or yard.'],
  body: ({ R, P, L, PL, T, C, N, DH, DV }) => {
    R(-18.8, 16.3, -4.8, 4.8, 'plinth');
    R(-18.6, 16.1, -4.6, 4.6, 'wall'); R(-18.4, 15.9, -4.4, 4.4, 'floor');
    // yard troughs
    for (const s of [-1, 1]) { R(-20, 3.6, Math.min(5.1 * s, 5.5 * s), Math.max(5.1 * s, 5.5 * s), 'trough'); R(-20, -19.6, Math.min(5.5 * s, 12 * s), Math.max(5.5 * s, 12 * s), 'trough'); L(-19.8, 12 * s, -19.8, 5.3 * s, 'dc'); L(-19.8, 5.3 * s, 3, 5.3 * s, 'dc'); }
    R(15.9, 25, -4.4, -3.4, 'trough');
    // trenches
    P([[-17.9, -3.65], [4.4, -3.65], [4.4, 3.65], [-17.9, 3.65], [-17.9, 3.1], [3.8, 3.1], [3.8, -3.1], [-17.9, -3.1]], 'trench');
    P([[8.9, 0.8], [9.5, 0.8], [9.5, -3.4], [15.9, -3.4], [15.9, -4.3], [8.9, -4.3]], 'trench');
    // racks + inverters
    for (const s of [-1, 1]) {
      R(-17.8, 1.6, s * 4.36 - 0.03, s * 4.36 + 0.03, 'rack');
      for (let i = 0; i < 15; i++) { const x = -17.2 + 1.3 * i; R(x - 0.5, x + 0.5, s * 4.16 - 0.18, s * 4.16 + 0.18, 'inv'); T(x, s * 4.16 + 0.05, String(i + 1), 'lbl'); L(x - 0.65, s * 5.3, x - 0.65, s * 4.3, 'dc'); L(x - 0.76, s * 4.0, x - 0.76, s * 3.4, 'ac'); }
      PL([[-17.2, s * 3.375], [4.1, s * 3.375]], 'ac');
    }
    PL([[4.1, -3.375], [4.1, 3.375]], 'ac');
    // LV cabinets
    [-1.8, -0.9, 0, 0.9, 1.8].forEach((z, i) => { R(3.65, 4.55, z - 0.45, z + 0.45, 'lv'); T(4.1, z + 0.05, i === 2 ? 'ACB' : 'F' + (i < 2 ? i + 1 : i), 'lbl'); });
    R(4.55, 6.75, -0.3, 0.3, 'duct'); T(5.65, 0.05, 'LV bus trunking', 'lbl');
    // TX
    R(5.3, 9.8, -1.9, 1.9, 'fence'); R(6.65, 8.75, -1.0, 1.0, 'tx'); for (const z of [-0.62, 0, 0.62]) C(7.7, z, 0.34, 'coil');
    for (const z of [-0.62, 0, 0.62]) PL([[7.7, z], [8.8 + (z + 0.62) * 0.15, z], [8.8 + (z + 0.62) * 0.15, -3.9 + (z + 0.62) * 0.15], [11.3 + (z + 0.62) * 0.3, -3.9 + (z + 0.62) * 0.15]], 'mvc');
    // MV
    for (let i = 0; i < 5; i++) { R(10.15 + 0.9 * i, 11.05 + 0.9 * i, -4.3, -3.3, 'mv'); T(10.6 + 0.9 * i, -3.7, 'P' + (i + 1), 'lbl'); }
    R(10.15, 14.65, -3.3, -1.8, 'arc'); R(10.2, 14.6, -3.28, -2.45, 'mat', 'opacity=".6"');
    PL([[10.6, -3.5], [24.5, -3.5]], 'mvc'); PL([[12.4, -4.2], [24.5, -4.2]], 'mvc');
    // control tray
    PL([[-17.4, -2.2], [15.6, -2.2]], 'ctl');
    // earth
    PL([[-18.4, 4.3], [-18.4, -4.3], [15.8, -4.3], [15.8, 4.3]], 'earth');
    // HVAC
    for (const x of [-15, -10, -5, 0, 7.7, 12.5]) { C(x, 0, 0.35, 'fan'); L(x - 0.25, -0.25, x + 0.25, 0.25, 'dim'); L(x - 0.25, 0.25, x + 0.25, -0.25, 'dim'); }
    for (const x of [-15, -8, -3]) R(x - 0.6, x + 0.6, 4.58, 4.7, 'louv'); for (const x of [-15, -8, -3, 2, 12]) R(x - 0.6, x + 0.6, -4.7, -4.58, 'louv');
    R(15.5, 15.8, -1.7, -0.75, 'ac2'); R(15.5, 15.8, 1.5, 2.45, 'ac2');
    // doors
    R(-18.62, -18.38, -0.9, 0.9, 'door'); L(-18.4, -0.9, -17.5, -0.9, 'swing'); L(-18.4, 0.9, -17.5, 0.9, 'swing');
    R(15.88, 16.12, 2.15, 3.05, 'door'); L(15.9, 2.15, 15.0, 2.15, 'swing');
    // fire
    for (const [x, z] of [[-18.2, -4.25], [3, -4.25], [15.6, 3.7], [15.6, -2.2]]) C(x, z, 0.12, 'ext');
    R(15.0, 15.4, -2.4, -1.5, 'ext', 'opacity=".5"'); R(15.4, 15.7, -0.6, 0.4, 'mv', 'opacity=".5"');
    // escape route
    PL([[-17.5, 0], [-12, 0], [-12, 2.5], [14.8, 2.5], [14.8, 2.6]], 'route');
    L(-17.9, -2.95, 3.4, -2.95, 'line'); L(-17.9, 2.95, 3.4, 2.95, 'line');
    // dims
    DH(-18.5, 16, 7.3 - 0.3, '34.5 m'); DV(-4.5, 4.5, -22.2 + 1.3, '9.0 m');
    DH(-17.7, 1.5, -5.9, '15 x 1.3 m pitch = 19.5 m rack'); 
    DV(-3.1, 3.1, -15, 'aisle 6.2 m');
    DH(10.15, 14.65, -5.2, '5 panels x 0.9 = 4.5 m'); DV(-3.3, -1.8, 9.6, '1.5 m arc');
    // zone labels
    T(-8.5, 1.4, 'INVERTER HALL  -  60 x 100 kW = 6.0 MWac', 'h'); T(4.1, 3.2, 'LV AC\ncombiner', 'lbl'); T(7.55, 2.3, 'TX BAY 33 kV', 'lbl'); T(12.4, 1, 'MV SWITCHGEAR ROOM', 'h');
    // callouts
    N(-19.8, -9, -19.5, -10.3, 'DC trench from PV field\n(1500 Vdc homeruns)', 'start'); N(-8, -3.4, -9, -7, 'LV AC collector trench\n+ ladder tray (x2)', 'middle');
    N(7.7, 0, 7.7, -7, 'TX 6.3 MVA 0.8/33 kV Dyn11\ncast-resin, fenced', 'middle'); N(12.4, -4.5, 12.4, -7.6, 'MV lineup 36 kV 1250 A\nP1 in / P2 TX VCB / P3 out / P4 aux / P5 spare', 'middle');
    N(24.4, -3.5, 22, -6, '33 kV IN / OUT to\ncollector substation', 'middle'); N(4.1, -2.4, 2, -7.3, 'LV combiner:\n4 x 15 MCCB + 5000 A ACB', 'middle');
    N(-5, 0, -5, -7.6, 'Roof exhaust fans', 'middle'); N(-3, 4.65, -3, 6, 'Intake louvres', 'middle');
  },
});

/* ------------------------------------------------------------------ 633 kW */
const plan633 = sheet({
  id: 'BOS-633-PL-01', title: '633 kWp / 6 x 100 kW BoS INVERTER SHED - GROUND FLOOR PLAN', sub: '6 x 100 kW string inverters (+ optional 7th), AC combiner, 630 kVA 0.4/11 kV TX, 3-panel 11 kV RMU',
  xmin: -10.5, xmax: 22, zmin: -8.4, zmax: 4.6,
  legend: legend([['slot', 'Optional 7th inverter slot', 'line']]),
  notes: ['633 kWp DC / 600 kWac = ratio 1.055.\nWith 7th unit: 700 kWac, ratio 0.90.', 'DC via wall sleeves from outside trench;\nbottom cable glands on each inverter.', 'LV AC grated trench -> combiner\n(6 x 160 A MCCB, SPD, meter) -> 1250 A ACB.', 'MV: TX HV cables to RMU P1 via trench;\nring cables leave east in sealed transit.', 'No PV modules on roof, walls or yard.'],
  body: ({ R, P, L, PL, T, C, N, DH, DV }) => {
    R(-8.3, 12.3, -3.3, 3.3, 'plinth');
    R(-8.1, 12.1, -3.1, 3.1, 'wall'); R(-7.9, 11.9, -2.9, 2.9, 'floor');
    R(-9, 0.4, -3.7, -3.2, 'trough'); R(-9, -8.6, -8, -3.7, 'trough'); L(-8.8, -8, -8.8, -3.45, 'dc'); L(-8.8, -3.45, 0, -3.45, 'dc');
    R(11.9, 20, -2.8, -2.2, 'trough');
    P([[-7.6, -2.25], [2.0, -2.25], [2.0, -2.8], [3.9, -2.8], [3.9, -1.75], [-7.6, -1.75]], 'trench');
    P([[7.9, -1.2], [8.5, -1.2], [8.5, -2.2], [11.9, -2.2], [11.9, -2.8], [7.9, -2.8]], 'trench');
    R(-7.9, 1.6, -2.9, -2.84, 'rack');
    for (let i = 0; i < 6; i++) { const x = -6.9 + 1.3 * i; R(x - 0.5, x + 0.5, -2.84, -2.48, 'inv'); T(x, -2.6, 'INV' + (i + 1), 'lbl'); L(x - 0.65, -3.45, x - 0.65, -2.9, 'dc'); L(x - 0.76, -2.4, x - 0.76, -2.0, 'ac'); }
    R(0.4, 1.4, -2.84, -2.48, 'slot'); T(0.9, -2.6, '7th', 'lbl');
    PL([[-7.3, -2.0], [2.0, -2.0], [2.3, -2.3]], 'ac');
    R(2.0, 2.9, -2.8, -2.0, 'lv'); T(2.45, -2.35, 'AC\nCOMB', 'lbl'); R(2.9, 3.8, -2.8, -2.0, 'lv'); T(3.35, -2.35, 'ACB', 'lbl');
    R(3.8, 5.3, -2.425, -1.975, 'duct');
    R(4.6, 7.8, -2.9, 0.1, 'fence'); R(5.3, 7.1, -2.5, -0.9, 'tx'); for (const z of [-2.1, -1.7, -1.3]) C(6.2, z, 0.2, 'coil');
    T(6.2, 0.5, 'TX BAY 11 kV', 'lbl');
    [-2.08, -1.7, -1.32].forEach((z, j) => PL([[6.2, z], [8.05 + 0.1 * j, z], [8.05 + 0.1 * j, -2.7 + 0.1 * j], [8.8 + 0.2 * j, -2.7 + 0.1 * j]], 'mvc'));
    for (let i = 0; i < 3; i++) { R(8.6 + 0.8 * i, 9.4 + 0.8 * i, -2.85, -1.95, 'mv'); T(9.0 + 0.8 * i, -2.35, 'P' + (i + 1), 'lbl'); }
    R(8.4, 11.2, -1.95, -0.75, 'arc'); R(8.6, 11.0, -1.93, -1.35, 'mat', 'opacity=".6"');
    PL([[9.6, -2.3], [20, -2.3]], 'mvc'); PL([[10.4, -2.62], [20, -2.62]], 'mvc');
    PL([[-7.4, -1.3], [11.6, -1.3]], 'ctl');
    PL([[-7.8, 2.85], [-7.8, -2.85], [11.8, -2.85], [11.8, 2.85]], 'earth');
    for (const x of [-5, -2.2]) { C(x, -3.0, 0.22, 'fan'); }
    for (const x of [3, 6, 9]) R(x - 0.5, x + 0.5, 3.12, 3.22, 'louv'); for (const z of [-0.9, 0.9]) R(-8.22, -8.12, z - 0.5, z + 0.5, 'louv');
    R(11.6, 11.9, -0.28, 0.68, 'ac2'); R(12.2, 12.6, -0.25, 0.65, 'ac2');
    R(-8.12, -7.88, 1.05, 1.95, 'door'); L(-7.9, 1.05, -7.0, 1.05, 'swing'); R(11.88, 12.12, 1.15, 2.05, 'door'); L(11.9, 1.15, 11.0, 1.15, 'swing');
    for (const [x, z] of [[-7.8, 2.3], [11.8, -0.5]]) C(x, z, 0.12, 'ext');
    for (const x of [-4, 3, 9]) C(x, 0, 0.1, 'det');
    L(-7.6, -1.45, 3.9, -1.45, 'line'); PL([[-7.4, 1.6], [11.4, 1.6]], 'route');
    DH(-8, 12, 4.2, '20.0 m'); DV(-3, 3, -9.5, '6.0 m'); DH(-7.4, 1.4, 3.7, '7 slots x 1.3 m (6 fitted)');
    DH(8.6, 11.0, -3.6, '3 x 0.8 = 2.4 m'); DV(-1.95, -0.75, 11.7, '1.2 m arc');
    T(-3, 0.3, 'INVERTER ROOM  -  6 x 100 kW = 600 kWac', 'h'); T(9.8, 1.0, 'MV / RMU ZONE', 'h'); T(3.4, 0.8, 'LV', 'lbl');
    N(-8.8, -6, -8.8, -7.4, 'DC trench from PV array', 'start'); N(-5.5, -2.0, -6.2, -5.8, 'Grated LV trench + ladder tray', 'middle');
    N(6.2, -1.7, 6.2, -5.6, 'TX 630 kVA 0.4/11 kV Dyn11\nin fenced bay', 'middle'); N(9.8, -2.9, 9.8, -6.3, '11 kV RMU: TX prot. / ring in / ring out', 'middle');
    N(19.9, -2.5, 18, -4.8, '11 kV ring in/out\nto grid connection', 'middle'); N(2.4, -2.8, 0.3, -6.4, 'AC combiner (6 x MCCB, SPD, meter)\n+ 1250 A ACB', 'middle');
    N(-3.6, -3.0, -2.2, -4.7, 'Exhaust fans', 'middle'); N(6, 3.17, 6, 4.1, 'Intake louvres', 'middle'); N(-4.2, -1.3, -6.5, 0, 'Overhead perforated tray', 'middle');
  },
});

mkdirSync('drawings', { recursive: true });
writeFileSync('drawings/6mw-plan.svg', plan6);
writeFileSync('drawings/633kw-plan.svg', plan633);
console.log('SVG written');

const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', process.env.CHROME].find((p) => p && existsSync(p));
if (chrome) {
  const b = await puppeteer.launch({ executablePath: chrome, headless: 'new' });
  try {
    for (const n of ['6mw-plan', '633kw-plan']) {
      const p = await b.newPage();
      const svg = n === '6mw-plan' ? plan6 : plan633;
      const m = /width="(\d+)" height="(\d+)"/.exec(svg);
      await p.setViewport({ width: +m[1], height: +m[2], deviceScaleFactor: 1.5 });
      await p.setContent(`<body style="margin:0">${svg}</body>`);
      await p.screenshot({ path: `drawings/${n}.png` });
      await p.pdf({ path: `drawings/${n}.pdf`, width: `${m[1]}px`, height: `${m[2]}px`, printBackground: true, pageRanges: '1' });
    }
  } finally { await b.close(); }
  console.log('PNG + PDF written');
}
