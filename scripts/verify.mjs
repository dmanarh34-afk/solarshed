// Builds nothing: serves ./dist via vite preview, loads it in headless Chrome, fails on console/page errors, saves screenshots.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', process.env.CHROME].find((p) => p && existsSync(p));
if (!chrome) { console.error('No Chrome/Edge found; set CHROME=path'); process.exit(2); }
const srv = spawn('npx', ['vite', 'preview', '--port', '4173', '--strictPort'], { shell: true, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 3000));
mkdirSync('shots', { recursive: true });
const errors = [];
const browser = await puppeteer.launch({ executablePath: chrome, headless: 'new', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1500, height: 900 });
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errors.push(`[${m.type()}] ${m.text()}`); });
  page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message));
  await page.goto('http://localhost:4173/', { waitUntil: 'load' });
  await page.waitForFunction('window.__frames > 5', { timeout: 60000 });
  for (const sc of ['6mw', '633kw']) {
    await page.evaluate((id) => window.__app.loadScene(id), sc);
    await new Promise((r) => setTimeout(r, 600));
    for (const v of Object.keys(await page.evaluate(() => window.__app.VIEWS))) {
      await page.evaluate((n) => { const { VIEWS, camera, controls } = window.__app; const [p, t] = VIEWS[n]; camera.position.set(...p); controls.target.set(...t); controls.update(); }, v);
      await new Promise((r) => setTimeout(r, 500));
      await page.screenshot({ path: `shots/${sc}_${v.replace(/[^A-Za-z0-9]+/g, '_')}.png` });
    }
    console.log(sc, 'meshes:', await page.evaluate(() => { let m = 0; window.__app.scene.traverse((o) => { if (o.isMesh) m++; }); return m; }));
  }
} finally { await browser.close(); srv.kill(); }
if (errors.length) { console.error('ERRORS:\n' + errors.join('\n')); process.exit(1); }
console.log('verify OK: no console errors; screenshots in ./shots');
