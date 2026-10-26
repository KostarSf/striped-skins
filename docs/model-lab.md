# Earthpony vertical slice

The agreed product flow and remaining work are tracked in [the editor roadmap](editor-roadmap.md).

Open `/model-lab`, or use “Лаборатория моделей” on the existing viewer. Start with
`npm ci` and `npm run dev`; no adjacent repository is required. The original viewer
and its standalone entry remain available with their existing behavior.

The slice implements:

- Vendored, hash-verified MLP 1.20.1 + Mson 1.9.3 model sources and generated data.
- A private, build-time Mson compiler and a browser-safe `@striped-skins/models` package.
- Earthpony Steve/Alex, the six standing size presets, and independent geometry visibility.
- A DOM-independent `SkinDocument`, protected trigger pixels and a pure metadata decoder.
- One-pixel 2D/3D brush, eraser, per-stroke undo/redo, PNG import/export.
- Selection of visible opaque surfaces, or an explicit part to paint empty overlay pixels.
- One texture per document/preview, shared material, geometry per part, resource disposal,
  on-demand frames and coalesced GPU texture uploads.

Use “Режим: кисть” for 3D painting; the 2D texture always accepts the brush. The
layer selector allows painting transparent regions of a chosen visible part.
Hiding the skull preserves its ears; the checkboxes hide geometry, not transform
groups. Preview size/slim settings never rewrite metadata in the exported PNG.
The document still preserves the skin's original race even though this page
always previews Earthpony. Each import constructs a fresh independent document.

This page is an experimental integration surface, not a complete editor. It
accepts modern square 64×64 and HD PNGs up to 2048×2048. Legacy 64×32 normalization,
other races, accessories, animated poses, non-straight tail shape rules and
continuous brush transfer across UV seams are follow-up work. It uses an unlit
cutout material for editing, without partial-alpha blending. It does not claim
pixel-perfect parity with a running Minecraft instance.

Verification commands:

```sh
npm run models:check
npm run build
npm run check
npm run test:unit
npm run dist:lib
npx playwright install chromium
npm run test:e2e
```

The unit suite checks component replacement, local resolution, literal UVs,
unsupported constructs, reproducible output, slim dimensions, size rules,
document isolation, metadata alpha semantics and stroke history. Browser tests
cover all six sizes, independent visibility, 2D→3D and 3D→2D painting, PNG
round-trip, protected metadata, ignored hidden meshes, and resource stability
after repeatedly changing variant. Existing comparison/URL tests also run.

The initial default-skin scene has 28 draw calls, 304 triangles, 28 uploaded
geometries and one texture. The page shows live `renderer.info` counters. These
counts describe the tested scene; they are not an FPS benchmark or proof of
parity with Minecraft. Hidden/unavailable parts can retain CPU geometry without
uploading it to the GPU until first rendered.
