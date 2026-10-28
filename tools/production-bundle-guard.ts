import type { Plugin } from "vite";

/** Fail the build if optional development tooling leaks into any output chunk. */
export function productionBundleGuard(): Plugin {
  const forbidden =
    /\/node_modules\/(?:r3f-perf|troika-[^/]+|bidi-js|webgl-sdf-generator|@stitches\/react|@radix-ui\/react-icons|postprocessing|@react-three\/postprocessing)\//;
  return {
    name: "production-bundle-guard",
    apply: "build",
    generateBundle(_options, bundle) {
      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== "chunk") continue;
        for (const id of [...chunk.imports, ...chunk.dynamicImports]) {
          if (forbidden.test(`/node_modules/${id}/`))
            this.error(`Production chunk ${chunk.fileName} imports forbidden module ${id}`);
        }
        for (const [id, module] of Object.entries(chunk.modules)) {
          if (module.renderedLength > 0 && forbidden.test(id.replaceAll("\\", "/")))
            this.error(`Production chunk ${chunk.fileName} includes forbidden module ${id}`);
        }
      }
    },
  };
}
