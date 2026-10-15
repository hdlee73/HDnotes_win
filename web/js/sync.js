// Same-network device sync (user triggered, whole-document copies). The phone runs a tiny HTTP server while its
// "다른 기기와 동기화" card is open; this side is the client and finds the phone by a UDP probe (host net.discover) or a typed address.
// Each document (library-relative path) gets an action: push = PC -> phone (PDF + notes + referenced images/recordings overwrite
// the phone's), pull = phone -> PC, or skip. planSync() proposes the actions two-way: it compares both sides with what they were
// right after the last sync with this phone (the baseline), so only the side that changed is copied and edits on both sides are
// flagged as conflicts (the newer one wins unless the user changes it). Deletions are never copied.
// Pure logic: all I/O comes through `env`:
//   env.http({url, method, headers, text, readPath, savePath}) -> {status, text}
//   env.pcPath(rel) -> absolute path of the library document on this device
//   env.exportNote(rel) -> sidecar JSON text ; env.importNote(rel, text) ; env.isOpen(rel) -> bool
//   env.assetPath(name) -> path ; env.hasAsset(name) -> bool
export const ASSET_NAME = /^[a-f0-9-]{36}\.(png|m4a|mp4)$/;

export class SyncError extends Error {}

export function parseAddress(text) {
  const m = /^\s*(?:http:\/\/)?(\d{1,3}(?:\.\d{1,3}){3})(?::(\d{2,5}))?\s*$/.exec(text || '');
  if (!m || m[1].split('.').some(n => +n > 255)) return null;
  return { host: m[1], port: m[2] ? +m[2] : null };
}

/** Asset file names referenced by sidecar JSON text (images, video thumbs, recordings, mp4 files). */
export function referencedAssets(text) {
  const s = new Set(), root = JSON.parse(text);
  for (const e of root.elements || []) {
    if (e && typeof e.asset === 'string' && ASSET_NAME.test(e.asset)) s.add(e.asset);
    if (e && e.kind === 'video' && typeof e.text === 'string' && ASSET_NAME.test(e.text)) s.add(e.text);
  }
  return s;
}

