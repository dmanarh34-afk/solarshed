import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { buildPlant, shellMats, xrayMats } from './build.js';
import { buildCompact } from './build633.js';
import { initPanels } from './panels.js';

const $ = (s) => document.querySelector(s);
const showErr = (m) => { const e = $('#err'); e.textContent = m; e.style.display = 'block'; console.error(m); };
window.addEventListener('error', (e) => showErr(e.message));

/* ---------------- renderer / scene ---------------- */
const canvas = $('#gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.85;

const css = new CSS2DRenderer();
css.domElement.className = 'css2d';
$('#app').insertBefore(css.domElement, $('#top'));

const scene = new THREE.Scene();
scene.background = new THREE.Color('#121921');
scene.fog = new THREE.Fog('#121921', 70, 160);
const pm = new THREE.PMREMGenerator(renderer);
scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.4;

const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 400);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI * 0.495;
controls.minDistance = 1.5; controls.maxDistance = 90;

const sun = new THREE.DirectionalLight('#fff4e0', 1.1);
sun.position.set(16, 30, 22);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -33, right: 31, top: 16, bottom: -16, near: 1, far: 90 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
sun.target.position.set(-1.5, 0, 0);
scene.add(sun, sun.target, new THREE.HemisphereLight('#bcd2ea', '#40382f', 0.35));

/* ---------------- layers ---------------- */
const LAYERS = [
  ['shell', 'Building shell (walls)', '#9fb0c0'], ['roof', 'Roof & steelwork', '#9fb0c0'],
  ['slab', 'Slab, trenches, yard', '#a3a8ad'], ['covers', 'Trench cover plates', '#5d646b'],
  ['marks', 'Floor markings & signs', '#f2c500'], ['inv', '100 kW inverters', '#4fd0ff'],
  ['dc', 'DC input cabling', '#d0262e'], ['ac', 'LV AC cabling', '#e0a02e'],
  ['lv', 'LV AC combiner / ACB', '#e0a02e'], ['tx', 'Step-up transformer bay', '#c07a2a'],
  ['mv', 'MV switchgear lineup', '#ff5a5a'], ['mvc', 'MV cabling / outgoing', '#c8232c'],
  ['hvac', 'HVAC & ventilation', '#7ee0a8'], ['fire', 'Fire suppression & safety', '#ff8a3d'],
  ['light', 'Lighting', '#fff3a8'], ['labels', 'Callout labels', '#ffffff'],
];
const layers = {};
LAYERS.forEach(([id]) => { layers[id] = new THREE.Group(); layers[id].name = id; scene.add(layers[id]); });

const labels = [];
let MAJOR = /^$/;
const anim = [];
const ctx = {
  add: (id, o) => layers[id].add(o),
  tag: (o, info) => { o.userData.info = info; },
  anim,
  label: (layerId, pos, text, cls) => {
    const el = document.createElement('div');
    el.className = `lbl ${cls || ''}`;
    el.innerHTML = text.replace(/\n/g, '<br>');
    const o = new CSS2DObject(el);
    o.position.set(...pos);
    scene.add(o);
    const l = { o, layer: layerId, major: MAJOR.test(text), pos: new THREE.Vector3(...pos) };
    el.addEventListener('click', () => flyTo(l.pos));
    labels.push(l);
  },
};

let plant = null;

