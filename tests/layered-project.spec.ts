import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { decodeSkinProject } from "@striped-skins/api";

test.use({ viewport: { width: 1280, height: 800 } });
test.beforeEach(async ({ page }) => {
  page.on("dialog", (dialog) => void dialog.accept());
  await page.addInitScript(() => {
    localStorage.setItem("viewer.options.animations", "");
    localStorage.setItem("viewer.options.smoothCamera", "");
    localStorage.setItem("viewer.options.antialiasing", "off");
  });
});
async function ready(page: Page) {
  await page.goto("/editor");
  await expect(page.getByTestId("skin-texture")).toBeAttached();
}
const pixel = (page: Page) =>
  page
    .getByTestId("skin-texture")
    .evaluate((canvas) =>
      Array.from((canvas as HTMLCanvasElement).getContext("2d")!.getImageData(12, 12, 1, 1).data),
    );
async function paint(page: Page, color: string) {
  await page.getByLabel("Цвет кисти", { exact: true }).fill(color);
  const box = (await page.getByTestId("skin-texture").boundingBox())!;
  await page.mouse.click(box.x + (box.width * 12.5) / 64, box.y + (box.height * 12.5) / 64);
}
async function rename(page: Page, name: string) {
  await page.getByLabel("Имя слоя", { exact: true }).fill(name);
  await page.getByLabel("Имя слоя", { exact: true }).press("Enter");
}

