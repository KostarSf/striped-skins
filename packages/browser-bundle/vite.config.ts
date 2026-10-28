import { defineConfig } from "vite";
import { productionBundleGuard } from "../../tools/production-bundle-guard.ts";

export default defineConfig({
  publicDir: "../../public",
  plugins: [productionBundleGuard()],
});
