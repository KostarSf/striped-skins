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
variants and quality weights, and falls back to English. The View menu offers
Automatic, Русский and English. An explicit choice is saved for one year in an
HttpOnly, SameSite=Lax cookie and takes priority over browser preferences on
the first server render. Automatic deletes the cookie. The browser hydrates
with the server's `<html lang>`. Both typed catalogs are bundled in
`app/i18n/en.ts` and `app/i18n/ru.ts`.

Use semantic keys with `useTranslation()` for UI text, including accessible
names and tooltips. Keep CSS selectors independent of translated strings.
Document history uses stable operation codes; the app also translates legacy
Russian operation labels. Layer names are document content: new names use the
current language and existing names are preserved when opening a project.
Library validation errors expose `SkinError.code` for app-owned translations.

Language changes submit a React Router fetcher form to the root action and
revalidate the locale and metadata without navigating or replacing the workspace.
The preference is separate from document settings and is never stored in a
`.striped` project. Cookie handling lives in `app/i18n/preference.server.ts`;
`app/i18n/middleware.server.ts` resolves the preference before browser detection.

Existing browser tests explicitly use Russian; `tests/i18n.spec.ts` covers both
languages, SSR isolation, cross-language project imports, persisted language
selection and returning to automatic browser detection.

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