test("layered project survives save, reload and reopen with settings, history and PNG export kept separate", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await ready(page);
  await page.getByRole("button", { name: "Новая группа", exact: true }).click();
  await rename(page, "Одежда");
  await page.getByRole("button", { name: "Новый слой", exact: true }).click();
  await rename(page, "Детали");
  await paint(page, "#ff00ff");
  await expect.poll(() => pixel(page)).toEqual([255, 0, 255, 255]);
  await page.getByLabel("Непрозрачность слоя", { exact: true }).fill("60");
  await page.getByLabel("Размер кисти", { exact: true }).fill("3");
  await page.getByRole("button", { name: "Добавить цвет в палитру", exact: true }).click();
  await page.getByLabel("Раса", { exact: true }).selectOption("KIRIN");
  await page.getByLabel("Имя слоя", { exact: true }).scrollIntoViewIfNeeded();
  const composite = await pixel(page);
  const pngDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Скачать PNG", exact: true }).click();
  expect((await pngDownload).suggestedFilename()).toMatch(/\.png$/);
  await expect(page.locator(".document-dot")).toHaveAttribute("data-dirty", "true");
  await expect(page.getByRole("button", { name: "Сохранить проект", exact: true })).toBeEnabled();
  const projectDownload = page.waitForEvent("download");
  await page.keyboard.press("Control+s");
  const download = await projectDownload;
  expect(download.suggestedFilename()).toMatch(/\.striped$/);
  const bytes = await readFile((await download.path())!);
  const decoded = decodeSkinProject(bytes);
  expect(decoded.layers).toHaveLength(3);
  expect(decoded.activeLayer.name).toBe("Детали");
  expect(decoded.getWorkspace("brushSize", 0)).toBe(3);
  expect(decoded.getWorkspace("customColors", [])).toContain("#ff00ff");
  expect(decoded.canUndo).toBe(true);
  await expect(page.locator(".document-dot")).toHaveAttribute("data-dirty", "false");
  await page.reload();
  await expect(page.getByTestId("layer-row")).toHaveCount(3);
  await expect(page.getByLabel("Размер кисти", { exact: true })).toHaveValue("3");
  await expect(page.getByLabel("Раса", { exact: true })).toHaveValue("KIRIN");
  await expect.poll(() => pixel(page)).toEqual(composite);
  await page.getByRole("button", { name: "Отменить штрих", exact: true }).click();
  await expect(page.getByLabel("Раса", { exact: true })).not.toHaveValue("KIRIN");
  await page.getByRole("button", { name: "Открыть", exact: true }).click();
  await page
    .getByLabel("Открыть PNG", { exact: true })
    .setInputFiles({ name: "skin.striped", mimeType: "application/zip", buffer: bytes });
  await page.getByRole("button", { name: "Заменить", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Выбрать слой Детали", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("Раса", { exact: true })).toHaveValue("KIRIN");
  await expect.poll(() => pixel(page)).toEqual(composite);
  await expect(page.locator(".document-dot")).toHaveAttribute("data-dirty", "false");
  await page.screenshot({ path: "/tmp/striped-editor-desktop.png" });
  expect(errors).toEqual([]);
});

test("group visibility and locks affect painting, deletion can be undone after reload", async ({
  page,
}) => {
  await ready(page);
  const before = await pixel(page);
  await page.getByRole("button", { name: "Новая группа", exact: true }).click();
  await page.getByRole("button", { name: "Новый слой", exact: true }).click();
  await paint(page, "#ff00ff");
  await page.getByRole("button", { name: "Скрыть слой Группа", exact: true }).click();
  await expect.poll(() => pixel(page)).toEqual(before);
  await expect(page.getByText("Слой или его группа скрыты", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Показать слой Группа", exact: true }).click();
  await page.getByRole("button", { name: "Заблокировать Группа", exact: true }).click();
  await paint(page, "#00ff00");
  await expect.poll(() => pixel(page)).toEqual([255, 0, 255, 255]);
  await page.getByRole("button", { name: "Выбрать группу Группа", exact: true }).click();
  await page.getByRole("button", { name: "Удалить слой или группу", exact: true }).click();
  await expect(page.getByTestId("layer-row")).toHaveCount(1);
  await expect(page.getByTestId("autosave-status")).toHaveText("Локальная копия сохранена");
  await page.reload();
  await expect(page.getByTestId("layer-row")).toHaveCount(1);
  await page.getByRole("button", { name: "Отменить штрих", exact: true }).click();
  await expect(page.getByTestId("layer-row")).toHaveCount(3);
  await expect.poll(() => pixel(page)).toEqual([255, 0, 255, 255]);
});

test("malformed project leaves the current document intact", async ({ page }) => {
  await ready(page);
  const before = await pixel(page);
  await page.getByRole("button", { name: "Открыть", exact: true }).click();
  await page.getByLabel("Открыть PNG", { exact: true }).setInputFiles({
    name: "bad.striped",
    mimeType: "application/zip",
    buffer: Buffer.from("broken"),
  });
  await expect(page.getByRole("alert")).toBeVisible();
  expect(await pixel(page)).toEqual(before);
});

test("mobile can create and save drawing layers without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page);
  await page.getByRole("button", { name: "Параметры модели", exact: true }).click();
  await page.getByRole("button", { name: "Новая группа", exact: true }).click();
  await rename(page, "Грива");
  await page.getByRole("button", { name: "Новый слой", exact: true }).click();
  await rename(page, "Пряди");
  await expect(page.getByTestId("layer-row")).toHaveCount(3);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Сохранить проект", exact: true }).click();
  expect((await download).suggestedFilename()).toMatch(/\.striped$/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await page.screenshot({ path: "/tmp/striped-editor-mobile.png" });
});

test("camera, 2D view and display settings restore from a project", async ({ page }) => {
  await ready(page);
  await page.getByLabel("Ракурс модели", { exact: true }).selectOption("front");
  await page.getByRole("button", { name: "Приблизить модель", exact: true }).click();
  await page.getByRole("button", { name: "2D +", exact: true }).click();
  await page.locator(".view-options summary").click();
  await page.getByRole("checkbox", { name: "Сетка под моделью", exact: true }).uncheck();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("autosave-status")).toHaveText("Локальная копия сохранена");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Сохранить проект", exact: true }).click();
  const doc = decodeSkinProject(await readFile((await (await download).path())!));
  expect(doc.getWorkspace("cameraView", "")).toBe("front");
  const camera = doc.getWorkspace<{ position: number[]; target: number[]; zoom: number } | null>(
    "cameraState",
    null,
  );
  expect(camera).not.toBeNull();
  expect(camera!.position[0] - camera!.target[0]).toBeCloseTo(0);
  expect(doc.getWorkspace("textureView", { zoom: 0, pan: { x: 0, y: 0 } }).zoom).toBeCloseTo(1.25);
  await page.reload();
  await expect(page.getByLabel("Ракурс модели", { exact: true })).toHaveValue("front");
  await page.locator(".view-options summary").click();
  await expect(
    page.getByRole("checkbox", { name: "Сетка под моделью", exact: true }),
  ).not.toBeChecked();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Приблизить модель", exact: true }).click();
  await expect(page.getByTestId("autosave-status")).toHaveText("Локальная копия сохранена");
  const again = page.waitForEvent("download");
  await page.getByRole("button", { name: "Сохранить проект", exact: true }).click();
  const after = decodeSkinProject(await readFile((await (await again).path())!));
  const nextCamera = after.getWorkspace<{
    position: number[];
    target: number[];
    zoom: number;
  } | null>("cameraState", null);
  expect(nextCamera!.position[0] - nextCamera!.target[0]).toBeCloseTo(0);
  expect(nextCamera!.position[2]).toBeLessThan(camera!.position[2]);
});
