import { expect, test } from "@playwright/test";
import { resolve } from "node:path";
import { build } from "vite";

let fixture: string;
test.beforeAll(async () => {
  const result = await build({
    configFile: false,
    publicDir: false,
    logLevel: "silent",
    build: {
      write: false,
      lib: { entry: resolve("tests/fixtures/atlas-msaa.ts"), formats: ["iife"], name: "AtlasTest" },
    },
  });
  const output = Array.isArray(result) ? result[0] : result;
  if (!("output" in output)) throw new Error("Expected an in-memory browser fixture");
  const chunk = output.output.find((part) => part.type === "chunk");
  if (!chunk || chunk.type !== "chunk") throw new Error("Missing browser fixture");
  fixture = chunk.code;
});

test("MSAA never samples opaque atlas neighbors outside a transparent polygon", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/__atlas-test.js", (route) =>
    route.fulfill({ contentType: "application/javascript", body: fixture }),
  );
  await page.route("**/__atlas-test", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<html><body><script src="/__atlas-test.js"></script></body></html>',
    }),
  );
  await page.goto("/__atlas-test");
  await expect(page.locator("#results")).toBeAttached();
  const { antialias, samples, results } = JSON.parse(
    (await page.locator("#results").textContent())!,
  );
  expect(antialias).toBe(true);
  expect(samples).toBeGreaterThan(1);
  expect(results).toHaveLength(8);
  for (const result of results) {
    expect(result.baseline, JSON.stringify(result)).toBeGreaterThan(0);
    expect(result.fixed, JSON.stringify(result)).toBe(0);
    expect(result.partialAlpha, JSON.stringify(result)).toBeGreaterThanOrEqual(126);
    expect(result.partialAlpha, JSON.stringify(result)).toBeLessThanOrEqual(129);
  }
  expect(errors).toEqual([]);
});
