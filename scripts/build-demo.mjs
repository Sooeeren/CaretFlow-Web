// Builds the "try it in your browser" version of CaretFlow into app/.
//
//   node scripts/build-demo.mjs                  uses ../folio (the CaretFlow source, dependencies installed)
//   node scripts/build-demo.mjs --src <folder>   another checkout of the CaretFlow repository
//
// It runs the app's own Vite build with relative URLs, then puts demo/web-backend.js (a stand-in
// for the Tauri backend) in front of the app's scripts. Nothing in the source folder is changed.
import { spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const site = join(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const srcIdx = args.indexOf('--src')
const src = resolve(srcIdx >= 0 ? args[srcIdx + 1] : join(site, '..', 'folio'))
const out = join(site, 'app')

if (!existsSync(join(src, 'src', 'main.js'))) {
  console.error(`No CaretFlow source in ${src}\nClone https://github.com/Sooeeren/CaretFlow there, or pass --src <folder>.`)
  process.exit(1)
}
if (!existsSync(join(src, 'node_modules', 'vite'))) {
  console.error(`Dependencies are missing: run "npm ci" in ${src} first.`)
  process.exit(1)
}

const vite = join(src, 'node_modules', 'vite', 'bin', 'vite.js')
const r = spawnSync(process.execPath, [vite, 'build', '--base', './', '--outDir', out, '--emptyOutDir'], { cwd: src, stdio: 'inherit' })
if (r.status !== 0) process.exit(r.status ?? 1)

const version = JSON.parse(readFileSync(join(src, 'package.json'), 'utf8')).version
copyFileSync(join(site, 'demo', 'web-backend.js'), join(out, 'web-backend.js'))
copyFileSync(join(site, 'assets', 'icon.png'), join(out, 'icon.png'))

const file = join(out, 'index.html')
let html = readFileSync(file, 'utf8')
const head = [
  '<meta name="description" content="CaretFlow, the Markdown editor, running in your browser. Your files stay on your device." />',
  '<link rel="icon" type="image/png" href="./icon.png" />',
  `<meta name="caretflow-version" content="${version}" />`,
  '<script src="./web-backend.js"></script>',
].join('\n    ')
if (!html.includes('<title>')) throw new Error('app/index.html looks different than expected: no <title>')
html = html.replace(/<title>[^<]*<\/title>/, `<title>CaretFlow</title>\n    ${head}`)
writeFileSync(file, html)
writeFileSync(join(site, 'assets', 'app-version.json'), JSON.stringify({ version }) + '\n')

const size = (dir) => readdirSync(dir).reduce((n, f) => n + ((s) => (s.isDirectory() ? size(join(dir, f)) : s.size))(statSync(join(dir, f))), 0)
console.log(`\nCaretFlow ${version} for the web → ${out} (${(size(out) / 1048576).toFixed(1)} MB)`)
