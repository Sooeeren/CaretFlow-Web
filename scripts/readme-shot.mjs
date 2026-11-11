// Makes the README's image: a screenshot of the site as a window with rounded corners on the same
// colorful backdrop as the CaretFlow README (its scripts/screenshots.mjs). Needs Chrome or Edge.
//
//   node scripts/readme-shot.mjs                 the live site
//   node scripts/readme-shot.mjs <url>           another address, e.g. http://localhost:4321/
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const site = join(dirname(fileURLToPath(import.meta.url)), '..')
const url = process.argv[2] || 'https://caretflow.vercel.app/'
const dest = join(site, 'assets', 'readme-hero.png')

const browser = [
  process.env.CHROME,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].find((p) => p && existsSync(p))
if (!browser) {
  console.error('No Chrome or Edge found: set CHROME to its path.')
  process.exit(1)
}

const tmp = mkdtempSync(join(tmpdir(), 'readme-shot-'))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const shoot = async (target, out, w, h) => {
  rmSync(out, { force: true })
  spawnSync(browser, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1.5',
    `--window-size=${w},${h}`, '--virtual-time-budget=6000', `--user-data-dir=${join(tmp, 'profile')}`,
    `--screenshot=${out}`, target,
  ], { stdio: 'ignore' })
  // on Windows chrome.exe can return before the screenshot is written: wait until its size settles
  let last = -1
  for (let i = 0; i < 120; i++) {
    const size = existsSync(out) ? statSync(out).size : -1
    if (size > 0 && size === last) return
    last = size
    await sleep(500)
  }
  throw new Error(`Chrome could not capture ${target}`)
}

try {
  const page = join(tmp, 'page.png')
  await shoot(url, page, 1280, 800)

  // the backdrop and window are the ones heroShot() in CaretFlow's scripts/screenshots.mjs draws
  writeFileSync(join(tmp, 'frame.html'), `<!doctype html><html><head><style>
    html, body { margin: 0; width: 1280px; height: 880px; overflow: hidden; background: #160c28; }
    .bg { position: absolute; inset: 0;
      background:
        radial-gradient(60% 55% at 8% 12%, #c2409a 0%, transparent 62%),
        radial-gradient(55% 60% at 95% 8%, #6a3fd8 0%, transparent 60%),
        radial-gradient(50% 55% at 100% 95%, #2f7ee8 0%, transparent 58%),
        radial-gradient(60% 60% at 0% 100%, #ff7a59 0%, transparent 55%),
        linear-gradient(160deg, #4b2f6e 0%, #2a1748 55%, #1a0f30 100%); }
    svg { position: absolute; inset: 0; }
    .win { position: absolute; left: 50%; top: 50%; width: 1080px; transform: translate(-50%, -50%);
      border-radius: 14px; overflow: hidden;
      box-shadow: 0 0 0 1px rgba(255,255,255,.14), 0 30px 80px rgba(10,0,30,.55), 0 8px 24px rgba(10,0,30,.35); }
    .win img { display: block; width: 100%; }
  </style></head><body>
    <div class="bg"></div>
    <svg viewBox="0 0 1280 880" preserveAspectRatio="none">
      <defs>
        <linearGradient id="r1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff9a7a"/><stop offset=".5" stop-color="#e0469e"/><stop offset="1" stop-color="#7b4be0"/></linearGradient>
        <linearGradient id="r2" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#53c8ff"/><stop offset="1" stop-color="#8a5cf0"/></linearGradient>
        <filter id="soft" filterUnits="userSpaceOnUse" x="-300" y="-300" width="1880" height="1460"><feGaussianBlur stdDeviation="26"/></filter>
        <filter id="glow" filterUnits="userSpaceOnUse" x="-300" y="-300" width="1880" height="1460"><feGaussianBlur stdDeviation="3"/></filter>
      </defs>
      <path d="M -80 700 C 200 520, 330 900, 640 760 S 1100 520, 1380 640" stroke="url(#r1)" stroke-width="150" fill="none" opacity=".85" filter="url(#soft)"/>
      <path d="M -60 140 C 220 40, 380 260, 620 120 S 1040 -40, 1360 90" stroke="url(#r2)" stroke-width="120" fill="none" opacity=".65" filter="url(#soft)"/>
      <path d="M -80 700 C 200 520, 330 900, 640 760 S 1100 520, 1380 640" stroke="#ffd2c4" stroke-width="2.5" fill="none" opacity=".45" filter="url(#glow)"/>
      <path d="M -60 140 C 220 40, 380 260, 620 120 S 1040 -40, 1360 90" stroke="#cfe9ff" stroke-width="2" fill="none" opacity=".35" filter="url(#glow)"/>
    </svg>
    <div class="win"><img src="page.png"></div>
  </body></html>`)
  await shoot(pathToFileURL(join(tmp, 'frame.html')).href, dest, 1280, 880)
  console.log('saved', dest)
} finally {
  rmSync(tmp, { recursive: true, force: true })
}
