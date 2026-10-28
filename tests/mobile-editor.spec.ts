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
    for (const name of ["3D вид", "2D вид", "Параметры модели"]) {
      await footer.getByRole("button", { name, exact: true }).tap();
      await expect(footer.getByRole("button", { name, exact: true })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      const settings = name === "Параметры модели";
      await expect(page.locator(".palette-panel")).toBeVisible({ visible: !settings });
      await expect(page.locator(".inspector")).toBeVisible({ visible: settings });
      await expect(page.locator(".model-viewport")).toBeVisible({ visible: name === "3D вид" });
      await expect(page.locator(".texture-slot")).toBeVisible({ visible: name === "2D вид" });
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
  await page.getByLabel("Раса", { exact: true }).selectOption("KIRIN");
  await footer.getByRole("button", { name: "3D вид", exact: true }).tap();
  await footer.getByRole("button", { name: "Параметры модели", exact: true }).tap();
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
  await page.getByLabel("Непрозрачность кисти", { exact: true }).selectOption("50");
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Параметры инструмента", exact: true }),
  ).toBeFocused();
  await page.getByRole("button", { name: "3D вид", exact: true }).tap();
  await page.getByRole("button", { name: "Параметры модели", exact: true }).tap();
  await page.getByRole("button", { name: "2D вид", exact: true }).tap();
  await expect.poll(() => pixel(page)).toEqual([255, 0, 255, 255]);
  await page.getByRole("button", { name: "Параметры инструмента", exact: true }).tap();
  await expect(page.getByLabel("Размер кисти", { exact: true })).toHaveValue("3");
  await expect(page.getByLabel("Непрозрачность кисти", { exact: true })).toHaveValue("50");
  await page.touchscreen.tap(10, 10);
  await expect(page.getByRole("dialog", { name: "Кисть", exact: true })).toHaveCount(0);
  await chooseTool(page, "Перемещение");
  const revision = await page.getByTestId("document-status").getAttribute("data-revision");
  await touchPixel(page);
  await expect(page.getByTestId("document-status")).toHaveAttribute("data-revision", revision!);
  expect(errors).toEqual([]);
});
