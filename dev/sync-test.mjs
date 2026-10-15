// Device sync: sync.js against the real Android server class (DeviceSync.java) when SYNC_PORT/SYNC_CODE/SYNC_LIB/SYNC_ASSETS are set
// (sh dev/sync-harness.sh ../HDnotes sets them up), plus pure unit checks.   node dev/sync-test.mjs
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os';
import { referencedAssets, parseAddress, relPath, buildRows, planSync, nextBaseline, SyncClient, transferDocument, SyncError } from '../web/js/sync.js';
import dgram from 'node:dgram';
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fail++; };

ok(parseAddress('192.168.0.5:4000').port === 4000 && parseAddress('http://10.0.0.1:99').host === '10.0.0.1' && !parseAddress('example.com:80') && !parseAddress('300.1.1.1:5'), 'address parsing');
ok(referencedAssets(JSON.stringify({ elements: [{ asset: '11111111-1111-1111-1111-111111111111.png' }, { kind: 'video', text: '22222222-2222-2222-2222-222222222222.mp4', asset: 'tape-01.png' }] })).size === 2, 'referencedAssets');
ok(relPath('C:\\Lib\\Docs', 'C:\\Lib\\Docs\\폴더\\a b.pdf') === '폴더/a b.pdf' && relPath('C:\\Lib\\Docs', 'D:\\x.pdf') === null, 'relPath');
const rows = buildRows([{ path: 'a.pdf', size: 1, mtime: 1e12 }, { path: 'p.pdf', size: 1, mtime: 5 }], [{ path: 'a.pdf', size: 2, mtime: 1e12 + 600000 }, { path: 'c.pdf', size: 3, mtime: 5 }]);
ok(rows.length === 3 && rows.find(r => r.path === 'a.pdf').newer === 'pc' && !rows.find(r => r.path === 'p.pdf').pc && !rows.find(r => r.path === 'c.pdf').phone, 'buildRows');

// two-way plan
{
  const d = (path, mtime, size = 10) => ({ path, size, mtime });
  const T = 1.7e12;
  const base = { 'same.pdf': { pc: T, phone: T + 5 }, 'pc.pdf': { pc: T, phone: T }, 'ph.pdf': { pc: T, phone: T }, 'both.pdf': { pc: T, phone: T }, 'gonephone.pdf': { pc: T, phone: T }, 'gonepc.pdf': { pc: T, phone: T } };
  const phone = [d('same.pdf', T + 5), d('pc.pdf', T), d('ph.pdf', T + 60000), d('both.pdf', T + 90000), d('gonepc.pdf', T), d('newphone.pdf', T), d('first.pdf', T + 9e6), d('firstsame.pdf', T + 30000)];
  const pc = [d('same.pdf', T + 900), d('pc.pdf', T + 60000), d('ph.pdf', T), d('both.pdf', T + 30000), d('gonephone.pdf', T), d('newpc.pdf', T), d('first.pdf', T), d('firstsame.pdf', T)];
  const plan = Object.fromEntries(planSync(phone, pc, base).map(r => [r.path, r]));
  const is = (p, action, why, conflict = false) => ok(plan[p].action === action && plan[p].why === why && plan[p].conflict === conflict, `plan ${p}: ${action}/${why}` + (plan[p].action !== action || plan[p].why !== why ? `  (got ${plan[p].action}/${plan[p].why})` : ''));
  is('same.pdf', 'skip', 'same'); is('pc.pdf', 'push', 'pc-changed'); is('ph.pdf', 'pull', 'phone-changed');
  is('both.pdf', 'pull', 'both-changed', true); is('gonephone.pdf', 'skip', 'phone-deleted'); is('gonepc.pdf', 'skip', 'pc-deleted');
  is('newpc.pdf', 'push', 'pc-new'); is('newphone.pdf', 'pull', 'phone-new'); is('first.pdf', 'pull', 'newer'); is('firstsame.pdf', 'skip', 'same');
  const nb = nextBaseline({ 'old.pdf': { pc: 1, phone: 1 }, 'gonephone.pdf': { pc: T, phone: T } }, [d('a.pdf', 5), d('b.pdf', 6)], [d('a.pdf', 7), d('b.pdf', 8), d('gonephone.pdf', T)], new Set(['a.pdf']));
  ok(nb['a.pdf'].pc === 7 && nb['a.pdf'].phone === 5 && !nb['b.pdf'] && !nb['old.pdf'] && nb['gonephone.pdf'], 'nextBaseline keeps settled + one-sided, drops gone-on-both');
}

