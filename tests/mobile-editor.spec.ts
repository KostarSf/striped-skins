import { expect, test, type Page } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("viewer.options.animations", "");
    localStorage.setItem("viewer.options.smoothCamera", "");
  });
  await page.goto("/editor");
  await expect(page.locator(".mobile-editor-footer")).toBeVisible();
  await expect(page.locator(".studio-loading-badge")).toHaveCount(0);
});

async function chooseTool(page: Page, name: string) {
  await page.locator(".mobile-tool-menu summary").tap();
  await page
    .getByRole("toolbar", { name: "Инструменты", exact: true })
    .getByRole("button", { name, exact: true })
    .tap();
  await expect(page.locator(".mobile-tool-menu")).not.toHaveAttribute("open", "");
  await expect(page.locator(".mobile-tool-menu summary")).toHaveAccessibleName(
    `Инструменты: ${name}`,
  );
}
const pixel = (page: Page) =>
  page
    .getByTestId("skin-texture")
    .evaluate((canvas) =>
      Array.from((canvas as HTMLCanvasElement).getContext("2d")!.getImageData(12, 12, 1, 1).data),
    );
async function touchPixel(page: Page) {
  const box = (await page.getByTestId("skin-texture").boundingBox())!;
  await page.touchscreen.tap(box.x + (box.width * 12.5) / 64, box.y + (box.height * 12.5) / 64);
}

