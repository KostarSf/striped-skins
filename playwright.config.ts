import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:3100",
    viewport: { width: 1000, height: 800 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
      args: ["--enable-unsafe-swiftshader", "--use-gl=angle", "--use-angle=swiftshader"],
    },
  },
  webServer: {
    command: "npm start",
    env: { PORT: "3100", HOST: "127.0.0.1" },
    url: "http://127.0.0.1:3100",
  },
});