const port = process.env.SYNC_PORT, code = process.env.SYNC_CODE, lib = process.env.SYNC_LIB, rassets = process.env.SYNC_ASSETS;
if (port) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-')), pcLib = path.join(tmp, 'lib'), own = n => path.join(tmp, n); fs.mkdirSync(pcLib);
  const notes = new Map();
  const env = {
    async http(o) {
      const init = { method: o.method || 'GET', headers: o.headers || {} };
      if (o.readPath) init.body = fs.readFileSync(o.readPath); else if (o.text != null) init.body = o.text;
      const r = await fetch(o.url, init);
      if (o.savePath && r.ok) { fs.mkdirSync(path.dirname(o.savePath), { recursive: true }); fs.writeFileSync(o.savePath, Buffer.from(await r.arrayBuffer())); return { status: r.status, text: '' }; }
      return { status: r.status, text: init.method === 'HEAD' ? '' : await r.text() };
    },
    pcPath: rel => path.join(pcLib, ...rel.split('/')),
    isOpen: async rel => rel === 'pcopen.pdf',
    exportNote: async rel => notes.get(rel),
    importNote: async (rel, t) => { notes.set(rel, t); },
    assetPath: n => own(n), hasAsset: n => fs.existsSync(own(n)),
  };
  const addr = '127.0.0.1:' + port;
  try { await new SyncClient(env, addr, '000000').library(); ok(false, 'wrong code rejected'); } catch (e) { ok(e instanceof SyncError && /코드/.test(e.message), 'wrong code rejected'); }
  const c = new SyncClient(env, addr, code);
  const list = await c.library();
  ok(list.some(d => d.path === 'a.pdf') && list.some(d => d.path === '폴더/b c.pdf'), 'phone library listed (incl. folder + Korean/space names)');

  // pull: phone -> PC
  const r1 = await transferDocument(c, 'a.pdf', 'pull');
  ok(fs.readFileSync(env.pcPath('a.pdf'), 'utf8') === '%PDF-phone-A', 'pull: PDF downloaded');
  ok(fs.readFileSync(own('11111111-1111-1111-1111-111111111111.png'), 'utf8') === 'PNGDATA-phone' && r1.files === 2, 'pull: image downloaded');
  ok(JSON.parse(notes.get('a.pdf')).bookmarks[0] === 2, 'pull: notes applied');
  await transferDocument(c, '폴더/b c.pdf', 'pull');
  ok(fs.readFileSync(env.pcPath('폴더/b c.pdf'), 'utf8') === '%PDF-phone-B', 'pull: nested Korean path created');

  // push: PC -> phone (overwrite existing + new + pc-only image)
  fs.writeFileSync(env.pcPath('a.pdf'), '%PDF-pc-A-edited');
  const mine = '33333333-3333-3333-3333-333333333333.png'; fs.writeFileSync(own(mine), 'PNGDATA-pc');
  notes.set('a.pdf', JSON.stringify({ format: 'PDF Note annotations v2', elements: [{ page: 0, kind: 'image', asset: mine, text: '' }], bookmarks: [7] }));
  const r2 = await transferDocument(c, 'a.pdf', 'push');
  ok(fs.readFileSync(path.join(lib, 'a.pdf'), 'utf8') === '%PDF-pc-A-edited', 'push: phone PDF overwritten');
  ok(fs.readFileSync(path.join(rassets, mine), 'utf8') === 'PNGDATA-pc' && r2.files === 2, 'push: image uploaded');
  ok(JSON.parse(fs.readFileSync(path.join(rassets, 'note-a.pdf.json'), 'utf8')).bookmarks[0] === 7, 'push: notes stored on phone');
  fs.mkdirSync(path.dirname(env.pcPath('새/문서.pdf')), { recursive: true }); fs.writeFileSync(env.pcPath('새/문서.pdf'), '%PDF-new'); notes.set('새/문서.pdf', JSON.stringify({ format: 'PDF Note annotations v2', elements: [], bookmarks: [] }));
  await transferDocument(c, '새/문서.pdf', 'push');
  ok(fs.readFileSync(path.join(lib, '새', '문서.pdf'), 'utf8') === '%PDF-new', 'push: new document with new folder created on phone');
  // guards
  try { fs.writeFileSync(env.pcPath('pcopen.pdf'), 'x'); await transferDocument(c, 'pcopen.pdf', 'pull'); ok(false, 'pc-open guard'); } catch (e) { ok(/열려 있는/.test(e.message), 'pull refuses a document open on the PC'); }
  try { fs.writeFileSync(env.pcPath('open.pdf'), 'x'); notes.set('open.pdf', '{}'); await transferDocument(c, 'open.pdf', 'push'); ok(false, 'phone-open guard'); } catch (e) { ok(/열려 있는/.test(e.message), 'push refuses a document open on the phone'); }
  const bad = await env.http({ url: `http://${addr}/v1/pdf?p=${encodeURIComponent('../x.pdf')}`, headers: { 'X-Code': code } });
  ok(bad.status === 400, 'path traversal rejected');

  // phone info + UDP discovery answer (no code in it)
  const info = await c.info();
  ok(info && info.app === 'HDnotes' && info.id === 'test-phone-1' && info.name === 'Test "Phone"' && info.port === +port, 'GET /v1/info');
  const answer = await new Promise(res => {
    const u = dgram.createSocket('udp4'); const t = setTimeout(() => { u.close(); res(null); }, 2000);
    u.on('message', m => { clearTimeout(t); u.close(); res(m.toString('utf8')); });
    u.send(Buffer.from('HDNOTES-DISCOVER 1'), 43126, '127.0.0.1');
  });
  ok(answer && JSON.parse(answer).port === +port && !answer.includes(code), 'UDP discovery answer: port, no code');

  // two-way: baseline after a sync, then change one side each and plan again
  const walk = (dir, pre = '') => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name), pre + e.name + '/') : e.name.endsWith('.pdf') ? [{ path: pre + e.name, size: fs.statSync(path.join(dir, e.name)).size, mtime: fs.statSync(path.join(dir, e.name)).mtimeMs }] : []);
  const pcList = () => walk(pcLib);
  let base = nextBaseline({}, await c.library(), pcList(), new Set(['a.pdf', '폴더/b c.pdf']));
  ok(planSync(await c.library(), pcList(), base).filter(r => r.path === 'a.pdf' || r.path === '폴더/b c.pdf').every(r => r.action === 'skip'), 'right after a sync: nothing to do');
  const later = new Date(Date.now() + 60000);
  fs.writeFileSync(path.join(lib, 'a.pdf'), '%PDF-phone-A2'); fs.utimesSync(path.join(lib, 'a.pdf'), later, later);
  fs.writeFileSync(env.pcPath('폴더/b c.pdf'), '%PDF-pc-B2'); fs.utimesSync(env.pcPath('폴더/b c.pdf'), later, later);
  const plan = planSync(await c.library(), pcList(), base), act = p => plan.find(r => r.path === p);
  ok(act('a.pdf').action === 'pull' && act('폴더/b c.pdf').action === 'push', 'phone edit -> pull, PC edit -> push');
  for (const r of plan) if (r.action !== 'skip' && r.path !== 'pcopen.pdf' && r.path !== 'open.pdf') await transferDocument(c, r.path, r.action);
  ok(fs.readFileSync(env.pcPath('a.pdf'), 'utf8') === '%PDF-phone-A2' && fs.readFileSync(path.join(lib, '폴더', 'b c.pdf'), 'utf8') === '%PDF-pc-B2', 'two-way run copied both directions');
}
console.log(fail ? fail + ' FAILED' : 'all passed'); process.exit(fail ? 1 : 0);