test("phone tabs fill the workspace, keep the palette and footer reachable, and retain model settings", async ({
  page,
}) => {
  const footer = page.locator(".mobile-editor-footer");
  await expect(page.locator(".tool-rail, .brush-toolbar, .brush-color")).toHaveCount(0);
  for (const width of [390, 320, 600]) {
    await page.setViewportSize({ width, height: 844 });
    for (const name of ["3D вид", "2D вид", "Параметры документа"]) {
      await footer.getByRole("button", { name, exact: true }).tap();
      await expect(footer.getByRole("button", { name, exact: true })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      const settings = name === "Параметры документа";
      await expect(page.locator(".palette-panel")).toBeVisible({ visible: !settings });
      await expect(page.locator(".inspector")).toBeVisible({ visible: settings });
      await expect(page.locator(".model-viewport")).toBeVisible({ visible: name === "3D вид" });
      await expect(page.locator(".texture-slot")).toBeVisible({ visible: name === "2D вид" });
      if (!settings) {
        const menu = (await page.locator(".mobile-tool-menu summary").boundingBox())!;
        const controls = (await page
          .locator(
            name === "3D вид" ? ".model-viewport .zoom-controls" : ".texture-slot .zoom-controls",
          )
          .boundingBox())!;
        expect(
          Math.abs(menu.y + menu.height / 2 - controls.y - controls.height / 2),
        ).toBeLessThanOrEqual(1);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        width,
      );
      const bounds = (await footer.boundingBox())!;
      expect(bounds.y + bounds.height).toBeCloseTo(844, 0);
      for (const control of await footer.locator("nav button, input, .icon-button").all()) {
        const box = (await control.boundingBox())!;
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(width);
      }
    }
  }
  await page.getByRole("tab", { name: "Параметры скина", exact: true }).tap();
  await page.getByLabel("Раса", { exact: true }).selectOption("KIRIN");
  await footer.getByRole("button", { name: "3D вид", exact: true }).tap();
  await footer.getByRole("button", { name: "Параметры документа", exact: true }).tap();
  await expect(page.getByLabel("Раса", { exact: true })).toHaveValue("KIRIN");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(footer).toHaveCount(0);
  await expect(page.locator(".tool-rail, .brush-toolbar")).toHaveCount(2);
  await expect(page.locator(".model-viewport")).toBeVisible();
  await expect(page.locator(".texture-slot")).toBeVisible();
});

test("touch tools update the floating icon, edit the same pixels across views, and undo through the settings popup", async ({
  page,
}) => {
  test.setTimeout(60_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.getByRole("button", { name: "2D вид", exact: true }).tap();
  await page.getByLabel("Цвет кисти", { exact: true }).fill("#ff00ff");
  await touchPixel(page);
  await expect.poll(() => pixel(page)).toEqual([255, 0, 255, 255]);
  await chooseTool(page, "Ластик");
  await expect(page.locator(".mobile-tool-menu summary img")).toHaveAttribute(
    "src",
    "/design/eraser.svg",
  );
  await touchPixel(page);
  await expect.poll(() => pixel(page)).toEqual([0, 0, 0, 0]);
  await page.getByRole("button", { name: "Параметры инструмента", exact: true }).tap();
  const popup = page.getByRole("dialog", { name: "Ластик", exact: true });
  await expect(popup).toBeVisible();
  await expect(popup.getByLabel("Непрозрачность кисти")).toHaveCount(0);
  await popup.getByRole("button", { name: "Отменить штрих", exact: true }).tap();
  await expect.poll(() => pixel(page)).toEqual([255, 0, 255, 255]);
  await popup.getByRole("button", { name: "Повторить штрих", exact: true }).tap();
  await expect.poll(() => pixel(page)).toEqual([0, 0, 0, 0]);
  await popup.getByRole("button", { name: "Отменить штрих", exact: true }).tap();
  await popup.getByRole("button", { name: "Закрыть параметры инструмента", exact: true }).tap();
  await chooseTool(page, "Пипетка");
  await touchPixel(page);
  await expect(page.locator(".mobile-tool-menu summary")).toHaveAccessibleName(
    "Инструменты: Кисть",
  );
  await expect(page.getByLabel("Цвет кисти", { exact: true })).toHaveValue("#ff00ff");
  await page.getByRole("button", { name: "Параметры инструмента", exact: true }).tap();
  await page.getByLabel("Размер кисти", { exact: true }).fill("3");
  await page.getByLabel("Непрозрачность кисти", { exact: true }).fill("50");
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Параметры инструмента", exact: true }),
  ).toBeFocused();
  await page.getByRole("button", { name: "3D вид", exact: true }).tap();
  await page.getByRole("button", { name: "Параметры документа", exact: true }).tap();
  await page.getByRole("button", { name: "2D вид", exact: true }).tap();
  await expect.poll(() => pixel(page)).toEqual([255, 0, 255, 255]);
  await page.getByRole("button", { name: "Параметры инструмента", exact: true }).tap();
  await expect(page.getByLabel("Размер кисти", { exact: true })).toHaveValue("3");
  await expect(page.getByLabel("Непрозрачность кисти", { exact: true })).toHaveValue("50");
  await page.getByLabel("HEX цвета кисти", { exact: true }).fill("#123456");
  await expect(page.getByLabel("Пикер цвета кисти", { exact: true })).toHaveValue("#123456");
  await expect(page.getByLabel("Цвет кисти", { exact: true })).toHaveValue("#123456");
  await page.getByLabel("HEX дополнительного цвета", { exact: true }).fill("#abcdef");
  await expect(page.getByLabel("Пикер дополнительного цвета", { exact: true })).toHaveValue(
    "#abcdef",
  );
  await expect(page.getByLabel("Дополнительный цвет", { exact: true })).toHaveValue("#abcdef");
  await page.getByLabel("Пикер дополнительного цвета", { exact: true }).fill("#fedcba");
  await expect(page.getByLabel("HEX дополнительного цвета", { exact: true })).toHaveValue(
    "#FEDCBA",
  );
  const fonts = await page
    .locator("input, select, textarea")
    .evaluateAll((fields) => fields.map((field) => parseFloat(getComputedStyle(field).fontSize)));
  expect(fonts.every((font) => font >= 16)).toBe(true);
  expect(await page.locator('meta[name="viewport"]').getAttribute("content")).not.toMatch(
    /user-scalable=no|maximum-scale/,
  );
  await page.touchscreen.tap(10, 10);
  await expect(page.getByRole("dialog", { name: "Кисть", exact: true })).toHaveCount(0);
  await chooseTool(page, "Перемещение");
  const revision = await page.getByTestId("document-status").getAttribute("data-revision");
  await touchPixel(page);
  await expect(page.getByTestId("document-status")).toHaveAttribute("data-revision", revision!);
  expect(errors).toEqual([]);
});

test("two-finger texture gestures zoom around the fingers and pan without painting or jumping", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.getByRole("button", { name: "2D вид", exact: true }).tap();
  const texture = page.getByTestId("skin-texture");
  await texture.screenshot();
  const original = await texture.evaluate((canvas) => (canvas as HTMLCanvasElement).toDataURL());
  const initial = (await texture.boundingBox())!;
  const center = { x: initial.x + initial.width * 0.58, y: initial.y + initial.height * 0.44 };
  const session = await page.context().newCDPSession(page);
  const fingers = (distance: number, dx = 0, dy = 0) => [
    { id: 1, x: center.x - distance / 2 + dx, y: center.y + dy },
    { id: 2, x: center.x + distance / 2 + dx, y: center.y + dy },
  ];
  // A second finger cancels the provisional brush stroke from the first finger.
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [fingers(80)[0]],
  });
  await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: fingers(80) });
  await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: fingers(120) });
  await expect
    .poll(async () => (await texture.boundingBox())!.width / initial.width)
    .toBeCloseTo(1.5, 2);
  const zoomed = (await texture.boundingBox())!;
  expect((center.x - zoomed.x) / zoomed.width).toBeCloseTo(0.58, 2);
  expect((center.y - zoomed.y) / zoomed.height).toBeCloseTo(0.44, 2);
  await session.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: fingers(120, 20, 15),
  });
  await expect.poll(async () => (await texture.boundingBox())!.x - zoomed.x).toBeCloseTo(20, 0);
  expect((await texture.boundingBox())!.y - zoomed.y).toBeCloseTo(15, 0);
  await session.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: fingers(60, 20, 15),
  });
  await expect
    .poll(async () => (await texture.boundingBox())!.width / initial.width)
    .toBeCloseTo(0.75, 2);
  await session.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [fingers(60, 20, 15)[1]],
  });
  const released = (await texture.boundingBox())!;
  await session.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ ...fingers(60, 20, 15)[1], x: center.x + 90 }],
  });
  await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  expect(await texture.boundingBox()).toEqual(released);
  expect(await texture.evaluate((canvas) => (canvas as HTMLCanvasElement).toDataURL())).toBe(
    original,
  );
  await expect(
    page.locator('.mobile-tool-settings button[aria-label="Отменить штрих"]'),
  ).toBeDisabled();
  // The hand tool uses the same two-finger gesture, with a fresh baseline.
  await chooseTool(page, "Перемещение");
  await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: fingers(60) });
  await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: fingers(120) });
  await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect
    .poll(async () => (await texture.boundingBox())!.width / released.width)
    .toBeCloseTo(2, 2);
  expect(await texture.evaluate((canvas) => (canvas as HTMLCanvasElement).toDataURL())).toBe(
    original,
  );
  await chooseTool(page, "Кисть");
  await page.getByLabel("Цвет кисти", { exact: true }).fill("#ff00ff");
  await touchPixel(page);
  await expect.poll(() => pixel(page)).toEqual([255, 0, 255, 255]);
  await session.detach();
});
