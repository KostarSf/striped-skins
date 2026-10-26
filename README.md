# Striped Skins

Mine Little Pony skin viewer, built with React Router Framework Mode, React and Three.js.
The npm workspace also contains the skin API, React viewer and standalone browser bundle.

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
production application and standalone browser bundle.

## Production

```sh
npm run build
npm start
```

Deploy `build/`, `public/`, the workspace packages (including their `build/`
directories), package manifests and production dependencies. The Node server entry
is `build/server/index.js`; client assets are in `build/client/`.

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
