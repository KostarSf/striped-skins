import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { decodeSkinProject, encodeSkinProject, SkinDocument } from "@striped-skins/api";
import { setColor } from "./color-picker-helpers";

test.use({ viewport: { width: 1440, height: 1000 } });
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("viewer.options.animations", "");
    localStorage.setItem("viewer.options.smoothCamera", "");
  });
  await page.goto("/editor");
  await expect(page.getByTestId("skin-texture")).toBeVisible();
  await page.getByTestId("skin-texture").screenshot();
});
const button = (page: Page, name: string) => page.getByRole("button", { name, exact: true });
const rows = (page: Page) => page.getByTestId("layer-row");
const outline = (page: Page) => page.getByTestId("selection-outline").locator("path").first();
async function point(page: Page, x: number, y: number) {
  const box = (await page.getByTestId("skin-texture").boundingBox())!;
  return [box.x + ((x + 0.5) * box.width) / 64, box.y + ((y + 0.5) * box.height) / 64] as const;
}
async function select(page: Page, x = 12, y = 12, right = x, bottom = y) {
  await page.keyboard.press("m");
  await page.mouse.move(...(await point(page, x, y)));
  await page.mouse.down();
  await page.mouse.move(...(await point(page, right, bottom)), { steps: 3 });
  await page.mouse.up();
}
async function setup(page: Page) {
  await button(page, "Новый слой").click();
  await setColor(page, "Цвет кисти", "#ff00ff");
  await page.mouse.click(...(await point(page, 12, 12)));
  await page.mouse.click(...(await point(page, 14, 12)));
  await select(page);
}
async function saved(page: Page) {
  const download = page.waitForEvent("download");
  await button(page, "Сохранить проект").click();
  return decodeSkinProject(await readFile((await (await download).path())!));
}
const rgba = (doc: SkinDocument, layer: number, x: number, y: number) =>
  Array.from(doc.layers[layer].pixels!.slice((y * doc.width + x) * 4, (y * doc.width + x) * 4 + 4));
const pixel = (page: Page, x: number, y: number) =>
  page
    .getByTestId("skin-texture")
    .evaluate(
      (canvas, { x, y }) =>
        Array.from((canvas as HTMLCanvasElement).getContext("2d")!.getImageData(x, y, 1, 1).data),
      { x, y },
    );

test("keyboard copy/paste creates a new movable layer every time and keeps source, mask and recovery history", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await expect(button(page, "Копировать выделение")).toBeDisabled();
  await expect(button(page, "Вставить в новый слой")).toBeDisabled();
  await setup(page);
  const historyCount = await page.locator(".history-list > li").count();
  const mask = await outline(page).getAttribute("d");
  await page.keyboard.press("Control+c");
  await expect(page.locator(".history-list > li")).toHaveCount(historyCount);
  await page.keyboard.press("Control+v");
  await expect(rows(page)).toHaveCount(3);
  await expect(page.getByLabel("Имя слоя", { exact: true })).toHaveValue("Вставленный участок");
  await expect(outline(page)).toHaveAttribute("d", mask!);
  await page.keyboard.press("v");
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => pixel(page, 13, 12)).toEqual([255, 0, 255, 255]);
  await expect.poll(() => pixel(page, 12, 12)).toEqual([255, 0, 255, 255]);
  // Paste uses the copied mask, not the now-shifted current selection.
  await page.keyboard.press("Meta+v");
  await expect(rows(page)).toHaveCount(4);
  await expect(outline(page)).toHaveAttribute("d", mask!);
  await page.getByTestId("skin-texture").dispatchEvent("keydown", {
    key: "v",
    code: "KeyV",
    ctrlKey: true,
    repeat: true,
    bubbles: true,
  });
  await expect(rows(page)).toHaveCount(4);
  const project = await saved(page);
  expect(rgba(project, 1, 12, 12)).toEqual([255, 0, 255, 255]);
  expect(rgba(project, 1, 14, 12)).toEqual([255, 0, 255, 255]);
  expect(rgba(project, 2, 13, 12)).toEqual([255, 0, 255, 255]);
  expect(rgba(project, 3, 12, 12)).toEqual([255, 0, 255, 255]);
  expect(rgba(project, 3, 14, 12)).toEqual([0, 0, 0, 0]);
  expect(project.activeLayer.parentId).toBeNull();
  // Recovery is debounced: verify the committed IndexedDB state before reloading.
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          new Promise<number | undefined>((resolve, reject) => {
            const request = indexedDB.open("striped.editor", 1);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
              const db = request.result;
              const tx = db.transaction("documents", "readonly");
              const saved = tx.objectStore("documents").get("session");
              tx.oncomplete = () => {
                resolve(saved.result?.first?.document.stateId);
                db.close();
              };
              tx.onabort = () => {
                db.close();
                reject(tx.error);
              };
            };
          }),
      ),
    )
    .toBe(project.snapshot().stateId);
  await page.reload();
  await expect(rows(page)).toHaveCount(4);
  await expect(button(page, "Вставить в новый слой")).toBeDisabled();
  await page.keyboard.press("Control+z");
  await expect(rows(page)).toHaveCount(3);
  await expect(outline(page)).toHaveAttribute("d", /M13 12H14/);
  await page.keyboard.press("Control+Shift+z");
  await expect(rows(page)).toHaveCount(4);
  await expect(outline(page)).toHaveAttribute("d", mask!);
  await page.screenshot({ path: testInfo.outputPath("clipboard-desktop.png") });
  expect(errors).toEqual([]);
});

