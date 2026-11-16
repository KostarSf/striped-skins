import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

// Synthetic skins with identical RGBA bytes, with and without Adobe RGB (1998).
// Only the profile comes from the reported PNG; no user texture is included.
for (const fixture of ["adobe-rgb-skin.png", "unprofiled-skin.png"]) {
  test(`all skin loaders preserve encoded colors: ${fixture}`, async ({ page }) => {
    await page.route("**/__skin-api/**", async (route) => {
      const path = new URL(route.request().url()).pathname.replace("/__skin-api/", "");
      await route.fulfill({
        contentType: "text/javascript",
        body: await readFile(resolve("packages/api/build/esm", path)),
      });
    });
    await page.route("**/__skin-test", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: "<!doctype html><title>Skin import</title>",
      }),
    );
    await page.goto("/__skin-test");
    const png = (await readFile(resolve("tests/fixtures", fixture))).toString("base64");
    const result = await page.evaluate(async (png) => {
      const apiPath = "/__skin-api/";
      const { PonySkin } = await import(`${apiPath}PonySkin.js`);
      const { loadSkinDocument, exportSkinPNG } = await import(`${apiPath}skin-image.js`);
      const { decodeSkinMetadata } = await import(`${apiPath}skin-metadata.js`);
      const { ImageTransformer } = await import(`${apiPath}utils/ImageTransformer.js`);
      const url = URL.createObjectURL(
        new Blob([Uint8Array.from(atob(png), (c) => c.charCodeAt(0))], { type: "image/png" }),
      );
      try {
        const image = new Image();
        image.src = url;
        await image.decode();
        const transformer = new ImageTransformer();
        await transformer.setImage(image);
        const fromUrl = await PonySkin.fromUrl(url);
        const fromImage = await PonySkin.fromImage(image);
        const doc = await loadSkinDocument(url);
        const exported = await exportSkinPNG(doc);
        const bytes = new Uint8Array(await exported.arrayBuffer());
        const view = new DataView(bytes.buffer);
        const chunks = [];
        for (let offset = 8; offset < bytes.length;) {
          chunks.push(String.fromCharCode(...bytes.subarray(offset + 4, offset + 8)));
          offset += view.getUint32(offset) + 12;
        }
        const exportedUrl = URL.createObjectURL(exported);
        let reloaded;
        try {
          reloaded = await loadSkinDocument(exportedUrl);
        } finally {
          URL.revokeObjectURL(exportedUrl);
        }
        return {
          metadata: [fromUrl.metadata, fromImage.metadata, decodeSkinMetadata(doc)],
          texture: [
            fromUrl.document.readPixel(8, 8),
            fromImage.document.readPixel(8, 8),
            doc.readPixel(8, 8),
          ],
          marker: Array.from(transformer.getPixelRGBA(0, 0)),
          sourceUrl: fromUrl.sourceUrl,
          chunks,
          reloadedMetadata: decodeSkinMetadata(reloaded),
          reloadedTexture: reloaded.readPixel(8, 8),
          url,
        };
      } finally {
        URL.revokeObjectURL(url);
      }
    }, png);
    for (const metadata of result.metadata) {
      expect(metadata).toEqual({
        race: "EARTH",
        size: "LANKY",
        snout: "stallion",
        tailLength: 3,
        tailShape: "BUMPY",
        wearables: [22, 50, 100],
        glow: "e49840",
        slim: false,
      });
    }
    expect(result.texture).toEqual(Array(3).fill([90, 140, 180, 255]));
    expect(result.marker).toEqual([249, 177, 49, 255]);
    expect(result.sourceUrl).toBe(result.url);
    expect(result.chunks[0]).toBe("IHDR");
    expect(result.chunks.at(-1)).toBe("IEND");
    expect(result.chunks).toContain("IDAT");
    expect(
      result.chunks.every((type) => ["IHDR", "PLTE", "tRNS", "IDAT", "IEND"].includes(type)),
    ).toBe(true);
    expect(result.reloadedMetadata).toEqual(result.metadata[0]);
    expect(result.reloadedTexture).toEqual([90, 140, 180, 255]);
  });
}

test("editor imports a profiled skin, edits it and downloads a PNG without profiles", async ({
  page,
}) => {
  await page.goto("/editor");
  await expect(page.getByTestId("skin-texture")).toBeVisible();
  await page.getByRole("button", { name: "Открыть", exact: true }).click();
  await page
    .getByLabel("Открыть PNG", { exact: true })
    .setInputFiles("tests/fixtures/adobe-rgb-skin.png");
  await expect(page.getByTestId("skin-texture")).toHaveAttribute("width", "256");
  await page.getByRole("tab", { name: "Параметры скина", exact: true }).click();
  await expect(page.getByLabel("Раса", { exact: true })).toHaveValue("EARTH");
  await expect(page.getByLabel("Размер модели")).toHaveValue("LANKY");
  await page.getByLabel("Раса", { exact: true }).selectOption("KIRIN");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Скачать PNG", exact: true }).click(),
  ]);
  const path = (await download.path())!;
  const bytes = await readFile(path);
  const chunks = [];
  for (let offset = 8; offset < bytes.length;) {
    chunks.push(bytes.toString("ascii", offset + 4, offset + 8));
    offset += bytes.readUInt32BE(offset) + 12;
  }
  expect(chunks.every((type) => ["IHDR", "PLTE", "tRNS", "IDAT", "IEND"].includes(type))).toBe(
    true,
  );
  await page.getByRole("button", { name: "Открыть", exact: true }).click();
  await page.getByLabel("Открыть PNG", { exact: true }).setInputFiles(path);
  await page.getByRole("button", { name: "Заменить", exact: true }).click();
  await expect(page.getByLabel("Раса", { exact: true })).toHaveValue("KIRIN");
  await expect(page.getByLabel("Размер модели")).toHaveValue("LANKY");
});
