import { test, expect, type Page } from "@playwright/test";

test.use({ viewport: { width: 1280, height: 900 } });
test.beforeEach(async ({ page }) => {
  page.on("dialog", (dialog) => void dialog.accept());
  await page.addInitScript(() => {
    localStorage.setItem("viewer.options.animations", "");
    localStorage.setItem("viewer.options.smoothCamera", "");
  });
});

async function parameters(page: Page) {
  await page.getByRole("tab", { name: "Параметры скина", exact: true }).click();
}

async function savedWidth(page: Page) {
  return page.evaluate(
    () =>
      new Promise<unknown>((resolve) => {
        const request = indexedDB.open("striped.editor", 1);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction("documents", "readonly");
          const get = tx.objectStore("documents").get("session");
          tx.oncomplete = () => {
            const skin = get.result?.first?.document;
            resolve(skin ? [skin.width, skin.metadata[0], skin.metadata[20]] : null);
            db.close();
          };
        };
      }),
  );
}

test("resize to 4K switches to parameters, preserves metadata, exports PNG, recovers and re-enables editing at 1024", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/editor");
  await expect(page.getByTestId("skin-texture")).toBeVisible();
  await parameters(page);
  await page.getByLabel("Раса", { exact: true }).selectOption("KIRIN");
  await page.getByLabel("Размер модели").selectOption("FOAL");
  await page.getByLabel("Разрешение скина", { exact: true }).selectOption("4096");
  await expect(page.getByTestId("document-status")).toContainText("4096 × 4096");
  await expect(page.getByTestId("skin-texture")).toHaveCount(0);
  await expect(page.locator(".tool-rail, .brush-toolbar, .layers-panel")).toHaveCount(0);
  await expect(page.getByText("Скин больше 1024 пикселей.", { exact: false })).toBeVisible();
  await expect(page.getByLabel("Раса", { exact: true })).toHaveValue("KIRIN");
  await expect(page.getByLabel("Размер модели")).toHaveValue("FOAL");
  await page.getByLabel("Раса", { exact: true }).selectOption("ALICORN");
  await page.getByRole("checkbox", { name: "Корона", exact: true }).check();
  await expect.poll(() => savedWidth(page)).toEqual([4096, 254, 22]);
  await expect(page.locator(".recovery-warning")).toHaveCount(0);
  await page.reload();
  await expect(page.getByLabel("Раса", { exact: true })).toHaveValue("ALICORN");
  await expect(page.getByRole("checkbox", { name: "Корона", exact: true })).toBeChecked();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Скачать PNG", exact: true }).click(),
  ]);
  const path = (await download.path())!;
  // Undo the two metadata changes and the resize, then redo the resize through the UI.
  await page.locator(".parameters-notice").click();
  for (let i = 0; i < 3; i++) await page.keyboard.press("Control+z");
  await expect(page.getByTestId("skin-texture")).toHaveAttribute("width", "64");
  await page.keyboard.press("Control+Shift+z");
  await expect(page.getByTestId("skin-texture")).toHaveCount(0);
  // Export/import must retain both full resolution and physical metadata pixels.
  await page.getByRole("button", { name: "Открыть", exact: true }).click();
  await page.getByLabel("Открыть PNG", { exact: true }).setInputFiles(path);
  await page.getByRole("button", { name: "Заменить", exact: true }).click();
  await expect(page.getByTestId("document-status")).toContainText("4096 × 4096");
  await expect(page.getByLabel("Раса", { exact: true })).toHaveValue("ALICORN");
  await page.getByLabel("Разрешение скина", { exact: true }).selectOption("1024");
  await expect(page.getByTestId("skin-texture")).toHaveAttribute("width", "1024");
  await expect(page.locator(".tool-rail")).toBeVisible();
  await parameters(page);
  await expect(page.getByLabel("Раса", { exact: true })).toHaveValue("ALICORN");
  expect(errors).toEqual([]);
});

test("phone imports an HD legacy skin into parameters and can reduce it to an editable resolution", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/editor");
  await expect(page.getByTestId("skin-texture")).toBeAttached();
  const png = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#914c38";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  await page.getByRole("button", { name: "Открыть", exact: true }).click();
  await page.getByLabel("Открыть PNG", { exact: true }).setInputFiles({
    name: "legacy-hd.png",
    mimeType: "image/png",
    buffer: Buffer.from(png, "base64"),
  });
  await expect(page.getByTestId("document-status")).toContainText("2048 × 2048");
  await expect(page.getByTestId("skin-texture")).toHaveCount(0);
  const race = page.getByLabel("Раса", { exact: true });
  await race.scrollIntoViewIfNeeded();
  await race.selectOption("UNICORN");
  await expect(race).toHaveValue("UNICORN");
  await page.getByRole("button", { name: "Отменить действие", exact: true }).click();
  await expect(race).toHaveValue("HUMAN");
  await page.getByRole("button", { name: "Повторить действие", exact: true }).click();
  await expect(race).toHaveValue("UNICORN");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const size = page.getByLabel("Разрешение скина", { exact: true });
  await size.scrollIntoViewIfNeeded();
  await size.selectOption("1024");
  await expect(page.getByTestId("skin-texture")).toHaveAttribute("width", "1024");
});
