import { test, expect, type Page } from "@playwright/test";

test.use({ viewport: { width: 1280, height: 900 } });
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("viewer.options.animations", "");
    localStorage.setItem("viewer.options.smoothCamera", "");
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type, options) {
      return original.call(this, type, {
        ...options,
        ...(type.startsWith("webgl") ? { preserveDrawingBuffer: true } : {}),
      });
    } as typeof original;
  });
});
const pixel = (page: Page, x: number, y: number) =>
  page
    .getByTestId("skin-texture")
    .evaluate(
      (canvas, p) =>
        Array.from(
          (canvas as HTMLCanvasElement).getContext("2d")!.getImageData(p.x, p.y, 1, 1).data,
        ),
      { x, y },
    );
async function ready(page: Page) {
  await expect(page.locator(".loading-spinner:visible")).toHaveCount(0);
  await expect(page.locator("canvas").first()).toBeVisible();
}
async function edit(page: Page, second = false) {
  await page
    .getByRole("link", { name: second ? "Редактировать второй" : "Редактировать", exact: true })
    .click();
  await expect(page.getByTestId("skin-texture")).toBeVisible();
}
async function paint(page: Page, x = 12, y = 12) {
  await page.getByLabel("Цвет кисти", { exact: true }).fill("#ff00ff");
  await page.getByTestId("skin-texture").scrollIntoViewIfNeeded();
  const box = (await page.getByTestId("skin-texture").boundingBox())!;
  await page.mouse.click(
    box.x + ((x + 0.5) * box.width) / 64,
    box.y + ((y + 0.5) * box.height) / 64,
  );
}

test("viewer → editor → viewer keeps pixels, metadata, history and independent comparison documents", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await ready(page);
  await edit(page);
  const before = await pixel(page, 12, 12);
  await paint(page);
  await expect.poll(() => pixel(page, 12, 12)).toEqual([255, 0, 255, 255]);
  await page.getByLabel("Раса", { exact: true }).selectOption("UNICORN");
  await page.getByLabel("Размер модели").selectOption("FOAL");
  await page.getByRole("checkbox", { name: "Корона", exact: true }).check();
  await page.getByRole("link", { name: "← Просмотрщик" }).click();
  await ready(page);
  let reloads = 0;
  page.on("request", (r) => {
    if (new URL(r.url()).pathname === "/steve_pony.png") reloads++;
  });
  await edit(page);
  await expect(page.getByLabel("Раса", { exact: true })).toHaveValue("UNICORN");
  await expect(page.getByLabel("Размер модели")).toHaveValue("FOAL");
  await expect(page.getByRole("checkbox", { name: "Корона", exact: true })).toBeChecked();
  await expect.poll(() => pixel(page, 12, 12)).toEqual([255, 0, 255, 255]);
  await page.getByRole("button", { name: "Отменить штрих" }).click();
  await expect(page.getByRole("checkbox", { name: "Корона", exact: true })).not.toBeChecked();
  await page.getByRole("button", { name: "Повторить штрих" }).click();
  await page.getByRole("link", { name: "← Просмотрщик" }).click();
  await ready(page);
  await page.getByTitle("Comparison mode").click();
  await edit(page, true);
  await expect.poll(() => pixel(page, 12, 12)).toEqual(before);
  await expect(page.getByLabel("Раса", { exact: true })).not.toHaveValue("UNICORN");
  expect(reloads).toBe(0);
  expect(errors).toEqual([]);
});

