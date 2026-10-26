# Local model sources

These files are a small, pinned snapshot of MineLittlePony for Minecraft 1.20.1
and Mson 1.9.3+1.20.1. Both upstream projects use MIT; their license notices are
included in the respective directories. `manifest.json` records exact Git
revisions and SHA-256 hashes. Model JSON and Java reference files are kept byte
for byte, so formatters exclude this directory.

Only the Earthpony dependency closure is included in this slice. The Java files
document the provenance of metadata and standing size rules; Java is never run
as part of this project. `packages/models/src/index.ts` explicitly ports the
standing transformations, and the viewer supplies the standing leg pivots.

Normal builds consume checked-in generated data, need no upstream checkout,
and make no requests to either upstream repository. Regenerate locally with:

```sh
npm run models:generate
npm run models:check
```

To restore this exact snapshot from optional checkouts, explicitly run:

```sh
npm run models:import -- --mlp /path/to/mlp --mson /path/to/mson
```

This maintenance command verifies both commits and file hashes before writing
anything. To update to a new upstream version, review the changed source files,
update revisions and reviewed hashes in the manifest, reimport, regenerate, and
run the unit/browser checks. Do not run the importer from `build` or `postinstall`.
