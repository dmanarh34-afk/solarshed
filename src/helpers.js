import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export { THREE };

const mats = new Map();
const geos = new Map();

export function mat(color, o = {}) {
  const k = color + JSON.stringify(o);
  let m = mats.get(k);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.15, ...o });
    mats.set(k, m);
  }
  return m;
}
export const glow = (color, i = 1.6) => mat(color, { emissive: color, emissiveIntensity: i, roughness: 0.4 });

function geo(key, make) {
  let g = geos.get(key);
  if (!g) { g = make(); geos.set(key, g); }
  return g;
}

export function box(w, h, d, color, o) {
  const m = new THREE.Mesh(geo(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d)), mat(color, o));
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
export function cyl(rt, rb, h, color, o, seg = 20) {
  const m = new THREE.Mesh(geo(`c${rt},${rb},${h},${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg)), mat(color, o));
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
export function put(o, x, y, z) { o.position.set(x, y, z); return o; }

/** Smooth cable through points (world coords). */
export function tube(points, r, color, o = {}) {
  const c = new THREE.CatmullRomCurve3(points.map((p) => (p.isVector3 ? p : new THREE.Vector3(...p))), false, 'catmullrom', 0.12);
  const g = new THREE.TubeGeometry(c, Math.max(10, points.length * 8), r, 6, false);
  const m = new THREE.Mesh(g, mat(color, { roughness: 0.45, metalness: 0.05, ...o }));
  m.castShadow = true;
  return m;
}

/** Merge many boxes [x,y,z,w,h,d] into one mesh. */
export function mergedBoxes(list, color, o) {
  const gs = list.map(([x, y, z, w, h, d]) => new THREE.BoxGeometry(w, h, d).translate(x, y, z));
  const m = new THREE.Mesh(mergeGeometries(gs), mat(color, o));
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

/** Galvanised cable ladder along local X (rotate group for other directions). */
export function ladder(len, width, color = '#9aa4ad') {
  const g = new THREE.Group();
  const list = [];
  for (let x = -len / 2 + 0.2; x < len / 2; x += 0.45) list.push([x, 0, 0, 0.025, 0.02, width]);
  g.add(mergedBoxes(list, color, { metalness: 0.5 }));
  g.add(put(box(len, 0.045, 0.025, color, { metalness: 0.5 }), 0, 0.01, width / 2));
  g.add(put(box(len, 0.045, 0.025, color, { metalness: 0.5 }), 0, 0.01, -width / 2));
  return g;
}

const texCache = new Map();
export function canvasTex(key, w, h, draw) {
  let t = texCache.get(key);
  if (!t) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    texCache.set(key, t);
  }
  return t;
}

/** Flat text sign (plane facing +Z). */
export function sign(text, w, h, o = {}) {
  const { bg = '#f4f1e8', fg = '#111', border = null, title = false, ppm = 360, align = 'center' } = o;
  const key = `s|${text}|${w}|${h}|${bg}|${fg}|${border}|${title}|${align}`;
  const W = Math.round(w * ppm), H = Math.round(h * ppm);
  const t = canvasTex(key, W, H, (c) => {
    if (bg) { c.fillStyle = bg; c.fillRect(0, 0, W, H); } else c.clearRect(0, 0, W, H);
    if (border) { c.strokeStyle = border; c.lineWidth = Math.max(3, H * 0.05); c.strokeRect(c.lineWidth / 2, c.lineWidth / 2, W - c.lineWidth, H - c.lineWidth); }
    const lines = text.split('\n');
    const maxLen = Math.max(...lines.map((l) => l.length), 1);
    const px = Math.min((H * 0.8) / (lines.length * 1.2), (W * 0.92) / (maxLen * 0.58));
    c.fillStyle = fg; c.textBaseline = 'middle'; c.textAlign = align;
    const x = align === 'center' ? W / 2 : W * 0.05;
    lines.forEach((l, i) => {
      c.font = `${title && i === 0 ? 'bold ' : ''}${px * (title && i === 0 ? 1.1 : 1)}px Arial, sans-serif`;
      c.fillText(l, x, H / 2 + (i - (lines.length - 1) / 2) * px * 1.2);
    });
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, roughness: 0.7, transparent: !bg, polygonOffsetFactor: -2, polygonOffsetUnits: -2, polygonOffset: true }));
  return m;
}

/** DANGER high-voltage triangle sign. */
export function hvSign(w, label = 'DANGER\n33 000 V') {
  const key = `hv|${label}`;
  const S = 256;
  const t = canvasTex(key, S, S * 1.25, (c) => {
    c.fillStyle = '#f5d000'; c.fillRect(0, 0, S, S * 1.25);
    c.strokeStyle = '#111'; c.lineWidth = 8; c.strokeRect(4, 4, S - 8, S * 1.25 - 8);
    c.fillStyle = '#111';
    c.beginPath(); c.moveTo(S / 2, 22); c.lineTo(S - 24, S - 40); c.lineTo(24, S - 40); c.closePath(); c.lineWidth = 12; c.stroke();
    c.fillStyle = '#111';
    c.beginPath(); c.moveTo(S * 0.55, 70); c.lineTo(S * 0.38, S * 0.56); c.lineTo(S * 0.5, S * 0.56); c.lineTo(S * 0.44, S * 0.8); c.lineTo(S * 0.64, S * 0.5); c.lineTo(S * 0.52, S * 0.5); c.closePath(); c.fill();
    c.textAlign = 'center'; c.font = 'bold 34px Arial';
    label.split('\n').forEach((l, i) => c.fillText(l, S / 2, S + 22 + i * 38));
  });
  return new THREE.Mesh(new THREE.PlaneGeometry(w, w * 1.25), new THREE.MeshStandardMaterial({ map: t, roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
}

/** Arc-flash / shock label (ANSI/NFPA 70E style, illustrative values). */
export function arcSign(w, h = w * 0.72) {
  const W = 400, H = Math.round(400 * (h / w));
  const t = canvasTex('arc', W, H, (c) => {
    c.fillStyle = '#fff'; c.fillRect(0, 0, W, H);
    c.fillStyle = '#ff6a00'; c.fillRect(0, 0, W, H * 0.24);
    c.fillStyle = '#000'; c.textAlign = 'center'; c.font = 'bold 44px Arial'; c.fillText('WARNING', W / 2, H * 0.17);
    c.font = 'bold 24px Arial';
    c.fillText('ARC FLASH & SHOCK HAZARD', W / 2, H * 0.37);
    c.font = '21px Arial'; c.textAlign = 'left';
    ['Arc-flash boundary : 1.5 m', 'Incident energy   : 8.2 cal/cm2', 'Working distance   : 910 mm', 'PPE category        : 4  (illustrative)', 'Shock limited appr. : 0.5 m @ 36 kV'].forEach((l, i) => c.fillText(l, 22, H * 0.52 + i * H * 0.115));
    c.strokeStyle = '#ff6a00'; c.lineWidth = 8; c.strokeRect(4, 4, W - 8, H - 8);
  });
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
}

/** Single-line mimic diagram plate. */
export function mimic(kind, w, h) {
  const W = 256, H = Math.round(256 * h / w);
  const t = canvasTex(`mimic|${kind}`, W, H, (c) => {
    c.fillStyle = '#2a3138'; c.fillRect(0, 0, W, H);
    c.strokeStyle = '#e8edf0'; c.fillStyle = '#e8edf0'; c.lineWidth = 7;
    const cx = W / 2;
    c.beginPath(); c.moveTo(18, 30); c.lineTo(W - 18, 30); c.lineWidth = 10; c.stroke(); // busbar
    c.lineWidth = 6;
    c.beginPath(); c.moveTo(cx, 30); c.lineTo(cx, H * 0.30); c.stroke();
    if (kind === 'vcb' || kind === 'vcb-in' || kind === 'vcb-out') {
      c.strokeRect(cx - 22, H * 0.30, 44, 52);
      c.beginPath(); c.moveTo(cx - 22, H * 0.30); c.lineTo(cx + 22, H * 0.30 + 52); c.moveTo(cx + 22, H * 0.30); c.lineTo(cx - 22, H * 0.30 + 52); c.stroke();
      c.beginPath(); c.moveTo(cx, H * 0.30 + 52); c.lineTo(cx, H * 0.66); c.stroke();
      c.beginPath(); c.arc(cx + 34, H * 0.30 + 26, 12, 0, 7); c.stroke(); // CT
    } else if (kind === 'fuse') {
      c.strokeRect(cx - 12, H * 0.30, 24, 60);
      c.beginPath(); c.moveTo(cx, H * 0.30 + 60); c.lineTo(cx, H * 0.66); c.stroke();
    } else if (kind === 'vt') {
      c.beginPath(); c.arc(cx - 12, H * 0.42, 22, 0, 7); c.stroke(); c.beginPath(); c.arc(cx + 12, H * 0.42, 22, 0, 7); c.stroke();
      c.beginPath(); c.moveTo(cx, H * 0.30); c.lineTo(cx, H * 0.34); c.stroke();
    } else { // spare / earthed
      c.strokeRect(cx - 22, H * 0.30, 44, 52);
      c.setLineDash([8, 8]); c.beginPath(); c.moveTo(cx, H * 0.30 + 52); c.lineTo(cx, H * 0.66); c.stroke(); c.setLineDash([]);
    }
    // earth switch / feeder
    c.beginPath(); c.moveTo(cx, H * 0.66); c.lineTo(cx, H * 0.78); c.stroke();
    c.beginPath(); c.moveTo(cx - 16, H * 0.78); c.lineTo(cx + 16, H * 0.78); c.moveTo(cx - 10, H * 0.83); c.lineTo(cx + 10, H * 0.83); c.moveTo(cx - 4, H * 0.88); c.lineTo(cx + 4, H * 0.88); c.stroke();
  });
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
}

/** Diagonal yellow/black hazard stripe texture. */
export function stripeTex() {
  return canvasTex('stripe', 128, 128, (c) => {
    c.fillStyle = '#f2c500'; c.fillRect(0, 0, 128, 128);
    c.fillStyle = '#16181a';
    for (let i = -2; i < 6; i++) { c.beginPath(); c.moveTo(i * 32, 0); c.lineTo(i * 32 + 16, 0); c.lineTo(i * 32 + 16 + 128, 128); c.lineTo(i * 32 + 128, 128); c.fill(); }
  });
}

/** Wire-mesh fence texture (transparent). */
export function meshTex() {
  return canvasTex('mesh', 128, 128, (c) => {
    c.clearRect(0, 0, 128, 128);
    c.strokeStyle = '#e5c100'; c.lineWidth = 5;
    c.strokeRect(0, 0, 128, 128);
    c.lineWidth = 3; c.strokeStyle = '#c9ced4';
    for (let i = 16; i < 128; i += 16) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, 128); c.moveTo(0, i); c.lineTo(128, i); c.stroke(); }
  });
}