test("local recovery and PNG round-trip retain edited content without reloading the original URL", async ({
  page,
}) => {
  await page.goto("/?skin=/steve_pony.png");
  await ready(page);
  await edit(page);
  await paint(page);
  await page.getByLabel("Раса", { exact: true }).selectOption("KIRIN");
  for (const name of ["Корона", "Маффин", "Stetson"])
    await page.getByRole("checkbox", { name, exact: true }).check();
  await expect(page.getByRole("checkbox", { name: "Шляпа", exact: true })).toBeDisabled();
  await expect.poll(() => savedPixel(page, 12, 12)).toEqual([255, 0, 255, 255]);
  await expect.poll(() => pixel(page, 1, 1)).toEqual([22, 50, 250, 255]);
  await page.waitForTimeout(400);
  let originals = 0;
  page.on("request", (r) => {
    if (new URL(r.url()).pathname === "/skin-proxy") originals++;
  });
  await page.reload();
  await expect(page.getByTestId("skin-texture")).toBeVisible();
  await expect(page.getByLabel("Раса", { exact: true })).toHaveValue("KIRIN");
  await expect.poll(() => pixel(page, 12, 12)).toEqual([255, 0, 255, 255]);
  await expect(page.getByRole("button", { name: "Отменить штрих" })).toBeDisabled();
  await expect.poll(() => pixel(page, 1, 1)).toEqual([22, 50, 250, 255]);
  const png = page.waitForEvent("download");
  await page.getByRole("button", { name: "Скачать PNG" }).click();
  const file = (await (await png).path())!;
  await page.getByLabel("Раса", { exact: true }).selectOption("HUMAN");
  await page.getByRole("button", { name: "Открыть", exact: true }).click();
  await page.getByLabel("Открыть PNG", { exact: true }).setInputFiles(file);
  await page.getByRole("button", { name: "Заменить", exact: true }).click();
  await expect(page.getByLabel("Раса", { exact: true })).toHaveValue("KIRIN");
  for (const name of ["Корона", "Маффин", "Stetson"])
    await expect(page.getByRole("checkbox", { name, exact: true })).toBeChecked();
  await expect.poll(() => pixel(page, 12, 12)).toEqual([255, 0, 255, 255]);
  expect(new URL(page.url()).searchParams.get("skin")).toBeNull();
  expect(originals).toBe(0);
});

test("all races, wing forms and accessories render; returning to Earth releases resources", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  // Count model resources without optional stage/UV overlays or postprocessing passes.
  // Their rendering and toggles are covered in studio.spec.
  await page.addInitScript(() => {
    localStorage.setItem("viewer.options.antialiasing", "");
    localStorage.setItem("viewer.options.groundGrid", "");
  });
  await page.goto("/editor");
  await expect(page.getByTestId("skin-texture")).toBeVisible();
  await page.getByRole("button", { name: "UV", exact: true }).click();
  await page.getByLabel("Раса", { exact: true }).selectOption("EARTH");
  const stats = page.getByTestId("render-stats");
  await expect.poll(() => stats.getAttribute("data-calls")).toBe("28");
  const geometries = await stats.getAttribute("data-geometries");
  const races = await page
    .getByLabel("Раса", { exact: true })
    .locator("option")
    .evaluateAll((opts) => opts.map((o) => (o as HTMLOptionElement).value));
  expect(races).toHaveLength(13);
  for (const race of races) {
    await page.getByLabel("Раса", { exact: true }).selectOption(race);
    await expect
      .poll(async () => Number(await stats.getAttribute("data-calls")))
      .toBeGreaterThan(0);
    await page.getByRole("checkbox", { name: "Раскрыть крылья", exact: true }).check();
    await page.getByRole("checkbox", { name: "Раскрыть крылья", exact: true }).uncheck();
  }
  await page.getByLabel("Раса", { exact: true }).selectOption("SEAPONY");
  await page.getByLabel("Форма", { exact: true }).selectOption("dry");
  await page.locator(".parts-popover summary").click();
  await page.getByRole("searchbox", { name: "Найти часть" }).fill("left_leg");
  await expect(
    page.getByRole("checkbox", { name: "Показать left_leg", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Форма", { exact: true }).selectOption("wet");
  await page.locator(".parts-popover summary").click();
  await expect(page.getByRole("checkbox", { name: "Показать left_leg", exact: true })).toHaveCount(
    0,
  );
  await page.getByLabel("Раса", { exact: true }).selectOption("CHANGELING");
  for (const name of [
    "Корона",
    "Маффин",
    "Шляпа",
    "Рога",
    "Сумка слева",
    "Сумка справа",
    "Две сумки",
    "Stetson",
  ]) {
    await page.getByRole("checkbox", { name, exact: true }).check();
    await expect
      .poll(async () => Number(await stats.getAttribute("data-textures")))
      .toBeGreaterThan(1);
    await page.getByRole("checkbox", { name, exact: true }).uncheck();
  }
  await page.getByLabel("Раса", { exact: true }).selectOption("EARTH");
  await expect.poll(() => stats.getAttribute("data-geometries")).toBe(geometries);
  await expect(stats).toHaveAttribute("data-textures", "1");
  expect(errors).toEqual([]);
});

test("legacy import upgrades to square PNG and a malformed import preserves the document", async ({
  page,
}) => {
  await page.goto("/editor");
  await expect(page.getByTestId("skin-texture")).toBeVisible();
  const data = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 32;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#ed6543";
    ctx.fillRect(0, 0, 64, 32);
    return c.toDataURL().split(",")[1];
  });
  await page.getByRole("button", { name: "Открыть", exact: true }).click();
  await page.getByLabel("Открыть PNG", { exact: true }).setInputFiles({
    name: "legacy.png",
    mimeType: "image/png",
    buffer: Buffer.from(data, "base64"),
  });
  await expect(page.getByText("Legacy-скин преобразован", { exact: false })).toBeVisible();
  await expect(page.getByTestId("document-status")).toContainText("64 × 64");
  const before = await pixel(page, 12, 12);
  await page.getByRole("button", { name: "Открыть", exact: true }).click();
  await page
    .getByLabel("Открыть PNG", { exact: true })
    .setInputFiles({ name: "bad.png", mimeType: "image/png", buffer: Buffer.from("broken") });
  await expect(page.getByRole("alert")).toBeVisible();
  expect(await pixel(page, 12, 12)).toEqual(before);
});

