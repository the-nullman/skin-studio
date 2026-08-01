# Skin Studio

A browser-based editor for Minecraft skins — paint in 2D, watch it update on a
live 3D model. Everything runs client-side; there is no server and nothing to
sign up for.

**Features**
- Steve (classic) and Alex (slim) models, switchable at any time.
- Import and export standard 64×64 skin PNGs.
- Brush, eraser, fill (whole part or flood), and eyedropper.
- Darken/Lighten tool with a plain-value mode and a painterly OKLCH
  color-temperature mode (cool shadows, warm highlights).
- Layers with opacity, 12 Photoshop-style blend modes, and undo/redo.
- Custom triangular color picker with hex / RGB / HSL input.
- Per-part and per-layer visibility via a model-proportional paper doll.

## Use it

- **Online:** open the hosted URL (GitHub Pages — see below). Nothing to install.
- **Offline:** open the standalone `index.html` in any modern browser. It's a
  single self-contained file — double-click it, no server or install needed. It
  works fully offline and is byte-identical to the hosted version.

Requires a browser with WebGL (any current Chrome, Edge, Firefox, or Safari).

## Develop

```sh
npm install
npm run dev        # local dev server with hot reload
npm run build      # type-check + produce the standalone dist/index.html
npm run preview    # serve the production build locally
npm test           # run the unit tests
```

`npm run build` writes a single inlined `dist/index.html` — that one file is
both what gets deployed and what you can send for offline use.

New to the codebase? [ARCHITECTURE.md](ARCHITECTURE.md) is the developer
guide: the data-flow model, a map of every module, the invariants that keep
2D/3D in sync, and checklists for adding tools and blend modes.

## Deploy

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds the app
and publishes it to GitHub Pages automatically. One-time setup on the repo:
**Settings → Pages → Source: "GitHub Actions."** The site is then served at
`https://<user>.github.io/<repo>/`.
