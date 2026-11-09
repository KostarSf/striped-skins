import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { decodeSkinProject } from "@striped-skins/api";
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
const pixel = (page: Page, x: number, y: number) =>
  page
    .getByTestId("skin-texture")
    .evaluate(
      (canvas, { x, y }) =>
        Array.from((canvas as HTMLCanvasElement).getContext("2d")!.getImageData(x, y, 1, 1).data),
      { x, y },
    );
async function point(page: Page, x: number, y: number) {
  const box = (await page.getByTestId("skin-texture").boundingBox())!;
  return [box.x + ((x + 0.5) * box.width) / 64, box.y + ((y + 0.5) * box.height) / 64] as const;
}
async function drag(page: Page, x: number, y: number, tx: number, ty: number) {
  await page.mouse.move(...(await point(page, x, y)));
  await page.mouse.down();
  await page.mouse.move(...(await point(page, tx, ty)), { steps: 4 });
}
const outline = (page: Page) => page.getByTestId("selection-outline").locator("path").first();
async function newPaint(page: Page) {
  await page.getByRole("button", { name: "Новый слой", exact: true }).click();
  await setColor(page, "Цвет кисти", "#ff00ff");
  await page.mouse.click(...(await point(page, 12, 12)));
  await expect.poll(() => pixel(page, 12, 12)).toEqual([255, 0, 255, 255]);
}

test("V moves the active layer live, arrows nudge by 1 pixel, undo/redo and recovery keep it", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const under = await pixel(page, 12, 12);
  await newPaint(page);
  const count = await page.locator(".history-list > li").count();
  await page.keyboard.press("v");
  await expect(
    page.getByRole("button", { name: "Перемещение пикселей · V", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await drag(page, 12, 12, 15, 14);
  await expect.poll(() => pixel(page, 15, 14)).toEqual([255, 0, 255, 255]);
  await page.mouse.up();
  await expect(page.locator(".history-list > li")).toHaveCount(count + 1);
  await expect.poll(() => pixel(page, 12, 12)).toEqual(under);
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowDown");
  await expect.poll(() => pixel(page, 16, 15)).toEqual([255, 0, 255, 255]);
  await page.keyboard.press("Control+z");
  await expect.poll(() => pixel(page, 16, 14)).toEqual([255, 0, 255, 255]);
  await page.keyboard.press("Control+Shift+z");
  await expect.poll(() => pixel(page, 16, 15)).toEqual([255, 0, 255, 255]);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Сохранить проект", exact: true }).click();
  const saved = decodeSkinProject(await readFile((await (await download).path())!));
  expect(saved.readPixel(16, 15)).toEqual([255, 0, 255, 255]);
  expect(saved.getWorkspace("tool", "brush")).toBe("move");
  await page.reload();
  await expect.poll(() => pixel(page, 16, 15)).toEqual([255, 0, 255, 255]);
  await page.screenshot({ path: testInfo.outputPath("move-desktop.png") });
  expect(errors).toEqual([]);
});

test("selected pixels and contour move together; Escape and pointer cancellation restore both", async ({
  page,
}) => {
  await newPaint(page);
  await page.keyboard.press("m");
  await drag(page, 12, 12, 12, 12);
  await page.mouse.up();
  const initial = await outline(page).getAttribute("d");
  await page.getByRole("button", { name: "Перемещение пикселей · V", exact: true }).click();
  // Nudge immediately after toolbar click, while its button still has keyboard focus.
  await page.keyboard.press("ArrowRight");
  await expect(outline(page)).toHaveAttribute("d", /M13 12H14/);
  await expect.poll(() => pixel(page, 13, 12)).toEqual([255, 0, 255, 255]);
  await page.keyboard.press("Control+z");
  await expect(outline(page)).toHaveAttribute("d", initial!);
  await drag(page, 12, 12, 16, 16);
  await expect(outline(page)).toHaveAttribute("d", /M16 16H17/);
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await expect(outline(page)).toHaveAttribute("d", initial!);
  await expect.poll(() => pixel(page, 12, 12)).toEqual([255, 0, 255, 255]);
  await drag(page, 12, 12, 16, 16);
  await page
    .locator(".texture-area")
    .dispatchEvent("pointercancel", { pointerId: 1, pointerType: "mouse" });
  await page.mouse.up();
  await expect(outline(page)).toHaveAttribute("d", initial!);
  await drag(page, 12, 12, 14, 13);
  await page.mouse.up();
  await expect(outline(page)).toHaveAttribute("d", /M14 13H15/);
  await page.reload();
  await expect(outline(page)).toHaveAttribute("d", /M14 13H15/);
  await page.keyboard.press("Control+z");
  await expect(outline(page)).toHaveAttribute("d", initial!);
});

test("pan, form inputs and layer locks do not move pixels", async ({ page }) => {
  await newPaint(page);
  await page.keyboard.press("v");
  const before = await pixel(page, 12, 12);
  const name = page.getByLabel("Имя слоя", { exact: true });
  await name.focus();
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => pixel(page, 12, 12)).toEqual(before);
  await page.getByTestId("skin-texture").focus();
  await page.keyboard.down("Space");
  await drag(page, 12, 12, 14, 14);
  await page.mouse.up();
  await page.keyboard.up("Space");
  await expect.poll(() => pixel(page, 12, 12)).toEqual(before);
  await page
    .locator('[data-testid="layer-row"][data-active="true"]')
    .getByRole("button", { name: /^Блокировать прозрачность / })
    .click();
  await expect(
    page.getByRole("button", { name: "Сдвинуть вправо на 1 px", exact: true }),
  ).toBeDisabled();
  await page.getByTestId("skin-texture").focus();
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => pixel(page, 12, 12)).toEqual(before);
});

