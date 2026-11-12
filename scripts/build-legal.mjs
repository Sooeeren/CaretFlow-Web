// Builds /privacy/ and /terms/ from docs/PRIVACY.md and docs/TERMS.md in the CaretFlow source, so the
// app repository stays the one place these texts are edited (Discord and the footer link here).
//
//   node scripts/build-legal.mjs                       uses ../folio, writes privacy/ and terms/ here
//   node scripts/build-legal.mjs --src <dir> --out <dir>
//
// Markdown is rendered with `marked` from the source's own node_modules (run "npm ci" there first).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const site = join(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const arg = (name, def) => (args.includes(name) ? resolve(args[args.indexOf(name) + 1]) : def)
const src = arg('--src', join(site, '..', 'folio'))
const out = arg('--out', site)
const REPO = 'https://github.com/Sooeeren/CaretFlow'

const markedPath = join(src, 'node_modules', 'marked', 'lib', 'marked.esm.js')
if (!existsSync(markedPath)) {
  console.error(`No marked in ${src}: run "npm ci" there first, or pass --src <folder>.`)
  process.exit(1)
}
const { marked } = await import(pathToFileURL(markedPath).href)

const PAGES = [
  { file: 'PRIVACY.md', slug: 'privacy', title: 'Privacy Policy' },
  { file: 'TERMS.md', slug: 'terms', title: 'Terms of Service' },
]

// links between the docs point at files in the repository; on the site they go to the sibling page
// or to GitHub
function fixLinks(html) {
  return html.replace(/href="([^"]+)"/g, (m, href) => {
    if (/^(https?:|mailto:|#)/.test(href)) return m
    const [path, hash = ''] = href.split('#')
    const page = PAGES.find((p) => p.file === path)
    if (page) return `href="/${page.slug}/${hash ? '#' + hash : ''}"`
    const repoPath = path.startsWith('../') ? path.slice(3) : 'docs/' + path
    return `href="${REPO}/blob/HEAD/${repoPath}${hash ? '#' + hash : ''}"`
  })
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')

const page = (p, body) => `<!doctype html>
<html lang="en" data-theme="paper">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${esc(p.title)} · CaretFlow</title>
    <meta name="description" content="${esc(p.title)} for the CaretFlow app, its extensions and this website." />
    <meta name="color-scheme" content="light dark" />
    <link rel="icon" type="image/png" href="/assets/icon.png" />
    <script>
      ;(function () {
        var t = null
        try {
          t = localStorage.getItem('caretflow.site.theme')
        } catch (e) {}
        if (['paper', 'sepia', 'ink', 'slate'].indexOf(t) < 0) t = matchMedia('(prefers-color-scheme: dark)').matches ? 'ink' : 'paper'
        document.documentElement.dataset.theme = t
      })()
    </script>
    <link rel="stylesheet" href="/css/site.css" />
    <script>
      window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments) }
    </script>
    <script defer src="/_vercel/insights/script.js"></script>
  </head>
  <body>
    <header class="nav">
      <div class="nav-in">
        <a class="brand" href="/" aria-label="CaretFlow home">
          <img class="logo" src="/assets/icon.png" width="32" height="32" alt="" />
          <span>CaretFlow</span>
        </a>
        <nav class="nav-links" aria-label="Legal">
          ${PAGES.map((q) => `<a href="/${q.slug}/"${q === p ? ' aria-current="page"' : ''}>${esc(q.title)}</a>`).join('\n          ')}
        </nav>
      </div>
    </header>
    <main class="wrap legal">
${fixLinks(body)}
      <p class="legal-src">This page is made from <a href="${REPO}/blob/HEAD/docs/${p.file}">docs/${p.file}</a>; its history shows every change.</p>
    </main>
  </body>
</html>
`

for (const p of PAGES) {
  const md = readFileSync(join(src, 'docs', p.file), 'utf8')
  const dir = join(out, p.slug)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'index.html'), page(p, marked.parse(md)))
  console.log(`${p.slug}/index.html`)
}
