import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import { productionBundleGuard } from "./tools/production-bundle-guard.ts";

export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), productionBundleGuard()],
  resolve: {
    alias: { "~": fileURLToPath(new URL("./app", import.meta.url)) },
  },
});