test("mobile move tool opens 2D and supports touch dragging and one-pixel buttons", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator(".mobile-tool-menu summary").click();
  await page
    .getByRole("toolbar", { name: "Инструменты", exact: true })
    .getByRole("button", { name: "Перемещение пикселей", exact: true })
    .click();
  await expect(page.getByTestId("skin-texture")).toBeVisible();
  const before = await pixel(page, 12, 12);
  const [x, y] = await point(page, 12, 12),
    [tx, ty] = await point(page, 13, 13);
  const session = await page.context().newCDPSession(page);
  await session.send("Emulation.setTouchEmulationEnabled", { enabled: true });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x, y, id: 1 }],
  });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: tx, y: ty, id: 1 }],
  });
  await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect.poll(() => pixel(page, 13, 13)).toEqual(before);
  // A second finger cancels the pending translation before pinch navigation takes over.
  const [sx, sy] = await point(page, 13, 13),
    [ex, ey] = await point(page, 16, 16);
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: sx, y: sy, id: 1 }],
  });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: ex, y: ey, id: 1 }],
  });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { x: ex, y: ey, id: 1 },
      { x: ex + 50, y: ey, id: 2 },
    ],
  });
  await expect.poll(() => pixel(page, 13, 13)).toEqual(before);
  await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await page.getByRole("button", { name: "Параметры инструмента", exact: true }).click();
  await page.getByRole("button", { name: "Сдвинуть вправо на 1 px", exact: true }).click();
  await expect.poll(() => pixel(page, 14, 13)).toEqual(before);
  await page.screenshot({ path: testInfo.outputPath("move-mobile.png") });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test("moving the skin updates the live 3D preview during the gesture", async ({
  page,
}, testInfo) => {
  await page.keyboard.press("v");
  const preview = page.locator(".model-viewport canvas");
  const before = await preview.screenshot();
  await drag(page, 10, 10, 13, 10);
  await expect.poll(async () => (await preview.screenshot()).equals(before)).toBe(false);
  await page.screenshot({ path: testInfo.outputPath("move-live-3d.png") });
  await page.keyboard.press("Escape");
  await page.mouse.up();
});
