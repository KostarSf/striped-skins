# Striped Skins

Mine Little Pony skin viewer, built with React Router Framework Mode, React and Three.js.
The npm workspace also contains the skin API, React viewer and standalone browser bundle.

The viewer renders all MLP 1.20.1 races, sizes and accessories from vendored Mson
data. Use **Редактировать** to open `/editor` for shared 2D/3D painting, metadata
editing, part visibility and PNG export. `/model-lab` remains the Earthpony regression
page. The Figma-based interface and shortcuts are described in
[the interface guide](docs/figma-interface.md). See [the editor guide](docs/model-lab.md) and [implementation status](docs/editor-roadmap.md).
Normal builds use checked-in generated models and need no MineLittlePony checkout.

## Requirements

Use Node.js **24.22.1 LTS** (see `.nvmrc` and `.node-version`) and npm.

```sh
nvm use
npm ci
npm run dev
```

`dev` builds the workspace libraries first, then starts the React Router Vite server
with hot reload. After editing library sources, run `npm run build:libs` to refresh
their compiled output.

## Checks

```sh
npm run build:libs
npm run check
```

`check` runs Oxlint, Oxfmt's formatting check, React Router route type generation
and TypeScript. Use `npm run format` to format the repository. CI also builds the
production application and standalone browser bundle, then runs Chromium regression
checks for comparison rendering and skin URL state.

To run the browser checks locally after `npm run build`:

```sh
npx playwright install chromium
npm run test:e2e
```

## Production

```sh
npm run build
npm start
```

Deploy `build/`, `public/`, the workspace packages (including their `build/`
directories), package manifests and production dependencies. The Node server entry
is `build/server/index.js`; client assets are in `build/client/`.

## Vercel

`vercel.json` selects the React Router framework explicitly, overriding a legacy
Remix framework selection in the Vercel project. It uses `npm ci` and
`npm run build` so the API and viewer workspaces compile before the application.
Keep the project's Root Directory at the repository root and clear any legacy
Output Directory override; React Router's builder handles the SSR server and
client assets. Use Node.js 24.x in the Vercel project settings.

## Standalone browser bundle

```sh
npm run dist:lib
npm run preview:lib
```

For bundle development, use `npm run dev:lib`. Both development and distribution
commands build the workspace libraries automatically.

The API and viewer packages expose ESM JavaScript and TypeScript declarations.
The old unused CommonJS output has been removed. `r3f-perf`'s Drei dependency is
overridden to Drei 10 to share the React 19-compatible renderer stack.

Oxlint checks hooks and accessibility. React Compiler-specific ref/immutability
and synchronous-effect checks are disabled for the existing imperative Three.js
and URL synchronization code; the project does not enable React Compiler.