async function savedPixel(page: Page, x: number, y: number) {
  return page.evaluate(
    ({ x, y }) =>
      new Promise<number[] | null>((resolve, reject) => {
        const request = indexedDB.open("striped.editor", 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction("documents", "readonly");
          const value = tx.objectStore("documents").get("session");
          tx.oncomplete = () => {
            const doc = value.result?.first?.document;
            resolve(
              doc
                ? Array.from(doc.pixels.slice((y * doc.width + x) * 4, (y * doc.width + x) * 4 + 4))
                : null,
            );
            db.close();
          };
          tx.onabort = () => {
            reject(tx.error);
            db.close();
          };
        };
      }),
    { x, y },
  );
}

test("HD recovery stores binary pixels beyond localStorage limits and restores after reload", async ({
  page,
}) => {
  await page.goto("/editor");
  await expect(page.getByTestId("skin-texture")).toBeVisible();
  const png = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1024;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#914c38";
    ctx.fillRect(0, 0, 1024, 1024);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  await page.getByRole("button", { name: "Открыть", exact: true }).click();
  await page
    .getByLabel("Открыть PNG", { exact: true })
    .setInputFiles({ name: "hd.png", mimeType: "image/png", buffer: Buffer.from(png, "base64") });
  await expect(page.getByTestId("skin-texture")).toHaveAttribute("width", "1024");
  await page.getByLabel("Раса", { exact: true }).selectOption("KIRIN");
  await expect.poll(() => savedPixel(page, 12, 12)).toEqual([145, 76, 56, 255]);
  await expect(page.locator(".recovery-warning")).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId("skin-texture")).toHaveAttribute("width", "1024");
  await expect(page.getByLabel("Раса", { exact: true })).toHaveValue("KIRIN");
  await expect.poll(() => pixel(page, 12, 12)).toEqual([145, 76, 56, 255]);
});

