# CaretFlow website

The landing page for [CaretFlow](https://github.com/Sooeeren/CaretFlow), with the editor itself
running in the browser under `app/`.

## Look at it

```
npm run build:demo    # builds the web version of the app into app/ (needs ../folio with npm install done)
npm run dev           # http://localhost:4321/
```

The page is plain HTML, CSS and JavaScript with no build step. Only `app/` is built.

## What is where

| Path | What it is |
| --- | --- |
| `index.html`, `css/site.css`, `js/site.js` | The landing page: the typing demo in the hero, the writing-check and raw/rendered windows, theme switch, download links |
| `demo/web-backend.js` | Stands in for the Tauri backend so the app runs in a browser: a folder kept in `localStorage`, file pickers and downloads instead of system dialogs, the print dialog for PDF |
| `scripts/build-demo.mjs` | Runs the app's own Vite build into `app/` and puts `web-backend.js` in front of it. `--src <folder>` picks another checkout. The CaretFlow source is not changed |
| `scripts/serve.mjs` | A small static server for local viewing |
| `assets/shots/` | The README screenshots as WebP |
| `assets/fonts/` | Fraunces, Geist and JetBrains Mono (SIL Open Font License, see `LICENSES.txt`) |
| `.github/workflows/pages.yml` | Builds the demo from the CaretFlow repository and publishes everything to GitHub Pages |

## The web version

`app/` is the unmodified CaretFlow frontend. What differs from the desktop app comes from
`demo/web-backend.js`:

- Files live in one folder in the browser's storage. **File → Open** copies a file in from the
  computer; **Save As** can download one. Dropping a Markdown file on the window opens it.
- **Export as PDF** opens the browser's print dialog. Page preview, Cloud Sync, AI Writing Help and
  the MCP server answer that they need the desktop or Android app.
- Phones get the app's Android touch layout (`?touch=1` forces it, `?touch=0` turns it off).
- `?theme=ink` starts in a theme, `?reset=1` puts the sample files back.

After a new CaretFlow release, run `npm run build:demo` again (or let the Pages workflow do it).
If the app gains new backend commands, add them to `handlers` in `demo/web-backend.js`; commands it
does not know return `null`.

## Updating the page

- Screenshots: copy the new ones from `docs/screenshots/` of the app as WebP into `assets/shots/`.
- Download links point at the latest release. When GitHub's API answers, the page swaps in direct
  links and file sizes; `data-asset` on each link is the pattern its file name has to match.
