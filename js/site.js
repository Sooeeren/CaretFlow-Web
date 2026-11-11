// CaretFlow website: theme switch, the typing demo in the hero, the small interactive windows,
// the embedded web version and the download links. No dependencies.
;(() => {
  const $ = (s, root = document) => root.querySelector(s)
  const $$ = (s, root = document) => [...root.querySelectorAll(s)]
  const html = document.documentElement
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
  const REPO = 'https://github.com/Sooeeren/CaretFlow'
  const API = 'https://api.github.com/repos/Sooeeren/CaretFlow/releases/latest'
  const el = (tag, cls, text) => {
    const n = document.createElement(tag)
    if (cls) n.className = cls
    if (text != null) n.textContent = text
    return n
  }

  let toastT
  function toast(msg, ms = 2600) {
    const t = $('#toast')
    t.textContent = msg
    t.classList.add('show')
    clearTimeout(toastT)
    toastT = setTimeout(() => t.classList.remove('show'), ms)
  }

  // ════════════════════════════════════════ themes (the app's four)
  const THEMES = ['paper', 'sepia', 'ink', 'slate']
  const SHOTS = { paper: 'editor', sepia: 'review', ink: 'dark', slate: 'source' }
  const theme = () => html.dataset.theme

  function syncTheme() {
    for (const b of $$('[data-set-theme]')) {
      const on = b.dataset.setTheme === theme()
      b.setAttribute('aria-checked', on)
      b.tabIndex = on ? 0 : -1
    }
    const shot = $('#theme-shot')
    const src = `assets/shots/${SHOTS[theme()]}.webp`
    if (shot && !shot.src.endsWith(src)) {
      shot.classList.add('swap')
      const img = new Image()
      img.onload = img.onerror = () => {
        shot.src = src
        shot.classList.remove('swap')
      }
      img.src = src
    }
  }
  function setTheme(t, from) {
    if (t === theme()) return
    const apply = () => {
      html.dataset.theme = t
      try {
        localStorage.setItem('caretflow.site.theme', t)
      } catch {}
      syncTheme()
    }
    if (!document.startViewTransition || reduce || !from) return apply()
    const r = from.getBoundingClientRect()
    html.style.setProperty('--tx', r.left + r.width / 2 + 'px')
    html.style.setProperty('--ty', r.top + r.height / 2 + 'px')
    document.startViewTransition(apply)
  }
  for (const group of $$('[role=radiogroup]')) {
    group.addEventListener('click', (e) => {
      const b = e.target.closest('[data-set-theme]')
      if (b) setTheme(b.dataset.setTheme, b)
    })
    group.addEventListener('keydown', (e) => {
      const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]
      if (!d) return
      e.preventDefault()
      const next = THEMES[(THEMES.indexOf(theme()) + d + THEMES.length) % THEMES.length]
      const b = $(`[data-set-theme="${next}"]`, group)
      setTheme(next, b)
      b.focus()
    })
  }
  syncTheme()

  // ════════════════════════════════════════ scrolling: nav line, things coming into view
  const nav = $('.nav')
  const onScroll = () => nav.classList.toggle('scrolled', scrollY > 8)
  addEventListener('scroll', onScroll, { passive: true })
  onScroll()

  const seen = new IntersectionObserver(
    (entries) => {
      for (const e of entries)
        if (e.isIntersecting) {
          e.target.classList.add('in')
          seen.unobserve(e.target)
        }
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.12 },
  )
  for (const n of $$('.reveal')) seen.observe(n)

  /** Calls fn(true/false) as `node` enters and leaves the screen */
  function watch(node, fn, margin = '0px') {
    new IntersectionObserver((es) => fn(es[es.length - 1].isIntersecting), { rootMargin: margin }).observe(node)
  }

  // ════════════════════════════════════════ the typing cat (drawing from the app's companion.js)
  const CAT_SVG = `<svg viewBox="0 0 160 104" aria-hidden="true">
  <g class="cat-body">
    <path class="ear" d="M42 52 L46 14 L72 34 Z"/><path class="ear" d="M118 52 L114 14 L88 34 Z"/>
    <path class="ear-in" d="M48 40 L50 24 L62 34 Z"/><path class="ear-in" d="M112 40 L110 24 L98 34 Z"/>
    <path class="fur" d="M26 96 C24 52 46 28 80 28 C114 28 136 52 134 96 Z"/>
    <ellipse class="blush" cx="58" cy="66" rx="7" ry="4"/><ellipse class="blush" cx="102" cy="66" rx="7" ry="4"/>
    <g class="eyes-open"><circle cx="66" cy="58" r="3.4"/><circle cx="94" cy="58" r="3.4"/></g>
    <g class="eyes-happy"><path d="M61 59 q5 -6 10 0"/><path d="M89 59 q5 -6 10 0"/></g>
    <path class="mouth" d="M73 66 q3.5 4 7 0 q3.5 4 7 0"/>
  </g>
  <rect class="desk" x="4" y="93" width="152" height="10" rx="3"/>
  <rect class="kbd" x="44" y="86" width="72" height="8" rx="2"/>
  <g class="kbd-keys"><rect x="49" y="88" width="8" height="3" rx="1"/><rect x="60" y="88" width="8" height="3" rx="1"/><rect x="71" y="88" width="18" height="3" rx="1"/><rect x="92" y="88" width="8" height="3" rx="1"/><rect x="103" y="88" width="8" height="3" rx="1"/></g>
  <g class="paw paw-l up"><ellipse cx="40" cy="70" rx="10" ry="8"/></g>
  <g class="paw paw-r up"><ellipse cx="120" cy="70" rx="10" ry="8"/></g>
  <g class="paw paw-l down"><ellipse cx="60" cy="86" rx="12" ry="6"/><path class="hit" d="M46 78 l-6 -4 M50 74 l-3 -6"/></g>
  <g class="paw paw-r down"><ellipse cx="100" cy="86" rx="12" ry="6"/><path class="hit" d="M114 78 l6 -4 M110 74 l3 -6"/></g>
</svg>`
  const LEFT_KEYS = new Set('`1234560qwertasdfgzxcvb~!@#$%^QWERTASDFGZXCVB\t'.split(''))
  /** Puts the cat into `node`; the function it returns makes a paw tap for a key */
  function makeCat(node) {
    node.innerHTML = CAT_SVG
    let side = 'l'
    let pawT, idleT
    return (key) => {
      const s = key === ' ' || key === 'Enter' ? 'both' : LEFT_KEYS.has(key) ? 'l' : 'r'
      // the same side twice in a row alternates, so fast typing still looks like drumming
      side = s === 'both' ? 'both' : s === side ? (s === 'l' ? 'r' : 'l') : s
      node.classList.remove('l', 'r', 'both')
      void node.offsetWidth
      node.classList.add(side, 'typing')
      clearTimeout(pawT)
      clearTimeout(idleT)
      pawT = setTimeout(() => node.classList.remove('l', 'r', 'both'), 110)
      idleT = setTimeout(() => node.classList.remove('typing'), 1400)
    }
  }
  /** Typing speed like the app's meter: the last 10 seconds, 5 characters = 1 word */
  function makeMeter(out) {
    const keys = []
    let burst = 0
    let last = 0
    const show = () => {
      const now = performance.now()
      while (keys.length && now - keys[0] > 10000) keys.shift()
      const idle = !keys.length || now - last > 3000
      if (!idle) out.textContent = Math.round(keys.length / 5 / (Math.max(3000, Math.min(10000, now - burst)) / 60000)) + ' WPM'
      out.classList.toggle('idle', idle)
    }
    setInterval(show, 500)
    return () => {
      const now = performance.now()
      if (now - last > 3000) burst = now
      last = now
      keys.push(now)
      show()
    }
  }

  // ════════════════════════════════════════ hero headline: typed, then "rendered"
  function heroTitle() {
    const h = $('#hero-title')
    const text = h.dataset.text
    if (reduce) return
    h.setAttribute('aria-label', text)
    h.textContent = ''
    h.classList.add('typing')
    const hash = el('span', 'hash', '#')
    hash.setAttribute('aria-hidden', 'true')
    h.append(hash)
    const chars = []
    for (const [i, word] of text.split(' ').entries()) {
      if (i) h.append(' ')
      const w = el('span')
      w.style.whiteSpace = 'nowrap'
      w.setAttribute('aria-hidden', 'true')
      for (const c of word) chars.push(w.appendChild(el('span', 'ch off', c)))
      h.append(w)
    }
    const caret = el('span', 'caret')
    caret.setAttribute('aria-hidden', 'true')
    chars[0].before(caret)
    let i = 0
    const step = () => {
      if (i < chars.length) {
        chars[i].classList.remove('off')
        chars[i].after(caret)
        i++
        setTimeout(step, 46 + Math.random() * 50 + (chars[i - 1].parentNode.lastChild === chars[i - 1] ? 60 : 0))
      } else setTimeout(() => h.classList.remove('typing'), 420)
    }
    const start = () => setTimeout(step, 350)
    document.fonts?.ready ? document.fonts.ready.then(start) : start()
  }
  heroTitle()

  // ════════════════════════════════════════ hero window: Markdown typed and rendered in place
  const SCRIPT = [
    { cls: 'h1', prefix: '# ', parts: ['Notes for Friday'] },
    { cls: 'p', parts: ['You write, and CaretFlow ', { mk: '**', cls: 'b', t: 'renders it in place' }, '. ', { mk: '*', cls: 'i', t: 'No split preview.' }] },
    { cls: 'task', prefix: '- [ ] ', parts: ['Draft the release notes'], check: true },
    { cls: 'task', prefix: '- [ ] ', parts: ['Record a short demo'] },
    { cls: 'p', parts: [{ w: 'Their', fix: 'They’re', kind: 'gr' }, ' going to read it ', { w: 'tomorow', fix: 'tomorrow', kind: 'sp' }, '.'], spell: true },
    { cls: 'p', parts: ['The area of a circle is ', { mk: '$', cls: 'math', t: 'A = \\pi r^2', html: '<i>A</i> = π<i>r</i><sup>2</sup>' }, '.'] },
  ]
  const SOURCE = [
    '<i>#</i> <b>Notes for Friday</b>',
    '',
    'You write, and CaretFlow <i>**</i><b>renders it in place</b><i>**</i>. <i>*</i>No split preview.<i>*</i>',
    '',
    '<i>- [x]</i> Draft the release notes',
    '<i>- [ ]</i> Record a short demo',
    '',
    'They’re going to read it tomorrow.',
    '',
    'The area of a circle is <i>$</i>A = \\pi r^2<i>$</i>.',
  ]

  function heroDemo() {
    const mock = $('#mock')
    const doc = $('#mock-doc')
    const stage = $('#hero-stage')
    const toggle = $('#stage-toggle')
    const wordsEl = $('#mock-words')
    const paw = makeCat($('#hero-cat'))
    $('#mock-src').innerHTML = SOURCE.map((l, i) => `<span class="n">${i + 1}</span>${l}`).join('\n')
    if (reduce) return // the finished document from the HTML stays as it is

    const meter = makeMeter($('#mock-wpm'))
    const STOP = Symbol('stop')
    let token = 0
    let paused = false
    let onscreen = false
    let plain = ''
    const caret = el('span', 'tc')

    const wait = (ms, my) =>
      new Promise((res, rej) => {
        let left = ms
        let last = performance.now()
        const step = () => {
          if (my !== token) return rej(STOP)
          const now = performance.now()
          const live = !paused && onscreen && !document.hidden
          if (live) left -= now - last
          last = now
          if (left <= 0) res()
          else setTimeout(step, live ? Math.min(left, 40) : 160)
        }
        step()
      })

    async function type(target, text, my, { mark = false, slow = 1 } = {}) {
      mock.classList.add('busy')
      for (const ch of text) {
        target.append(ch)
        target.after(caret)
        if (!mark) plain += ch
        paw(ch)
        meter()
        wordsEl.textContent = `${plain.trim().split(/\s+/).filter(Boolean).length} words`
        await wait((ch === ' ' ? 56 : 36) * slow + Math.random() * 34, my)
      }
      mock.classList.remove('busy')
    }

    async function block(b, my) {
      const node = el('div', 'blk')
      doc.append(node)
      node.append(caret)
      let box = null
      if (b.prefix) {
        const mk = el('span', 'mk')
        node.prepend(mk)
        await type(mk, b.prefix, my, { mark: true, slow: 1.5 })
        // the input rule fires: the marker goes, the block takes its shape
        mk.classList.add('gone')
        node.classList.add(b.cls)
        if (b.cls === 'task') node.prepend((box = el('span', 'box')))
        await wait(260, my)
      } else node.classList.add(b.cls)

      const words = []
      for (const part of b.parts) {
        const s = el('span')
        caret.before(s)
        if (typeof part === 'string') await type(s, part, my)
        else if (part.w) {
          s.className = 'word'
          await type(s, part.w, my)
          words.push([s, part])
        } else {
          const open = el('span', 'mk')
          const close = el('span', 'mk')
          s.before(open)
          await type(open, part.mk, my, { mark: true, slow: 1.4 })
          s.className = 'pending'
          await type(s, part.t, my)
          s.after(close)
          await type(close, part.mk, my, { mark: true, slow: 1.4 })
          open.classList.add('gone')
          close.classList.add('gone')
          s.className = part.cls
          if (part.html) s.innerHTML = part.html
          await wait(240, my)
        }
        plain += ' '
      }
      if (b.check) {
        await wait(380, my)
        box.classList.add('on', 'pop')
        await wait(220, my)
        box.classList.remove('pop')
      }
      if (b.spell) await spell(words, my)
      await wait(420, my)
    }

    /** The checker marks the words; a right-click menu fixes them one by one */
    async function spell(words, my) {
      await wait(650, my)
      for (const [s, p] of words) s.classList.add(p.kind)
      await wait(1100, my)
      for (const [s, p] of words.reverse()) {
        const menu = el('div', 'sugg')
        const pick = el('div', 'hot', p.fix)
        menu.append(pick, el('div', 'dim', 'Ignore'), el('div', 'dim', 'Add to dictionary'))
        doc.append(menu)
        menu.style.left = Math.max(8, Math.min(s.offsetLeft, doc.clientWidth - 170)) + 'px'
        menu.style.top = s.offsetTop + s.offsetHeight + 6 + 'px'
        await wait(30, my)
        menu.classList.add('show')
        await wait(620, my)
        pick.classList.add('on')
        await wait(360, my)
        s.textContent = p.fix
        s.classList.remove(p.kind)
        s.classList.add('fixed')
        menu.remove()
        await wait(520, my)
        s.classList.remove('fixed')
      }
    }

    async function play() {
      const my = ++token
      try {
        for (;;) {
          doc.innerHTML = ''
          doc.classList.remove('wipe')
          plain = ''
          wordsEl.textContent = '0 words'
          await wait(500, my)
          for (const b of SCRIPT) await block(b, my)
          await wait(2200, my)
          // Ctrl+/ shows the raw Markdown, and brings the page back
          const keys = $('#mock-keys')
          for (const on of [true, false]) {
            keys.classList.add('show')
            await wait(520, my)
            mock.classList.toggle('source', on)
            await wait(700, my)
            keys.classList.remove('show')
            await wait(on ? 2600 : 2400, my)
          }
          doc.classList.add('wipe')
          await wait(450, my)
        }
      } catch (e) {
        if (e !== STOP) throw e
      }
    }

    toggle.hidden = false
    toggle.onclick = () => {
      paused = !paused
      toggle.setAttribute('aria-pressed', paused)
      toggle.lastElementChild.textContent = paused ? 'Play' : 'Pause'
    }
    let started = false
    watch(stage, (v) => {
      onscreen = v
      if (v && !started) {
        started = true
        play()
      }
    })
  }
  heroDemo()

  // ════════════════════════════════════════ writing check you can click through
  function checkToy() {
    const text = $('#check-text')
    const pop = $('#check-pop')
    const count = $('#check-count')
    const next = $('#check-next')
    const reset = $('#check-reset')
    const original = text.innerHTML
    let open = null
    const left = () => $$('.iss:not(.done)', text)

    function update() {
      const n = left().length
      count.className = 'count ' + (n ? 'bad' : 'ok')
      count.textContent = n ? `✎ ${n} ${n === 1 ? 'issue' : 'issues'}` : '✓ No issues. That reads well.'
      next.hidden = !n
      reset.hidden = !!n
    }
    function close() {
      open?.classList.remove('open')
      open = null
      pop.hidden = true
    }
    function show(btn) {
      close()
      open = btn
      btn.classList.add('open')
      $('.pop-kind', pop).textContent = btn.dataset.kind
      $('.pop-kind', pop).classList.toggle('sp', btn.classList.contains('sp'))
      $('.pop-msg', pop).textContent = btn.dataset.msg
      $('.pop-fix', pop).textContent = btn.dataset.fix
      pop.hidden = false
      const host = pop.offsetParent
      pop.style.left = Math.max(12, Math.min(btn.offsetLeft, host.clientWidth - pop.offsetWidth - 12)) + 'px'
      pop.style.top = btn.offsetTop + btn.offsetHeight + 8 + 'px'
      $('.pop-fix', pop).focus({ preventScroll: true })
    }
    function settle(fix) {
      if (!open) return
      const done = el('span', 'iss done', fix ? open.dataset.fix : open.textContent)
      open.replaceWith(done)
      open = null
      pop.hidden = true
      update()
      ;(left()[0] ? next : reset).focus({ preventScroll: true })
    }

    text.addEventListener('click', (e) => {
      const b = e.target.closest('button.iss')
      if (b) open === b ? close() : show(b)
    })
    $('.pop-fix', pop).onclick = () => settle(true)
    $('.pop-ignore', pop).onclick = () => settle(false)
    next.onclick = () => left()[0] && show(left()[0])
    reset.onclick = () => {
      text.innerHTML = original
      update()
      next.focus({ preventScroll: true })
    }
    const toy = $('#check')
    toy.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && open) {
        const b = open
        close()
        b.focus()
      } else if (e.key === 'F7' && left()[0]) {
        e.preventDefault()
        show(left()[0])
      }
    })
    document.addEventListener('pointerdown', (e) => open && !e.target.closest('#check-pop, button.iss, #check-next') && close())
    update()
  }
  checkToy()

  // ════════════════════════════════════════ rendered ⇄ raw (Ctrl+/ works on the page too)
  function flipToy() {
    const flip = $('#flip')
    const btn = $('#flip-btn')
    const label = $('#flip-label')
    let visible = false
    watch(flip, (v) => (visible = v))
    const set = (raw) => {
      flip.classList.toggle('raw', raw)
      btn.setAttribute('aria-pressed', raw)
      btn.lastElementChild.textContent = raw ? 'Show the rendered page' : 'Show raw Markdown'
      label.textContent = raw ? 'Source mode, Vim keys on' : 'Rendered'
      $('.flip-face.raw', flip).setAttribute('aria-hidden', !raw)
      $('.flip-face.rendered', flip).setAttribute('aria-hidden', raw)
    }
    btn.onclick = () => set(!flip.classList.contains('raw'))
    addEventListener('keydown', (e) => {
      if (!(e.ctrlKey || e.metaKey) || e.key !== '/' || !visible) return
      if (e.target.closest?.('input, textarea')) return
      e.preventDefault()
      set(!flip.classList.contains('raw'))
    })
  }
  flipToy()

  // ════════════════════════════════════════ the web version, in a frame
  function demo() {
    const box = $('#demo')
    const stage = box.closest('.stage')
    const launch = $('#demo-launch')
    const reset = $('#demo-reset')
    let frame = null
    let max = false

    function setMax(v) {
      max = v
      box.classList.toggle('max', v)
      html.classList.toggle('demo-max', v)
      stage.style.zIndex = v ? 500 : ''
      frame?.contentWindow?.postMessage({ source: 'caretflow-site', type: 'maximized', value: v }, '*')
    }
    function start(extra = '') {
      frame?.remove()
      frame = document.createElement('iframe')
      frame.title = 'CaretFlow, running in your browser'
      frame.allow = 'fullscreen; clipboard-read; clipboard-write'
      frame.src = `app/?theme=${theme()}${extra}`
      frame.onload = () => frame.focus()
      box.append(frame)
      box.classList.add('live')
    }
    function stop() {
      setMax(false)
      frame?.remove()
      frame = null
      box.classList.remove('live')
    }

    launch.addEventListener('click', (e) => {
      if (innerWidth < 820) return // phones: the app opens as its own page, in its touch layout
      e.preventDefault()
      start()
    })
    addEventListener('message', (e) => {
      if (!frame || e.source !== frame.contentWindow || e.data?.source !== 'caretflow') return
      if (e.data.type === 'toggle-maximize') setMax(!max)
      else if (e.data.type === 'minimize') setMax(false)
      else if (e.data.type === 'close') {
        stop()
        toast('Closed. Launch it again whenever you like.')
      }
    })

    let armed
    reset.onclick = () => {
      if (!reset.classList.contains('sure')) {
        reset.classList.add('sure')
        reset.textContent = 'Really reset? Your changes in the demo are deleted'
        armed = setTimeout(() => {
          reset.classList.remove('sure')
          reset.textContent = 'Reset the demo files'
        }, 5000)
        return
      }
      clearTimeout(armed)
      reset.classList.remove('sure')
      reset.textContent = 'Reset the demo files'
      if (frame) start('&reset=1')
      else
        try {
          for (const k of Object.keys(localStorage)) if (k.startsWith('folio.') || k.startsWith('caretflow.web.')) localStorage.removeItem(k)
        } catch {}
      toast('The demo files are back to how they started.')
    }
  }
  demo()

  // ════════════════════════════════════════ the cat you can wake up
  function catBox() {
    const paw = makeCat($('#big-cat'))
    const meter = makeMeter($('#cat-wpm'))
    $('#cat-input').addEventListener('keydown', (e) => {
      if (e.repeat || e.ctrlKey || e.altKey || e.metaKey) return
      if (!(e.key.length === 1 || e.key === 'Enter' || e.key === 'Backspace')) return
      paw(e.key)
      meter()
    })
  }
  catBox()

  // ════════════════════════════════════════ downloads: your system first, direct links when GitHub answers
  function downloads() {
    const ua = navigator.userAgent
    const os = /Android/i.test(ua) ? 'android' : /Windows/i.test(ua) ? 'windows' : /Mac|iPhone|iPad|iPod/i.test(ua) ? 'apple' : /Linux|X11|CrOS/i.test(ua) ? 'linux' : null
    $(`.dl-card[data-os="${os}"]`)?.classList.add('yours')
    const label = { windows: 'Download for Windows', linux: 'Download for Linux', android: 'Get the Android app' }[os]
    if (label) $('#cta-download span').textContent = label

    const showVersion = (v) => v && ($('#hero-version').textContent = ` · version ${String(v).replace(/^v/, '')}`)
    fetch('assets/app-version.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => j && !$('#hero-version').textContent && showVersion(j.version))
      .catch(() => {})

    // asked only when the download section comes near, and once
    let asked = false
    watch(
      $('#download'),
      async (near) => {
        if (!near || asked) return
        asked = true
        try {
          const r = await fetch(API, { headers: { Accept: 'application/vnd.github+json' } })
          if (!r.ok) return
          const rel = await r.json()
          showVersion(rel.tag_name)
          for (const a of $$('a[data-asset]')) {
            const asset = (rel.assets || []).find((x) => new RegExp(a.dataset.asset, 'i').test(x.name) && !/\.sig$/.test(x.name))
            if (!asset) continue
            a.href = asset.browser_download_url
            a.title = asset.name
            $('span', a).append(el('em', '', ` · ${(asset.size / 1048576).toFixed(asset.size < 10485760 ? 1 : 0)} MB`))
          }
          $('#dl-note').innerHTML = `Free, for Windows, Linux and Android. These are the files of <a href="${REPO}/releases/latest">version ${String(rel.tag_name).replace(/^v/, '')}</a>.`
        } catch {}
      },
      '900px',
    )
  }
  downloads()
})()
