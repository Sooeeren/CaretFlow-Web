// CaretFlow in the browser: a stand-in for the Tauri backend.
//
// The desktop app talks to Rust through window.__TAURI_INTERNALS__.invoke(). This file answers
// those calls with a small folder kept in this browser (localStorage), file pickers and downloads
// instead of system dialogs, and the browser's print dialog instead of the PDF writer. It has to
// run before the app's own scripts; scripts/build-demo.mjs puts it first in app/index.html.
;(() => {
  const qs = new URLSearchParams(location.search)
  const embedded = window.parent !== window

  // ── touch layout: the app shows its phone layout when the user agent says Android. iPhones and
  //    iPads get it too (?touch=1 forces it, ?touch=0 turns it off).
  const realUA = navigator.userAgent
  const appleTouch = /iPhone|iPad|iPod/.test(realUA) || (/Macintosh/.test(realUA) && navigator.maxTouchPoints > 1)
  if (!/Android/i.test(realUA) && qs.get('touch') !== '0' && (qs.get('touch') === '1' || appleTouch)) {
    try {
      Object.defineProperty(Navigator.prototype, 'userAgent', { get: () => realUA + ' Android (CaretFlow web)', configurable: true })
    } catch {}
  }
  const TOUCH = /Android/i.test(navigator.userAgent)

  const HOME = '/home/you'
  const ROOT = TOUCH ? HOME + '/Documents/CaretFlow' : HOME + '/Notes'
  const TMP = '/tmp'
  const FILES_KEY = 'caretflow.web.files'
  const TEXT_EXT = ['md', 'markdown', 'mdown', 'mkd', 'mkdn', 'mdx', 'txt', 'svg', 'html', 'css', 'json']
  const MD_EXT = ['md', 'markdown', 'mdown', 'mkd', 'mkdn', 'mdx', 'txt']
  const MIME = { svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', avif: 'image/avif', bmp: 'image/bmp', ico: 'image/x-icon', pdf: 'application/pdf', html: 'text/html', md: 'text/markdown' }

  const ext = (p) => (/\.([^./]+)$/.exec(p || '')?.[1] || '').toLowerCase()
  const base = (p) => p.replace(/\/+$/, '').split('/').pop()
  const dirOf = (p) => p.replace(/\/+$/, '').replace(/\/[^/]*$/, '') || '/'
  const norm = (p) => {
    const out = []
    for (const s of String(p || '').replace(/\\/g, '/').split('/')) {
      if (!s || s === '.') continue
      if (s === '..') out.pop()
      else out.push(s)
    }
    return '/' + out.join('/')
  }
  const inside = (p, dir) => p === dir || p.startsWith(dir.replace(/\/$/, '') + '/')

  // ════════════════════════════════════════ the folder
  const SEED = {
    'Welcome.md': `# CaretFlow, in your browser

This is the real CaretFlow editor, running on a web page. What you see *is* the document: click anywhere and type, and the formatting appears as you go.

> [!TIP]
> Press \`Ctrl+/\` to see the raw Markdown behind this page, and again to come back.

## Things to try

- [x] Open this page
- [ ] Type \`/\` on an empty line to add a heading, table, code, math or a diagram
- [ ] Press \`F1\` for the command palette: every feature is in there
- [ ] Open **Writing check** in the sidebar and press \`F7\`
- [ ] Pick another look in **View → Theme**
- [ ] Turn on Vim keys with \`Ctrl+Alt+V\`, then \`Ctrl+/\`

| Feature | Shortcut |
| --- | --- |
| Raw Markdown | \`Ctrl+/\` |
| Command palette | \`F1\` |
| Spelling & grammar review | \`F7\` |
| Focus mode | \`F8\` |
| Typing test | \`Ctrl+Alt+T\` |

## A bit of math and code

The area of a circle is $A = \\pi r^2$, and the sum of the first $n$ numbers is

$$
\\sum_{k=1}^{n} k = \\frac{n(n+1)}{2}
$$

\`\`\`js
export function wordsPerMinute(chars, ms) {
  return chars / 5 / (ms / 60000)
}
\`\`\`

![The CaretFlow orbit](assets/orbit.svg)

## What is different here

The files in the sidebar live in this browser, not on a server: nothing you type leaves your device. **File → Open** brings in a file from your computer, and **Save As** can download one.

The desktop and Android apps add what a web page cannot do: real folders, PDF export with page preview, Cloud Sync, AI writing help and updates. A few shortcuts (\`Ctrl+N\`, \`Ctrl+W\`) belong to your browser here; the menus do the same.

Happy writing!
`,
    'Writing check.md': `# Notes for the team

Their going to ship the new editor tomorow, so we should of finished the docs by now. Its a big release and alot of people will read it.

The checker runs completely offline on your computer. It is is fast enough to check a long document while you type, and it can explain every suggestion.

I has a few more ideas for the next version, but they can wait until after the release.

> [!NOTE]
> Right-click a marked word for suggestions, or press \`F7\` to walk through every issue. The checker needs a moment to load the first time.
`,
    'Diagrams and math.md': `# Diagrams and math

Code blocks marked \`mermaid\` are drawn as diagrams. Click one to edit its source.

\`\`\`mermaid
graph LR
  A[Write] --> B{Happy?}
  B -- yes --> C[Save]
  B -- no --> A
\`\`\`

\`\`\`mermaid
sequenceDiagram
  You->>CaretFlow: type Markdown
  CaretFlow-->>You: rendered in place
  You->>CaretFlow: Ctrl+/
  CaretFlow-->>You: raw Markdown
\`\`\`

## Math

Inline math like $e^{i\\pi} + 1 = 0$ sits in the line, and blocks get their own:

$$
\\int_0^\\infty e^{-x^2}\\,dx = \\frac{\\sqrt{\\pi}}{2}
$$

## Callouts

> [!WARNING]
> Click the title line of a callout to see (and change) its \`[!WARNING]\` marker.

> [!IMPORTANT]
> Everything here stays plain Markdown that other apps can read.
`,
    'Journal/A first entry.md': `# A first entry

Folders work too. Right-click a file in the sidebar to rename it, or use the buttons above the file list to add a new one.

- Search the whole folder with \`Ctrl+Shift+F\`
- Jump to any file with \`Ctrl+P\`
`,
    'assets/orbit.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 220" role="img" aria-label="Two orbits around a dot">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7a559f"/><stop offset="1" stop-color="#4b2f6e"/></linearGradient>
  </defs>
  <rect width="640" height="220" rx="18" fill="url(#g)"/>
  <g transform="translate(320 110)" fill="none" stroke-linecap="round">
    <ellipse rx="150" ry="52" transform="rotate(28)" stroke="#fff" stroke-opacity=".35" stroke-width="14"/>
    <ellipse rx="150" ry="52" transform="rotate(-28)" stroke="#fff" stroke-width="14"/>
    <circle r="30" fill="#fff"/>
    <circle cx="126" cy="-74" r="13" fill="#ff8f73"/>
  </g>
</svg>
`,
  }

  const files = new Map() // path → { text } | { bytes: Uint8Array }, plus mtime
  const dirs = new Set(['/', HOME, ROOT, TMP])
  let clock = Date.now()
  const tick = () => (clock = Math.max(clock + 1, Date.now()))

  const addDirs = (p) => {
    for (let d = dirOf(p); d && d !== '/' && !dirs.has(d); d = dirOf(d)) dirs.add(d)
  }
  const put = (p, data) => {
    addDirs(p)
    const f = { ...data, mtime: tick() }
    files.set(p, f)
    blobUrls.delete(p)
    persist()
    return f.mtime
  }

  const b64 = (bytes) => {
    let s = ''
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000))
    return btoa(s)
  }
  const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))

  let persistTimer
  function persist() {
    clearTimeout(persistTimer)
    persistTimer = setTimeout(persistNow, 250)
  }
  function persistNow() {
    clearTimeout(persistTimer)
    const out = { files: {}, dirs: [] }
    for (const d of dirs) if (d !== ROOT && inside(d, ROOT)) out.dirs.push(d.slice(ROOT.length + 1))
    for (const [p, f] of files) {
      if (!inside(p, ROOT)) continue
      out.files[p.slice(ROOT.length + 1)] = f.text != null ? f.text : { b64: b64(f.bytes) }
    }
    try {
      localStorage.setItem(FILES_KEY, JSON.stringify(out))
    } catch {
      // over the browser's storage limit (large images): keep the text, drop the binary files
      for (const k of Object.keys(out.files)) if (typeof out.files[k] !== 'string') delete out.files[k]
      try {
        localStorage.setItem(FILES_KEY, JSON.stringify(out))
      } catch {}
    }
  }
  addEventListener('pagehide', persistNow)

  let firstVisit = false
  function loadFolder() {
    let saved = null
    try {
      if (qs.get('reset') === '1') {
        for (const k of Object.keys(localStorage)) if (k.startsWith('folio.') || k.startsWith('caretflow.web.')) localStorage.removeItem(k)
      }
      saved = JSON.parse(localStorage.getItem(FILES_KEY))
    } catch {}
    firstVisit = !saved
    const src = saved?.files || SEED
    for (const d of saved?.dirs || []) dirs.add(ROOT + '/' + d)
    for (const [rel, v] of Object.entries(src)) {
      const p = ROOT + '/' + rel
      addDirs(p)
      files.set(p, typeof v === 'string' ? { text: v, mtime: tick() } : { bytes: unb64(v.b64), mtime: tick() })
    }
    if (firstVisit) persist()
  }

  // ── settings the app reads on start: no update question, the file list open, the theme the
  //    page asked for (?theme=ink)
  function seedSettings() {
    try {
      let s = JSON.parse(localStorage.getItem('folio.settings') || 'null')
      if (!s) s = { updateCheck: false, sidebarTab: 'files', drawnCaret: false, extensions: ['typing'], androidStorageAsked: true, reopenLast: true }
      const theme = qs.get('theme')
      if (['paper', 'sepia', 'ink', 'slate'].includes(theme)) s.theme = theme
      if (embedded) s.nativeTitlebar = false
      localStorage.setItem('folio.settings', JSON.stringify(s))
    } catch {}
  }

  // ════════════════════════════════════════ files as URLs, downloads, printing
  const blobUrls = new Map()
  function blobFor(p) {
    const f = files.get(p)
    if (!f) return null
    return new Blob([f.text != null ? f.text : f.bytes], { type: MIME[ext(p)] || (f.text != null ? 'text/plain' : 'application/octet-stream') })
  }
  function urlFor(path) {
    const p = norm(path)
    if (!files.has(p)) return path
    if (!blobUrls.has(p)) blobUrls.set(p, URL.createObjectURL(blobFor(p)))
    return blobUrls.get(p)
  }
  function download(p, name = base(p)) {
    const blob = blobFor(p)
    if (!blob) return
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = name
    document.body.append(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(a.href), 30e3)
  }
  const downloads = new Set() // paths picked with "Download" in the save dialog: sent out on the next write

  function printHtml(html) {
    return new Promise((res) => {
      const fr = document.createElement('iframe')
      fr.setAttribute('aria-hidden', 'true')
      fr.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden'
      fr.onload = () =>
        setTimeout(() => {
          try {
            fr.contentWindow.focus()
            fr.contentWindow.print()
          } catch {}
          setTimeout(() => fr.remove(), 60e3)
          res(null)
        }, 400) // fonts and images of the export settle first
      fr.srcdoc = html
      document.body.append(fr)
    })
  }

  // ════════════════════════════════════════ dialogs (drawn with the app's own styles)
  const h = (tag, props = {}, ...kids) => {
    const n = Object.assign(document.createElement(tag), props)
    n.append(...kids.filter((k) => k != null))
    return n
  }
  function modal({ title, text, input, buttons }) {
    return new Promise((res) => {
      const layer = h('div', { className: 'web-layer' })
      layer.style.cssText = 'position:fixed;inset:0;z-index:5000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.32)'
      const box = h('div', { className: 'modal-box' }, h('h3', {}, title), text ? h('p', {}, text) : null)
      box.setAttribute('role', 'dialog')
      const inp = input != null ? h('input', { type: 'text', value: input, spellcheck: false }) : null
      if (inp) box.append(inp)
      const done = (v) => {
        layer.remove()
        document.removeEventListener('keydown', onKey, true)
        res(v == null ? null : { value: v, input: inp?.value.trim() ?? '' })
      }
      const row = h('div', { className: 'modal-btns' })
      for (const b of buttons) row.append(h('button', { type: 'button', className: b.primary ? 'primary' : '', onclick: () => done(b.value) }, b.label))
      box.append(row)
      const onKey = (e) => {
        if (e.key !== 'Escape' && e.key !== 'Enter') return
        if (e.key === 'Enter' && e.target.tagName === 'BUTTON') return
        e.preventDefault()
        e.stopPropagation()
        done(e.key === 'Escape' ? null : buttons.find((b) => b.primary)?.value)
      }
      document.addEventListener('keydown', onKey, true)
      layer.onmousedown = (e) => e.target === layer && done(null)
      layer.append(box)
      document.body.append(layer)
      if (inp) {
        inp.focus()
        inp.setSelectionRange(0, inp.value.replace(/\.[^.]+$/, '').length)
      } else row.querySelector('.primary')?.focus()
    })
  }

  /** A file from the computer, copied into the folder (documents) or a temp place (images) */
  function pickFromComputer(options = {}) {
    return new Promise((res) => {
      const exts = (options.filters || []).flatMap((f) => f.extensions || []).filter((e) => e !== '*')
      const inp = h('input', { type: 'file' })
      const all = (options.filters || []).some((f) => (f.extensions || []).includes('*'))
      if (exts.length && !all) inp.accept = exts.map((e) => '.' + e).join(',')
      inp.style.display = 'none'
      inp.oncancel = () => (inp.remove(), res(null))
      inp.onchange = async () => {
        const file = inp.files[0]
        inp.remove()
        if (!file) return res(null)
        res(await importFile(file))
      }
      document.body.append(inp)
      inp.click()
    })
  }
  async function importFile(file) {
    const name = file.name.replace(/[\\/:*?"<>|]+/g, '-')
    const isText = TEXT_EXT.includes(ext(name)) && ext(name) !== 'svg'
    // documents join the folder; anything else waits in a temp place until the app copies it
    let p = (isText ? ROOT : TMP + '/picked') + '/' + name
    const data = isText ? { text: await file.text() } : { bytes: new Uint8Array(await file.arrayBuffer()) }
    for (let i = 2; files.has(p) && files.get(p).text !== data.text; i++) p = dirOf(p) + '/' + name.replace(/(\.[^.]+)?$/, ` (${i})$1`)
    put(p, data)
    return p
  }

  async function saveDialog(options = {}) {
    const def = norm(options.defaultPath || 'Untitled.md')
    const want = (options.filters?.[0]?.extensions?.[0] || ext(def) || 'md').toLowerCase()
    const doc = MD_EXT.includes(want)
    const r = await modal({
      title: doc ? 'Save as' : 'Export',
      text: doc ? 'The web version keeps your files in this browser. Download gives you the file itself.' : 'The file is saved to your downloads.',
      input: base(def) || 'Untitled.' + want,
      buttons: doc
        ? [
            { label: 'Cancel', value: null },
            { label: 'Download', value: 'download' },
            { label: 'Save in browser', value: 'keep', primary: true },
          ]
        : [
            { label: 'Cancel', value: null },
            { label: 'Download', value: 'download', primary: true },
          ],
    })
    if (!r) return null
    let name = r.input.replace(/[\\/:*?"<>|]+/g, '') || 'Untitled'
    if (!/\.[^.]+$/.test(name)) name += '.' + want
    const dir = doc ? (inside(dirOf(def), ROOT) ? dirOf(def) : ROOT) : TMP + '/exports'
    const p = dir + '/' + name
    if (r.value === 'download') downloads.add(p)
    return p
  }

  async function folderDialog() {
    await modal({
      title: 'One folder, kept in this browser',
      text: `The web version works in a single folder, “${base(ROOT)}”, stored in this browser. The desktop and Android apps open any folder on your device.`,
      buttons: [{ label: 'OK', value: true, primary: true }],
    })
    return ROOT
  }

  // ════════════════════════════════════════ events and the window around the app
  let cb = 0
  const callbacks = {}
  const listeners = new Map() // event name → Set of callback ids
  function emit(event, payload) {
    for (const id of listeners.get(event) || []) callbacks[id]?.({ event, id, payload })
  }
  let maximized = false
  const tellParent = (type, extra = {}) => embedded && window.parent.postMessage({ source: 'caretflow', type, ...extra }, '*')
  addEventListener('message', (e) => {
    if (e.source !== window.parent || e.data?.source !== 'caretflow-site') return
    if (e.data.type === 'maximized') {
      maximized = !!e.data.value
      emit('tauri://resize', { width: innerWidth, height: innerHeight })
    }
  })

  // Markdown files dropped from the computer open like in the desktop app
  addEventListener('dragover', (e) => e.dataTransfer?.types?.includes('Files') && e.preventDefault())
  addEventListener(
    'drop',
    async (e) => {
      const dropped = [...(e.dataTransfer?.files || [])].filter((f) => MD_EXT.includes(ext(f.name)))
      if (!dropped.length) return
      e.preventDefault()
      e.stopPropagation()
      const paths = []
      for (const f of dropped) paths.push(await importFile(f))
      emit('tauri://drag-drop', { paths, position: { x: e.clientX, y: e.clientY } })
    },
    true,
  )

  // ════════════════════════════════════════ commands
  const NOT_HERE = 'This needs the desktop or Android app; the web version cannot do it.'
  const need = (p) => {
    const f = files.get(norm(p))
    if (!f) throw `No such file: ${p}`
    return f
  }
  const listed = (p) => MD_EXT.includes(ext(p))

  const handlers = {
    // start
    native_titlebar: () => !embedded, // a browser tab has its own title bar
    set_native_titlebar: () => null,
    cli_args: () => [],
    initial_path: () => {
      const open = qs.get('open')
      if (open && files.has(norm(open))) return norm(open)
      let recent = []
      try {
        recent = JSON.parse(localStorage.getItem('folio.recent') || '[]')
      } catch {}
      return recent.length ? null : ROOT + '/Welcome.md'
    },
    install_kind: () => 'web',
    exe_path: () => 'caretflow',
    log_line: ({ line }) => console.debug('[caretflow]', line),
    exit_app: () => null,
    restart: () => location.reload(),
    new_window: ({ path }) => void window.open(location.pathname + (path ? '?open=' + encodeURIComponent(path) : ''), '_blank'),

    // files
    exists: ({ path }) => files.has(norm(path)) || dirs.has(norm(path)),
    is_dir: ({ path }) => dirs.has(norm(path)),
    read_text: ({ path }) => {
      const f = need(path)
      return f.text != null ? f.text : new TextDecoder().decode(f.bytes)
    },
    read_bytes: ({ path }) => {
      const f = need(path)
      return Array.from(f.text != null ? new TextEncoder().encode(f.text) : f.bytes)
    },
    write_text: ({ path, content, text, contents }) => {
      const p = norm(path)
      const m = put(p, { text: content ?? text ?? contents ?? '' })
      if (downloads.delete(p)) download(p)
      return m
    },
    write_bytes: ({ path, data }) => {
      const p = norm(path)
      put(p, { bytes: Uint8Array.from(data) })
      if (downloads.delete(p)) download(p)
      return null
    },
    copy_file: ({ from, to }) => void put(norm(to), { ...need(from) }),
    make_dir: ({ path }) => {
      addDirs(norm(path) + '/x')
      persist()
      return null
    },
    rename_path: ({ from, to }) => {
      const a = norm(from)
      const b = norm(to)
      if (files.has(b) || dirs.has(b)) throw 'A file with that name already exists'
      if (files.has(a)) {
        files.set(b, files.get(a))
        files.delete(a)
      } else if (dirs.has(a)) {
        for (const d of [...dirs]) if (inside(d, a)) (dirs.delete(d), dirs.add(b + d.slice(a.length)))
        for (const [p, f] of [...files]) if (inside(p, a)) (files.delete(p), files.set(b + p.slice(a.length), f))
      } else throw `No such file: ${from}`
      addDirs(b)
      persist()
      return null
    },
    mtime: ({ path }) => need(path).mtime,
    temp_dir: () => TMP,
    remove_temp: ({ path }) => void files.delete(norm(path)),
    list_dir: ({ path }) => {
      const dir = norm(path)
      const out = []
      for (const d of dirs) if (d !== dir && dirOf(d) === dir && !base(d).startsWith('.')) out.push({ name: base(d), path: d, dir: true })
      for (const p of files.keys()) if (dirOf(p) === dir && listed(p)) out.push({ name: base(p), path: p, dir: false })
      return out.sort((a, b) => b.dir - a.dir || a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }))
    },
    walk_md: ({ root }) => [...files.keys()].filter((p) => inside(p, norm(root)) && listed(p)).sort(),
    search_files: ({ root, query }) => {
      const q = String(query || '').toLowerCase()
      const hits = []
      if (!q) return hits
      for (const p of [...files.keys()].sort()) {
        const f = files.get(p)
        if (!inside(p, norm(root)) || !listed(p) || f.text == null) continue
        const lines = f.text.split('\n')
        for (let i = 0; i < lines.length && hits.length < 500; i++) if (lines[i].toLowerCase().includes(q)) hits.push({ path: p, line: i + 1, text: lines[i].trim().slice(0, 200) })
      }
      return hits
    },

    // export: the browser's print dialog writes the PDF ("Save as PDF")
    export_pdf: async ({ out, html }) => {
      if (inside(norm(out), TMP) && !inside(norm(out), TMP + '/exports')) throw 'Page preview needs the desktop app'
      downloads.delete(norm(out))
      await printHtml(need(html).text)
      return null
    },

    // system dialogs
    'plugin:dialog|open': ({ options = {} }) => (options.directory ? folderDialog() : pickFromComputer(options)),
    'plugin:dialog|save': ({ options = {} }) => saveDialog(options),
    'plugin:opener|open_url': ({ url }) => void window.open(url, '_blank', 'noopener'),
    'plugin:opener|open_path': ({ path }) => {
      const p = norm(path)
      if (files.has(p)) window.open(urlFor(p), '_blank', 'noopener')
      return null
    },
    'plugin:opener|reveal_item_in_dir': () => null,

    // the window: inside the site's frame, its buttons talk to the page around it
    'plugin:window|is_maximized': () => maximized,
    'plugin:window|toggle_maximize': () => void tellParent('toggle-maximize'),
    'plugin:window|internal_toggle_maximize': () => void tellParent('toggle-maximize'),
    'plugin:window|minimize': () => void tellParent('minimize'),
    'plugin:window|close': () => void tellParent('close'),
    'plugin:window|destroy': () => void tellParent('close'),
    'plugin:window|is_fullscreen': () => !!document.fullscreenElement,
    'plugin:window|set_fullscreen': async ({ value }) => {
      try {
        if (value) await document.documentElement.requestFullscreen()
        else if (document.fullscreenElement) await document.exitFullscreen()
      } catch {}
      return null
    },
    'plugin:window|set_title': ({ value }) => {
      document.title = value
      tellParent('title', { value })
      return null
    },
    'plugin:event|listen': ({ event, handler }) => {
      if (!listeners.has(event)) listeners.set(event, new Set())
      listeners.get(event).add(handler)
      return handler
    },
    'plugin:event|unlisten': ({ event, eventId }) => void listeners.get(event)?.delete(eventId),
    'plugin:updater|check': () => null,

    // extensions that need a real backend
    cloud_http: () => {
      throw NOT_HERE
    },
    cloud_rclone: () => {
      throw NOT_HERE
    },
    cloud_scan: () => {
      throw NOT_HERE
    },
    mcp_start: () => {
      throw NOT_HERE
    },
    mcp_status: () => null,
    secret_get: ({ name, key }) => sessionStorage.getItem('caretflow.secret.' + (name ?? key)) ?? null,
    secret_set: ({ name, key, value }) => void sessionStorage.setItem('caretflow.secret.' + (name ?? key), value ?? ''),

    // the phone layout
    android_dirs: () => ({ storage: HOME, documents: HOME + '/Documents', library: '' }),
    android_storage: () => ({ granted: true }),
    android_request_storage: () => null,
    android_take_intent: () => null,
    android_resolve: ({ uri }) => ({ path: uri }),
    android_system_color: () => null,
    android_bar_color: ({ color }) => {
      let m = document.querySelector('meta[name=theme-color]')
      if (!m) document.head.append((m = h('meta', { name: 'theme-color' })))
      if (color) m.content = color
      return null
    },
    android_share: ({ path }) => void download(norm(path)),
    android_open_path: ({ path }) => handlers['plugin:opener|open_path']({ path }),
    android_print: ({ html }) => printHtml(need(html).text),
  }

  loadFolder()
  seedSettings()

  window.__CARETFLOW_WEB__ = { root: ROOT, touch: TOUCH, embedded }
  window.__TAURI_INTERNALS__ = {
    metadata: { currentWindow: { label: 'main' }, currentWebview: { label: 'main', windowLabel: 'main' } },
    transformCallback: (fn) => {
      callbacks[++cb] = fn
      return cb
    },
    unregisterCallback: (id) => delete callbacks[id],
    convertFileSrc: urlFor,
    invoke: async (cmd, args = {}) => {
      const fn = handlers[cmd]
      return fn ? fn(args || {}) : null
    },
  }
  window.__TAURI_EVENT_PLUGIN_INTERNALS__ = { unregisterListener() {} }

  // the page around the frame learns when the editor is on screen
  addEventListener('load', () => tellParent('ready'))
})()