/* ---------------- UI: layers ---------------- */
const vis = Object.fromEntries(LAYERS.map(([id]) => [id, true]));
function apply() {
  const cut = $('#cutaway').checked;
  for (const id in layers) layers[id].visible = vis[id];
  if (!plant) return;
  plant.frontWall.visible = vis.shell && !cut;
  labels.forEach((l) => { l.o.visible = vis.labels && vis[l.layer]; });
  const x = $('#xray').checked;
  xrayMats.forEach((m) => { m.transparent = x; m.opacity = x ? 0.16 : 1; m.depthWrite = !x; m.needsUpdate = true; });
  plant.internals.forEach((g) => { g.visible = x; });
}
LAYERS.forEach(([id, name, col]) => {
  const l = document.createElement('label');
  l.className = 'row';
  l.innerHTML = `<input type="checkbox" checked><i style="background:${col}"></i>${name}`;
  l.querySelector('input').addEventListener('change', (e) => { vis[id] = e.target.checked; apply(); });
  $('#layers').appendChild(l);
});
['cutaway', 'xray'].forEach((id) => $('#' + id).addEventListener('change', apply));
$('#rotate').addEventListener('change', (e) => { controls.autoRotate = e.target.checked; controls.autoRotateSpeed = 1.2; });
function setOpacity() {
  const v = $('#opacity').value / 100;
  shellMats.forEach((m) => { m.opacity = v; m.transparent = v < 0.99; m.depthWrite = v >= 0.99; m.needsUpdate = true; });
}
$('#opacity').addEventListener('input', setOpacity);
apply(); setOpacity();

/* ---------------- camera views ---------------- */
let VIEWS = {};
let tween = null;
function goTo(p, t, dur = 1.1) {
  tween = { t0: performance.now(), dur: dur * 1000, p0: camera.position.clone(), t0v: controls.target.clone(), p1: new THREE.Vector3(...p), t1: new THREE.Vector3(...t) };
}
function flyTo(target) {
  const dir = camera.position.clone().sub(controls.target).normalize();
  goTo(target.clone().addScaledVector(dir, 6).toArray(), target.toArray(), 0.9);
}
function viewButtons() {
  $('#views').innerHTML = '';
  Object.entries(VIEWS).forEach(([n, [p, t]]) => {
    const b = document.createElement('button'); b.textContent = n; b.onclick = () => goTo(p, t); $('#views').appendChild(b);
  });
}

/* ---------------- selection ---------------- */
const ray = new THREE.Raycaster();
const hl = new THREE.Box3Helper(new THREE.Box3(), 0xffb020);
hl.visible = false; scene.add(hl);
let sel = null;
const visibleChain = (o) => { for (; o; o = o.parent) if (!o.visible) return false; return true; };
function pick(ev) {
  const r = canvas.getBoundingClientRect();
  ray.setFromCamera(new THREE.Vector2(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1), camera);
  const hits = ray.intersectObjects(Object.values(layers), true);
  for (const h of hits) {
    if (!visibleChain(h.object) || h.object.isLineSegments) continue;
    const m = h.object.material;
    if (m && m.transparent && m.opacity < 0.5 && !xrayMats.includes(m)) continue;
    for (let o = h.object; o; o = o.parent) if (o.userData.info) return o;
    return null;
  }
  return null;
}
const panels = initPanels({ $, getSel: () => sel });
function select(o) {
  sel = o;
  if (!o) hl.visible = false; else { hl.box.setFromObject(o); hl.visible = true; }
  panels.renderInfo();
  if (o) panels.switchTab('sel');
}
let down = null;
canvas.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY]; });
canvas.addEventListener('pointerup', (e) => { if (down && Math.hypot(e.clientX - down[0], e.clientY - down[1]) < 5) select(pick(e)); down = null; });

/* ---------------- loop ---------------- */
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false); css.setSize(w, h);
  camera.aspect = w / h; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

