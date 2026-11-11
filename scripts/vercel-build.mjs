// The Vercel build: clones the CaretFlow source, builds the web version of the app into app/,
// then copies the site into dist/, which Vercel serves.
import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const site = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = join(site, '.caretflow-src')
const dist = join(site, 'dist')

const run = (cmd, args, cwd = site) => {
  const r = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' })
  if (r.status !== 0) process.exit(r.status ?? 1)
}

// full history: the About dialog counts lines per model from it
if (!existsSync(join(src, '.git'))) run('git', ['clone', 'https://github.com/Sooeeren/CaretFlow.git', src])
run('npm', ['ci'], src)
run(process.execPath, [join(site, 'scripts', 'build-demo.mjs'), '--src', src])

rmSync(dist, { recursive: true, force: true })
mkdirSync(dist)
for (const p of ['index.html', 'css', 'js', 'assets', 'app']) cpSync(join(site, p), join(dist, p), { recursive: true })
console.log(`Site ready in ${dist}`)
