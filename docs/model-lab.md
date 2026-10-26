# Model editor and regression lab

The main viewer `/` now uses the generated renderer and offers **Редактировать**
for each skin. `/editor` edits the same document and returns its result to the
viewer. See [the implementation status and motion contract](editor-roadmap.md).

`/model-lab` remains an isolated Earthpony regression page. Its size/slim controls
are preview overrides; the document preserves its real metadata. On `/editor`,
race, size, snout, tail and wearables are actual undoable PNG metadata edits.
Wing/form/slim controls and geometry visibility affect only the preview.

Use **Режим: кисть** to paint in 3D; the 2D texture always accepts a brush. Choose
an explicit part to paint transparent pixels, or use the nearest opaque editable
surface. Accessory textures are visible but not brush targets. Select a part to
see its UV outline. Scroll the 2D pane after zooming. Parent geometry and child
geometry have independent checkboxes; **Скрыть ветку** hides both.

Modern square and legacy half-height PNGs, including HD up to 2048 pixels, are
accepted. Legacy imports are upgraded to modern square PNG on export. Trigger
coordinates remain physical pixels at the atlas origin. The brush protects them;
metadata controls change them explicitly. Local recovery preserves pixels but
starts a fresh history after a page reload; route changes preserve history.

```sh
npm ci
npm run dev
npm run models:check
npm run build
npm run check
npm run test:unit
npm run dist:lib
npx playwright install chromium
npm run test:e2e
```

No neighboring repository is needed. Source maintenance instructions and
attribution are in [model-sources](../model-sources/README.md).

The default lab Earthpony has 28 draw calls, 304 triangles, 28 uploaded geometries
and one texture. The normal default skin is Pegasus and additionally draws wings.
Counters describe these scenes, not an FPS benchmark. Hidden/unavailable geometry
can remain on the CPU and is uploaded only when rendered. Materials are unlit,
alpha-tested with partial-alpha blending; visual parity with a running Minecraft
instance still needs comparison.
