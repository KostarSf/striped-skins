# Striped Skins

Mine Little Pony skin viewer and editor. View and compare skins, paint in 2D and
3D, edit model settings, and export PNG skins. Includes a React viewer and a
standalone browser bundle.

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
- [Development roadmap](docs/editor-development-roadmap.md)
