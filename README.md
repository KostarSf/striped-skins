# Striped Skins

Mine Little Pony skin viewer and editor. View and compare skins, paint in 2D and
3D, organize layers, save `.striped` projects, and export PNG skins. Includes a
React viewer and a standalone browser bundle.

## Development

Requires Node.js **24.22.1 LTS** and npm.

```sh
npm ci
npm run dev
```

The development server builds workspace libraries first. After editing library
sources, run `npm run build:libs` to refresh their output. Generated models are
checked in; no MineLittlePony checkout is needed.

## Languages

The application supports English and Russian using `remix-i18next` and
`react-i18next`. Each request negotiates `Accept-Language`, including regional
variants and quality weights, and falls back to English. The browser hydrates
with the server's `<html lang>`; language detection does not write cookies,
browser storage, or project settings. Both typed catalogs are bundled in
`app/i18n/en.ts` and `app/i18n/ru.ts`.

Use semantic keys with `useTranslation()` for UI text, including accessible
names and tooltips. Keep CSS selectors independent of translated strings.
Document history uses stable operation codes; the app also translates legacy
Russian operation labels. Layer names are document content: new names use the
current language and existing names are preserved when opening a project.
Library validation errors expose `SkinError.code` for app-owned translations.

A future persisted preference belongs in `app/i18n/middleware.server.ts`, before
the browser-language fallback. A cookie or account setting lets SSR respect the
preference on the initial request. No changes to translation consumers are needed.

Existing browser tests explicitly use Russian; `tests/i18n.spec.ts` covers both
languages, SSR isolation, cross-language project imports and the absence of
language persistence.

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