const clock = new THREE.Clock();
function loop() {
  const dt = clock.getDelta(), t = clock.elapsedTime;
  if (tween) {
    const k = Math.min(1, (performance.now() - tween.t0) / tween.dur);
    const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    camera.position.lerpVectors(tween.p0, tween.p1, e); controls.target.lerpVectors(tween.t0v, tween.t1, e);
    if (k >= 1) tween = null;
  }
  labels.forEach((l) => { const on = l.major || camera.position.distanceTo(l.pos) < 16; l.o.element.style.opacity = on ? 1 : 0; l.o.element.style.pointerEvents = on ? 'auto' : 'none'; });
  anim.forEach((f) => f(t, dt));
  plant.leds.forEach((l) => { l.comm.emissiveIntensity = 0.3 + 1.8 * (Math.sin(t * 4 + l.phase) > 0 ? 1 : 0); });
  controls.update();
  renderer.render(scene, camera);
  css.render(scene, camera);
  window.__frames = (window.__frames || 0) + 1;
  requestAnimationFrame(loop);
}
/* ---------------- scene switching ---------------- */
const SCENES = {
  '6mw': {
    label: '6 MW  |  60 x 100 kW', sub: '6 MWac block · 60 x 100 kW inverters · 33 kV MV · no PV modules modelled', build: buildPlant, sun: [-1.5, 0], shadow: [-33, 31, 16, -16],
    major: /^(60 x 100|LV AC combiner:|Step-up TX|MV switchgear 36|33 kV OUT|DC trench from PV|Roof exhaust|Clean-agent|Roof: steel)/,
    views: {
      Overview: [[24, 19, 36], [2, 0, 0]], 'Inverter hall': [[-10, 2.2, 2.4], [-13, 1.4, -4]], 'LV + TX': [[3, 3, 9], [6.5, 1.2, 0]],
      'MV room': [[10, 2.6, 4.5], [12.4, 1.2, -3.8]], 'Top plan': [[-1, 46, 0.1], [-1, 0, 0]], Trench: [[8, 5, 6], [8, -0.2, -2.5]], 'Roof / HVAC': [[10, 12, 14], [-1, 4.5, 0]],
    },
  },
  '633kw': {
    label: '633 kW  |  6 x 100 kW', sub: '633 kWp DC / 600 kWac · 6 x 100 kW inverters · 11 kV RMU · no PV modules modelled', build: buildCompact, sun: [2, 0], shadow: [-14, 14, 9, -9],
    major: /^(6 x 100|LV AC combiner|Step-up TX|11 kV RMU|11 kV OUT|DC trench from PV|Exhaust fans|7th unit|Roof ghosted)/,
    views: {
      Overview: [[17, 11, 19], [4, 0.5, -0.5]], 'Inverter rack': [[-3, 2.0, 1.6], [-3.4, 1.1, -2.6]], 'LV + TX': [[5, 2.6, 3.6], [5, 1.1, -2]],
      'RMU / MV': [[9.8, 1.8, 2.4], [9.8, 1, -2.4]], 'Top plan': [[2, 24, 0.1], [2, 0, 0]], Trench: [[3, 4, 1.5], [3, -0.2, -2.2]], 'Roof / HVAC': [[6, 9, 9], [2, 3.2, -1]],
    },
  },
};
let current = null;
function loadScene(id) {
  if (!SCENES[id]) id = '6mw';
  const sc = SCENES[id];
  for (const g of Object.values(layers)) g.clear();
  labels.forEach((l) => { scene.remove(l.o); l.o.element.remove(); });
  labels.length = 0; anim.length = 0; shellMats.length = 0; xrayMats.length = 0;
  select(null);
  MAJOR = sc.major; VIEWS = sc.views;
  try { plant = sc.build(ctx); } catch (e) { showErr('Build failed: ' + e.message); throw e; }
  sun.target.position.set(sc.sun[0], 0, 0);
  Object.assign(sun.shadow.camera, { left: sc.shadow[0], right: sc.shadow[1], top: sc.shadow[2], bottom: sc.shadow[3] });
  sun.shadow.camera.updateProjectionMatrix();
  panels.setScene(id);
  document.querySelector('#top h1 small').textContent = sc.sub;
  apply(); setOpacity(); viewButtons();
  const [p, t] = VIEWS.Overview; camera.position.set(...p); controls.target.set(...t); tween = null;
  document.querySelectorAll('#scenes button').forEach((b) => b.classList.toggle('on', b.dataset.id === id));
  current = id; try { history.replaceState(null, '', '#' + id); } catch (e) { /* ignore */ }
}
Object.entries(SCENES).forEach(([id, sc]) => {
  const b = document.createElement('button'); b.textContent = sc.label; b.dataset.id = id; b.onclick = () => loadScene(id); $('#scenes').appendChild(b);
});
loadScene(location.hash.slice(1) || '6mw');
window.__app = { camera, controls, goTo, get VIEWS() { return VIEWS; }, select, scene, layers, loadScene, get current() { return current; } };
loop();
