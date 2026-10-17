// Text box and full screen (Samsung Notes): the text panel docks beside the tool strip, taps inside / beside an open box,
// full screen keeps the tool strip with a round exit button.
// usage: node dev/textbox-test.mjs [screenshot dir]   (default dev/out/textbox; LOOK at the pictures)
import { chromium } from '/tmp/npmtest/node_modules/playwright/index.mjs';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)), web = path.join(here, '..', 'web');
const out = process.argv[2] || process.env.SHOTS || path.join(here, 'out', 'textbox');
fs.mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.wasm': 'application/wasm', '.pdf': 'application/pdf', '.png': 'image/png', '.svg': 'image/svg+xml', '.ttf': 'font/ttf' };
const server = http.createServer((req, rsp) => {
  const p = decodeURIComponent(req.url.split('?')[0]); const f = path.join(web, p === '/' ? 'index.html' : p);
  if (!f.startsWith(web) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rsp.writeHead(404); rsp.end('nf'); return; }
  rsp.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' }); fs.createReadStream(f).pipe(rsp);
}).listen(0);
let fails = 0;
const check = (n, ok, x = '') => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + x : '')); if (!ok) fails++; };
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const page = await (await browser.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.addInitScript(() => { for (const C of [Map, WeakMap]) { if (!C.prototype.getOrInsertComputed) C.prototype.getOrInsertComputed = function (k, f) { if (!this.has(k)) this.set(k, f(k)); return this.get(k); }; } });
await page.goto(`http://localhost:${server.address().port}/`);
await page.waitForFunction(() => window.app && window.app.library, null, { timeout: 30000 });
await page.waitForTimeout(800);
const ev = (fn, arg) => page.evaluate(fn, arg);
const shot = name => page.screenshot({ path: path.join(out, name + '.png') });
const visible = sel => ev(s => [...document.querySelectorAll(s)].filter(e => e.checkVisibility() && e.getBoundingClientRect().width > 0).length, sel);
const put = (file, name) => ev(async ([b64, name]) => { const { host } = await import('/js/host.js'); const p = app.library.root + '\\' + name; host._fake.put(p, Uint8Array.from(atob(b64), c => c.charCodeAt(0))); return p; },
  [fs.readFileSync(path.join(here, 'samples', file)).toString('base64'), name]);

const docPath = await put('sample-ko.pdf', '글상자.pdf');
await ev(async p => { if (app.libraryDialog) app.libraryDialog.dismiss(); await app.openPdf(p, false, 0, true); }, docPath); await page.waitForTimeout(1500);
const st = () => ev(() => ({ inline: !!app.inlineElement, fresh: app.inlineFresh, n: app.store.elements.filter(e => e.kind === 'text').length, text: app.inlineEdit ? app.inlineEdit.value : null }));
const dockRect = () => ev(() => { const d = document.querySelector('[data-tag="text_panel"]'); if (!d || !d.checkVisibility()) return null; const r = d.getBoundingClientRect(), s = app.bottomBar.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, sl: s.left, st: s.top, sb: s.bottom, bar: !!d.querySelector('[data-tag="inline_style_bar"]') }; });