/** Library-relative path ('folder/name.pdf', slash separated) of an absolute Windows library path, or null when outside the library. */
export function relPath(root, file) {
  const r = root.replace(/[\\/]+$/, '').replace(/\//g, '\\'), f = file.replace(/\//g, '\\');
  if (f.toLowerCase().indexOf(r.toLowerCase() + '\\') !== 0) return null;
  return f.slice(r.length + 1).split('\\').join('/');
}

/** Rows for the picker: one per path that exists on at least one device. pc/phone = {size, mtime} | null. */
export function buildRows(phoneList, pcList) {
  const map = new Map();
  for (const d of phoneList) map.set(d.path, { path: d.path, phone: { size: d.size, mtime: d.mtime }, pc: null });
  for (const d of pcList) { const r = map.get(d.path) || { path: d.path, phone: null, pc: null }; r.pc = { size: d.size, mtime: d.mtime }; map.set(d.path, r); }
  const rows = [...map.values()];
  for (const r of rows) r.newer = r.pc && r.phone && Math.abs(r.pc.mtime - r.phone.mtime) > 120000 ? (r.pc.mtime > r.phone.mtime ? 'pc' : 'phone') : null;
  return rows.sort((a, b) => a.path.localeCompare(b.path, 'ko'));
}

const SAME_MS = 2000;           // file-system / clock rounding when comparing a side with its own baseline
const FIRST_SAME_MS = 120000;   // first sync with a phone: two clocks, so only a clear difference picks a winner

/**
 * Two-way plan. phoneList / pcList: [{path,size,mtime}]; base: {path: {pc: mtime, phone: mtime}} from the last sync with this phone.
 * Returns rows sorted by path: {path, pc, phone, action:'push'|'pull'|'skip', why, conflict}
 *   why: 'same' | 'pc-changed' | 'phone-changed' | 'both-changed' | 'newer' | 'pc-new' | 'phone-new' | 'phone-deleted' | 'pc-deleted'
 */
export function planSync(phoneList, pcList, base = {}) {
  const rows = buildRows(phoneList, pcList);
  for (const r of rows) {
    const b = base[r.path]; r.conflict = false;
    if (r.pc && r.phone) {
      if (b) {
        const pcCh = Math.abs(r.pc.mtime - b.pc) > SAME_MS, phCh = Math.abs(r.phone.mtime - b.phone) > SAME_MS;
        if (pcCh && phCh) { r.conflict = true; r.why = 'both-changed'; r.action = r.pc.mtime >= r.phone.mtime ? 'push' : 'pull'; }
        else if (pcCh) { r.why = 'pc-changed'; r.action = 'push'; }
        else if (phCh) { r.why = 'phone-changed'; r.action = 'pull'; }
        else { r.why = 'same'; r.action = 'skip'; }
      } else if (Math.abs(r.pc.mtime - r.phone.mtime) <= FIRST_SAME_MS && r.pc.size === r.phone.size) { r.why = 'same'; r.action = 'skip'; }
      else { r.why = 'newer'; r.action = r.pc.mtime >= r.phone.mtime ? 'push' : 'pull'; }
    } else if (r.pc) { r.why = b ? 'phone-deleted' : 'pc-new'; r.action = b ? 'skip' : 'push'; }
    else { r.why = b ? 'pc-deleted' : 'phone-new'; r.action = b ? 'skip' : 'pull'; }
  }
  return rows;
}

/** Baseline after a sync: every path now on both sides that was copied or already the same (failed / skipped-different rows keep their old entry). */
export function nextBaseline(base, phoneList, pcList, settled) {
  const out = { ...base }, phone = new Map(phoneList.map(d => [d.path, d])), pc = new Set(pcList.map(d => d.path));
  for (const d of pcList) {
    const p = phone.get(d.path);
    if (p && settled.has(d.path)) out[d.path] = { pc: d.mtime, phone: p.mtime };
  }
  for (const k of Object.keys(out)) if (!phone.has(k) && !pc.has(k)) delete out[k];
  return out;
}

export class SyncClient {
  constructor(env, address, code) {
    const a = parseAddress(address);
    if (!a || !a.port) throw new SyncError('주소는 192.168.0.12:43125 처럼 입력하세요');
    this.env = env; this.base = `http://${a.host}:${a.port}`; this.code = String(code || '').trim();
  }
  async req(path, opt = {}) {
    const r = await this.env.http({ url: this.base + path, headers: { 'X-Code': this.code }, ...opt });
    if (r.status === 403) throw new SyncError('코드가 맞지 않습니다');
    if (r.status === 429) throw new SyncError('코드를 너무 여러 번 틀렸습니다. 휴대폰에서 창을 다시 여세요');
    return r;
  }
  /** {name,id,version} of the phone, or null for an app version without /v1/info. */
  async info() {
    const r = await this.req('/v1/info'); if (r.status !== 200) return null;
    try { return JSON.parse(r.text); } catch (e) { return null; }
  }
  async library() {
    const r = await this.req('/v1/library'); if (r.status !== 200) throw new SyncError('문서 목록을 받지 못했습니다 (' + r.status + ')');
    return JSON.parse(r.text);
  }
  static q(rel) { return '?p=' + encodeURIComponent(rel); }
  async getNote(rel) { const r = await this.req('/v1/note' + SyncClient.q(rel)); if (r.status !== 200) throw new SyncError('노트를 받지 못했습니다 (' + r.status + ')'); return r.text; }
  async putNote(rel, text) {
    const r = await this.req('/v1/note' + SyncClient.q(rel), { method: 'PUT', text });
    if (r.status === 409) throw new SyncError('휴대폰에서 열려 있는 문서입니다');
    if (r.status !== 200) throw new SyncError('노트를 보내지 못했습니다 (' + r.status + ')');
  }
  async getPdf(rel, savePath) { const r = await this.req('/v1/pdf' + SyncClient.q(rel), { savePath }); if (r.status !== 200) throw new SyncError('PDF를 받지 못했습니다 (' + r.status + ')'); }
  async putPdf(rel, readPath) {
    const r = await this.req('/v1/pdf' + SyncClient.q(rel), { method: 'PUT', readPath });
    if (r.status === 409) throw new SyncError('휴대폰에서 열려 있는 문서입니다. 닫고 다시 시도하세요');
    if (r.status !== 200) throw new SyncError('PDF를 보내지 못했습니다 (' + r.status + ')');
  }
  async remoteHas(name) { return (await this.req('/v1/asset/' + name, { method: 'HEAD' })).status === 200; }
  async download(name) {
    const r = await this.req('/v1/asset/' + name, { savePath: await this.env.assetPath(name) });
    if (r.status === 404) return false; if (r.status !== 200) throw new SyncError('파일을 받지 못했습니다 (' + name + ')'); return true;
  }
  async upload(name) {
    const r = await this.req('/v1/asset/' + name, { method: 'PUT', readPath: await this.env.assetPath(name) });
    if (r.status !== 200) throw new SyncError('파일을 보내지 못했습니다 (' + name + ')');
  }
}

/** One document, whole: dir 'push' (this PC overwrites the phone) or 'pull' (the phone overwrites this PC). Returns {files} transferred. */
export async function transferDocument(client, rel, dir, progress = () => {}) {
  const env = client.env; let files = 0;
  if (dir === 'push') {
    progress('PDF 보내는 중');
    await client.putPdf(rel, env.pcPath(rel)); files++;
    const note = await env.exportNote(rel), names = [...referencedAssets(note)];
    for (let i = 0; i < names.length; i++) {
      if (!(await env.hasAsset(names[i])) || await client.remoteHas(names[i])) continue;
      progress(`그림·녹음 보내는 중 ${i + 1}/${names.length}`); await client.upload(names[i]); files++;
    }
    progress('노트 보내는 중'); await client.putNote(rel, note);
  } else {
    if (await env.isOpen(rel)) throw new SyncError('이 PC에서 열려 있는 문서입니다. 닫고 다시 시도하세요');
    progress('PDF 받는 중');
    await client.getPdf(rel, env.pcPath(rel)); files++;
    const note = await client.getNote(rel), names = [...referencedAssets(note)];
    for (let i = 0; i < names.length; i++) {
      if (await env.hasAsset(names[i])) continue;
      progress(`그림·녹음 받는 중 ${i + 1}/${names.length}`); if (await client.download(names[i])) files++;
    }
    progress('노트 적용 중'); await env.importNote(rel, note);
  }
  return { files };
}
