# Striped Skins

Mine Little Pony skin viewer and editor. View and compare skins, paint in 2D and
3D, organize layers, save `.striped` projects, and export PNG skins. Includes a
React viewer and a standalone browser bundle.

Skin settings include nearest-neighbour resizing from 64×64 up to 4096×4096.
Skins above 512×512 open with a 3D preview and skin parameters only; reducing
the resolution to 512 or less enables texture editing. Resizing preserves
layers and MLP metadata and supports undo/redo. The 64 MiB raster budget still
applies: merge layers at a smaller resolution before increasing beyond it.

## Development

Requires Node.js **24.22.1 LTS** and npm.

```sh
npm ci
npm run dev
```

The development server builds workspace libraries first. After editing library
sources, run `npm run build:libs` to refresh their output. Generated models are
checked in; no MineLittlePony checkout is needed.

## Checks

```sh
npm run build:libs
npm run check
npm run test:unit
npm run build
npx playwright install chromium
npm run test:e2e
```

## Production

```sh
npm run build
npm start
```

For the standalone viewer, use `npm run dist:lib` and `npm run preview:lib`.

## Documentation

- [Interface and shortcuts](docs/figma-interface.md)
- [Editor guide](docs/model-lab.md)
- [Project format](docs/project-format.md)
- [Development roadmap](docs/editor-development-roadmap.md)