// 1. the keyboard button opens the text panel beside the strip, before any box exists
await ev(() => app.textButton.click()); await page.waitForTimeout(400);
let d = await dockRect();
check('keyboard button: text panel docked beside the strip', !!d && d.bar && Math.abs(d.r - d.sl) <= 1 && Math.abs(d.t - d.st) <= 1 && Math.abs(d.b - d.sb) <= 1, JSON.stringify(d));
check('panel without a box: no delete / done', await ev(() => !document.querySelector('[data-tag="text_panel"] [data-tag="text_done"]').checkVisibility()));
await ev(() => document.querySelector('[data-tag="text_panel"] [data-tag="text_bigger"]').click());
check('panel without a box: size change becomes the default', await ev(() => document.querySelector('[data-tag="text_panel"] [data-tag="text_size"]').textContent) === '17pt');
await shot('1-panel');
// 2. tap on the page: a new box, the panel follows it
await page.mouse.click(600, 400); await page.waitForTimeout(400);
d = await dockRect();
check('new box: panel stays docked with delete / done', !!d && d.bar && await ev(() => document.querySelector('[data-tag="text_panel"] [data-tag="text_done"]').checkVisibility()) && (await st()).inline);
check('new box uses the default size', await ev(() => app.pointsOf(app.inlineElement)) === 17);
check('no floating bar over the page', await ev(() => !app.viewportLayer.querySelector('[data-tag="inline_style_bar"]')));
await page.keyboard.type('첫 글상자');
await ev(() => document.querySelector('[data-tag="text_panel"] [data-tag="text_bold"]').click());
check('bold from the panel applies to the box', await ev(() => app.inlineElement.bold && document.activeElement === app.inlineEdit));
const r = await ev(() => { const b = app.inlineEdit.getBoundingClientRect(); return [b.left, b.top, b.width, b.height]; });
await shot('2-box');
// 3. clicking inside the open box keeps it
await page.mouse.click(r[0] + r[2] - 6, r[1] + r[3] - 3); await page.waitForTimeout(300);
let s1 = await st(); check('click inside the open box keeps editing it', s1.inline && s1.text === '첫 글상자' && s1.n === 0, JSON.stringify(s1));
// 4. a tap beside it only closes it
await page.mouse.click(600, 650); await page.waitForTimeout(300);
s1 = await st(); check('tap beside the open box closes it, no new box', !s1.inline && s1.n === 1, JSON.stringify(s1));
check('panel back to the default style', !!(await dockRect()));
// 5. a tap inside the saved box (edge included) reopens it
await page.mouse.click(r[0] + 2, r[1] + r[3] - 2); await page.waitForTimeout(300);
s1 = await st(); check('tap inside the saved box reopens it', s1.inline && !s1.fresh && s1.text === '첫 글상자' && s1.n === 1, JSON.stringify(s1));
await page.mouse.click(600, 650); await page.waitForTimeout(300);
await page.mouse.click(600, 650); await page.waitForTimeout(300);
s1 = await st(); check('a second tap on empty space starts a new box', s1.inline && s1.fresh, JSON.stringify(s1));
// 6. keyboard button again ends typing and closes the panel
await ev(() => app.textButton.click()); await page.waitForTimeout(300);
check('keyboard again: panel closed', !(await dockRect()) && !(await st()).inline);
// 7. tapping a text box outside typing mode opens it with the panel
await ev(() => app.onElementTapped(app.store.elements.find(e => e.kind === 'text'))); await page.waitForTimeout(400);
check('editing a box outside typing mode shows the panel', !!(await dockRect()));
await page.keyboard.press('Escape'); await page.waitForTimeout(300);
check('Esc closes the box and the panel', !(await dockRect()) && !(await st()).inline);
// 8. full screen keeps the same tool strip, the header goes, the exit button shows
await ev(() => app.toggleFullscreen()); await page.waitForTimeout(400);
const fs1 = await ev(() => ({ strip: app.bottomBar.checkVisibility(), labels: [...app.bottomBar.querySelectorAll('.m-tb')].filter(e => e.checkVisibility()).length, header: app.header.checkVisibility(), exit: app.fullscreenExit.checkVisibility() }));
check('full screen: same strip, no header, exit button', fs1.strip && fs1.labels >= 14 && !fs1.header && fs1.exit, JSON.stringify(fs1));
await ev(() => app.textButton.click()); await page.waitForTimeout(300);
check('full screen: text panel docks beside the strip too', !!(await dockRect()));
check('full screen: exit button stays clear of the panel', await ev(() => { const b = app.fullscreenExit.getBoundingClientRect(), d = app.textDock.getBoundingClientRect(); return b.right <= d.left && b.width > 0; }));
await shot('3-fullscreen');
await ev(() => app.textButton.click());
await ev(() => app.fullscreenExit.click()); await page.waitForTimeout(300);
check('exit button leaves full screen', await ev(() => !app.fullscreen && app.header.checkVisibility()));
// 9. strip at the bottom: the floating bar over the box as before
await ev(() => app.setBarPlace('bottom')); await page.waitForTimeout(300);
await ev(() => app.textButton.click()); await page.waitForTimeout(300);
await page.mouse.click(600, 400); await page.waitForTimeout(300);
check('bottom strip: floating bar over the box, no panel', !(await dockRect()) && await ev(() => !!app.viewportLayer.querySelector('[data-tag="inline_style_bar"]')));
await ev(() => app.textButton.click()); await ev(() => app.setBarPlace('right'));
check('no page errors', errors.length === 0, errors.join(' | '));
await browser.close(); server.close();

console.log(fails ? `${fails} FAILED` : 'ALL PASS');
process.exit(fails ? 1 : 0);