test("legacy localStorage recovery migrates only after a successful IndexedDB save", async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem("legacy-seeded")) return;
    sessionStorage.setItem("legacy-seeded", "yes");
    const pixels = Array(64 * 64 * 4).fill(255);
    pixels.splice((12 * 64 + 12) * 4, 4, 71, 82, 93, 255);
    localStorage.setItem(
      "striped.editor.documents.v1",
      JSON.stringify({
        first: {
          url: null,
          document: { version: 1, width: 64, height: 64, sourceFormat: "modern", pixels },
        },
        second: null,
      }),
    );
  });
  await page.goto("/editor");
  await expect(page.getByTestId("skin-texture")).toBeVisible();
  await expect.poll(() => pixel(page, 12, 12)).toEqual([71, 82, 93, 255]);
  await expect.poll(() => savedPixel(page, 12, 12)).toEqual([71, 82, 93, 255]);
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("striped.editor.documents.v1")))
    .toBeNull();
  await page.reload();
  await expect(page.getByTestId("skin-texture")).toBeVisible();
  await expect.poll(() => pixel(page, 12, 12)).toEqual([71, 82, 93, 255]);
});

test("failed recovery is dismissible, leaves the footer clear and does not reopen on each stroke", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const transaction = IDBDatabase.prototype.transaction;
    let failures = 0;
    Object.defineProperty(window, "recoveryFailures", { get: () => failures });
    IDBDatabase.prototype.transaction = function (storeNames, mode, options) {
      if (mode === "readwrite") {
        failures++;
        throw new DOMException("Storage is full", "QuotaExceededError");
      }
      return transaction.call(this, storeNames, mode, options);
    };
  });
  await page.goto("/editor");
  await expect(page.getByTestId("skin-texture")).toBeVisible();
  const warning = page.locator(".recovery-warning");
  await expect(warning).toBeVisible();
  const bounds = (await warning.boundingBox())!,
    footer = (await page.locator(".studio-status").boundingBox())!;
  expect(bounds.y + bounds.height).toBeLessThan(footer.y);
  await page
    .getByRole("button", { name: "Закрыть предупреждение о сохранении", exact: true })
    .click();
  await expect(warning).toHaveCount(0);
  const count = await page.evaluate(() => Reflect.get(window, "recoveryFailures"));
  await paint(page);
  await expect
    .poll(() => page.evaluate(() => Reflect.get(window, "recoveryFailures")))
    .toBeGreaterThan(count);
  await expect(warning).toHaveCount(0);
  await expect.poll(() => pixel(page, 12, 12)).toEqual([255, 0, 255, 255]);
});

test("recovered edits stay dirty until exported and require confirmation before replacement", async ({
  page,
}) => {
  const savedDirty = () =>
    page.evaluate(
      () =>
        new Promise<boolean | undefined>((resolve, reject) => {
          const request = indexedDB.open("striped.editor", 1);
          request.onerror = () => reject(request.error);
          request.onsuccess = () => {
            const db = request.result;
            const tx = db.transaction("documents", "readonly");
            const result = tx.objectStore("documents").get("session");
            tx.oncomplete = () => {
              resolve(result.result?.first?.dirty);
              db.close();
            };
            tx.onabort = () => {
              reject(tx.error);
              db.close();
            };
          };
        }),
    );
  await page.goto("/editor");
  await expect(page.getByTestId("skin-texture")).toBeVisible();
  await paint(page);
  await expect.poll(savedDirty).toBe(true);
  await page.reload();
  await expect(page.getByTestId("skin-texture")).toBeVisible();
  await expect.poll(() => pixel(page, 12, 12)).toEqual([255, 0, 255, 255]);
  await expect(page.getByText("Есть изменения", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Открыть", exact: true }).click();
  await page.getByRole("button", { name: "Использовать пример скина" }).click();
  await expect(page.getByRole("heading", { name: "В текущем скине есть изменения" })).toBeVisible();
  await page.getByRole("button", { name: "Отмена", exact: true }).click();
  await page.keyboard.press("Escape");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Скачать PNG" }).click();
  await download;
  await expect.poll(savedDirty).toBe(false);
  await page.reload();
  await expect(page.getByTestId("skin-texture")).toBeVisible();
  await expect(page.getByText("Есть изменения", { exact: true })).toHaveCount(0);
  await expect.poll(() => pixel(page, 12, 12)).toEqual([255, 0, 255, 255]);
});
