"""One step from the master icon to every Windows icon asset.
Master: web/assets/hdnotes-icon.svg (isometric paper stack and pen on a mint plate; the plate is part of the drawing; installer/hdnotes-icon.svg is a copy of it).
Writes: host/Assets/app.ico (WPF window + exe), installer/hdnotes.ico (Setup), installer/wizard-large.bmp + wizard-small.bmp,
        web/assets/hdnotes-icon-256.png / -512.png / favicon-32.png / favicon.svg.
To swap the concept: replace web/assets/hdnotes-icon.svg and run  python tools/make_icons.py
Needs: node + playwright with chromium (rasterising), python PIL.  PW=<playwright index.mjs>, CHROME=<chrome binary> override the defaults."""
import os, re, shutil, subprocess, json
from PIL import Image
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
master = os.path.join(root, 'web/assets/hdnotes-icon.svg')
svg = open(master, encoding='utf-8').read()
shutil.copy(master, os.path.join(root, 'installer/hdnotes-icon.svg'))
ico_sizes = [16, 20, 24, 32, 40, 48, 64, 96, 128, 256]
out = os.environ.get('ICON_TMP', os.path.join(root, 'dev', 'out', 'icons'))
os.makedirs(out, exist_ok=True)
js = """
import {chromium} from '%s';
import fs from 'fs';
const [svgPath, outDir, sizes] = [process.argv[2], process.argv[3], JSON.parse(process.argv[4])];
const svg = fs.readFileSync(svgPath, 'utf8').replace(/<svg([^>]*?)\\s(width|height)="[^"]*"/g, '<svg$1').replace(/<svg([^>]*?)\\s(width|height)="[^"]*"/g, '<svg$1');
const b = await chromium.launch({executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const p = await b.newPage({deviceScaleFactor: 1});
for (const s of sizes) {
  await p.setViewportSize({width: s, height: s});
  await p.setContent('<body style="margin:0;background:transparent">' + svg.replace('<svg', '<svg width="' + s + '" height="' + s + '" style="display:block"') + '</body>');
  await p.screenshot({path: outDir + '/icon-' + s + '.png', omitBackground: true});
}
await b.close();
""" % os.environ.get('PW', '/tmp/npmtest/node_modules/playwright/index.mjs')
tmpjs = os.path.join(out, 'render.mjs'); open(tmpjs, 'w').write(js)
subprocess.check_call(['node', tmpjs, master, out, json.dumps(sorted(set(ico_sizes + [55, 110, 164, 512])))])
png = lambda s: Image.open(os.path.join(out, f'icon-{s}.png')).convert('RGBA')

# .ico with every size rendered at its own resolution (no resampling of the small ones)
imgs = [png(s) for s in ico_sizes]
ico = os.path.join(root, 'host/Assets/app.ico')
imgs[-1].save(ico, format='ICO', sizes=[(s, s) for s in ico_sizes], append_images=imgs[:-1])
shutil.copy(ico, os.path.join(root, 'installer/hdnotes.ico'))

# web
png(512).save(os.path.join(root, 'web/assets/hdnotes-icon-512.png'))
png(256).save(os.path.join(root, 'web/assets/hdnotes-icon-256.png'))
png(32).save(os.path.join(root, 'web/assets/favicon-32.png'))
fav = re.sub(r'<svg([^>]*)>', lambda m: '<svg' + m.group(1) + '>\n  <title>HDnotes</title>', svg, count=1)
open(os.path.join(root, 'web/assets/favicon.svg'), 'w', encoding='utf-8').write(fav)

# Inno Setup wizard images (BMP, no alpha): large 164x314 with the plate's green gradient, small 55x55 on white
top, bot = (0x63, 0xE6, 0xBE), (0x12, 0xB8, 0x86)
big = Image.new('RGB', (164, 314))
for y in range(314):
    t = y / 313
    c = tuple(int(top[i] + (bot[i] - top[i]) * t) for i in range(3))
    for x in range(164): big.putpixel((x, y), c)
ic = png(110)
shadow = Image.new('RGBA', ic.size, (0, 0, 0, 0)); shadow.putalpha(ic.getchannel('A').point(lambda a: a * 0.25))
big.paste((6, 70, 60), (27 + 0, 92 + 4), shadow)
big.paste(ic, (27, 92), ic)
big.save(os.path.join(root, 'installer/wizard-large.bmp'))
sm = Image.new('RGB', (55, 55), (255, 255, 255)); i = png(55); sm.paste(i, (0, 0), i)
sm.save(os.path.join(root, 'installer/wizard-small.bmp'))
print('icons written from', os.path.relpath(master, root))