test("cut and paste each undo independently and keyboard shortcuts leave text inputs and editable fields alone", async ({
  page,
}) => {
  await setup(page);
  const input = page.getByLabel("Имя слоя", { exact: true });
  await input.focus();
  await page.keyboard.press("Control+x");
  await expect.poll(() => pixel(page, 12, 12)).toEqual([255, 0, 255, 255]);
  await expect(button(page, "Вставить в новый слой")).toBeDisabled();
  await page.getByTestId("skin-texture").focus();
  // Physical keys support non-Latin keyboard layouts too.
  await page
    .getByTestId("skin-texture")
    .dispatchEvent("keydown", { key: "ч", code: "KeyX", ctrlKey: true, bubbles: true });
  await expect.poll(() => pixel(page, 12, 12)).not.toEqual([255, 0, 255, 255]);
  await expect.poll(() => pixel(page, 14, 12)).toEqual([255, 0, 255, 255]);
  await button(page, "Вставить в новый слой").click();
  await expect(rows(page)).toHaveCount(3);
  await expect.poll(() => pixel(page, 12, 12)).toEqual([255, 0, 255, 255]);
  const project = await saved(page);
  expect(rgba(project, 1, 12, 12)).toEqual([0, 0, 0, 0]);
  expect(rgba(project, 1, 14, 12)).toEqual([255, 0, 255, 255]);
  await page.keyboard.press("Control+z");
  await expect(rows(page)).toHaveCount(2);
  await page.keyboard.press("Control+z");
  await expect.poll(() => pixel(page, 12, 12)).toEqual([255, 0, 255, 255]);
  // Native editing in contenteditable regions must never invoke raster operations.
  await page.evaluate(() => {
    const editable = document.createElement("div");
    editable.contentEditable = "true";
    editable.id = "clipboard-editable";
    editable.textContent = "text";
    document.body.append(editable);
    editable.focus();
  });
  await page.keyboard.press("Control+v");
  await expect(rows(page)).toHaveCount(2);
  await page.locator("#clipboard-editable").evaluate((el) => el.remove());
});

test("buttons respect locks and empty selections; copy remains readable and paste is visible above a locked group", async ({
  page,
}) => {
  await setup(page);
  const active = page.locator('[data-testid="layer-row"][data-active="true"]');
  await active.getByRole("button", { name: /^Заблокировать / }).click();
  await expect(button(page, "Вырезать выделение")).toBeDisabled();
  await expect(button(page, "Копировать выделение")).toBeEnabled();
  await button(page, "Копировать выделение").click();
  await button(page, "Новая группа").click();
  await active.getByRole("button", { name: /^Заблокировать / }).click();
  await button(page, "Вставить в новый слой").click();
  await expect(rows(page)).toHaveCount(4);
  expect((await saved(page)).activeLayer.parentId).toBeNull();
  await page.keyboard.press("Control+d");
  await expect(button(page, "Копировать выделение")).toBeDisabled();
  await expect(button(page, "Вырезать выделение")).toBeDisabled();
  await expect(button(page, "Вставить в новый слой")).toBeEnabled();
});

test("phone buttons copy, cut, paste and undo without keyboard and fit the screen", async ({
  page,
}, testInfo) => {
  await setup(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await button(page, "2D вид").click();
  await button(page, "Параметры инструмента").click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Копировать выделение", exact: true }).click();
  await dialog.getByRole("button", { name: "Вырезать выделение", exact: true }).click();
  await expect.poll(() => pixel(page, 12, 12)).not.toEqual([255, 0, 255, 255]);
  await dialog.getByRole("button", { name: "Вставить в новый слой", exact: true }).click();
  await expect.poll(() => pixel(page, 12, 12)).toEqual([255, 0, 255, 255]);
  await dialog.getByRole("button", { name: "Вставить в новый слой", exact: true }).click();
  // Keyboard shortcuts inside a modal are native and do not add another layer.
  const count = await rows(page).count();
  await page.keyboard.press("Control+v");
  await expect(rows(page)).toHaveCount(count);
  await dialog.getByRole("button", { name: "Отменить штрих", exact: true }).click();
  await dialog.getByRole("button", { name: "Отменить штрих", exact: true }).click();
  await expect.poll(() => pixel(page, 12, 12)).not.toEqual([255, 0, 255, 255]);
  await dialog.getByRole("button", { name: "Отменить штрих", exact: true }).click();
  await expect.poll(() => pixel(page, 12, 12)).toEqual([255, 0, 255, 255]);
  await page.screenshot({ path: testInfo.outputPath("clipboard-phone.png") });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
});

test("clipboard remains available after importing a different-resolution project", async ({
  page,
}) => {
  await setup(page);
  await button(page, "Копировать выделение").click();
  const next = new SkinDocument(128, 128, new Uint8ClampedArray(128 * 128 * 4));
  await button(page, "Открыть").click();
  await page.getByLabel("Открыть PNG", { exact: true }).setInputFiles({
    name: "other.striped",
    mimeType: "application/zip",
    buffer: Buffer.from(encodeSkinProject(next)),
  });
  await page.keyboard.press("Control+v");
  await expect(rows(page)).toHaveCount(2);
  await button(page, "Заменить").click();
  await expect(rows(page)).toHaveCount(1);
  await expect(button(page, "Вставить в новый слой")).toBeEnabled();
  await button(page, "Вставить в новый слой").click();
  await expect(rows(page)).toHaveCount(2);
  const project = await saved(page);
  expect(project.width).toBe(128);
  expect(rgba(project, 1, 12, 12)).toEqual([255, 0, 255, 255]);
  expect(rgba(project, 1, 14, 12)).toEqual([0, 0, 0, 0]);
  expect(project.selection![12 * 128 + 12]).toBe(1);
});
