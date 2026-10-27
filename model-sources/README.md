# Local model sources

Pinned MineLittlePony for Minecraft 1.20.1 (`2398b14a`) and Mson 1.9.3+1.20.1
(`cafaa6ae`), including all twelve pony races, both arm variants, six accessory
models and their texture dependencies. Both projects use MIT; license notices
are included. Java files record the behavior ported into TypeScript; Java is
never compiled or run here. Source bytes remain unchanged by formatters.

`minecraft/textures/witch.png` is the original Minecraft 1.20.1 witch atlas used
by MLP's witch hat. It belongs to Mojang Studios, not the MIT projects. Its official
client URL, archive SHA-1, resource path and extracted SHA-256 are recorded in the
manifest. No Minecraft client executable is included.

Normal builds use checked-in generated data and need neither neighboring
repositories nor network access. To regenerate and verify:

```sh
npm run models:generate
npm run models:check
```

Restore this exact snapshot from optional checkouts:

```sh
npm run models:import -- --mlp /path/to/mlp --mson /path/to/mson
```

The importer verifies commits and every source hash before writing. The Minecraft
texture is verified in place; to re-extract it, optionally add
`--minecraft-client /path/to/1.20.1-client.jar` (requires `unzip`). The archive hash
must match the manifest. Nothing is downloaded automatically.

For an upstream upgrade, explicitly review and update revisions, source paths
and hashes in `manifest.json`, reimport, regenerate, and run unit/browser checks.
Never invoke the importer from `build` or `postinstall`.
