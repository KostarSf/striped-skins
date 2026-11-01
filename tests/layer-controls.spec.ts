import { test, expect, type Page } from "@playwright/test";
import { SkinDocument, encodeSkinProject } from "@striped-skins/api";

test.beforeEach(async ({ page }) => {
  page.on("dialog", (dialog) => void dialog.accept());
  await page.addInitScript(() => {
    localStorage.setItem("viewer.options.animations", "");
    localStorage.setItem("viewer.options.smoothCamera", "");
    localStorage.setItem("viewer.options.antialiasing", "off");
  });
  await page.goto("/editor");
  await expect(page.getByTestId("skin-texture")).toBeAttached();
});
async function selected(page: Page, label: string) {
  const field = page.getByLabel(label, { exact: true });
  await field.focus();
  expect(
    await field.evaluate((input) => {
      const field = input as HTMLInputElement;
      return [field.selectionStart, field.selectionEnd, field.value.length];
    }),
  ).toEqual([0, (await field.inputValue()).length, (await field.inputValue()).length]);
  return field;
}

test("layer thumbnails crop nontransparent pixels, wait for stroke end, and update through erase/undo", async ({
  page,
}) => {
  const pixels = new Uint8ClampedArray(64 * 64 * 4);
  pixels.set([255, 80, 20, 0], (10 * 64 + 10) * 4);
  pixels.set([255, 0, 0, 255], (20 * 64 + 20) * 4);
  pixels.set([0, 255, 0, 255], (20 * 64 + 21) * 4);
  pixels.set([0, 0, 255, 1], (20 * 64 + 22) * 4);
  const bytes = encodeSkinProject(new SkinDocument(64, 64, pixels));
  await page.getByRole("button", { name: "Открыть", exact: true }).click();
  await page.getByLabel("Открыть PNG", { exact: true }).setInputFiles({
    name: "cropped.striped",
    mimeType: "application/zip",
    buffer: Buffer.from(bytes),
  });
  const thumbnail = page.getByTestId("layer-thumbnail");
  await expect(thumbnail).toHaveAttribute("data-bounds", "20,20,3,1");
  const read = (x: number, y: number) =>
    thumbnail.evaluate(
      (canvas, point) =>
        Array.from(
          (canvas as HTMLCanvasElement).getContext("2d")!.getImageData(point.x, point.y, 1, 1).data,
        ),
      { x, y },
    );
  expect(await read(16, 16)).toEqual([0, 255, 0, 255]);
  expect((await read(16, 0))[3]).toBe(0);
  await page.getByRole("button", { name: "Скрыть слой Основа", exact: true }).click();
  expect(await read(16, 16)).toEqual([0, 255, 0, 255]);
  await page.getByRole("button", { name: "Показать слой Основа", exact: true }).click();
  await page.getByRole("button", { name: "Ластик · E", exact: true }).click();
  const box = (await page.getByTestId("skin-texture").boundingBox())!;
  const beforeStroke = await thumbnail.evaluate((canvas) =>
    (canvas as HTMLCanvasElement).toDataURL(),
  );
  await page.mouse.move(box.x + (box.width * 20.5) / 64, box.y + (box.height * 20.5) / 64);
  await page.mouse.down();
  await expect
    .poll(() =>
      page
        .getByTestId("skin-texture")
        .evaluate(
          (canvas) =>
            (canvas as HTMLCanvasElement).getContext("2d")!.getImageData(20, 20, 1, 1).data[3],
        ),
    )
    .toBe(0);
  await expect(thumbnail).toHaveAttribute("data-bounds", "20,20,3,1");
  expect(await thumbnail.evaluate((canvas) => (canvas as HTMLCanvasElement).toDataURL())).toBe(
    beforeStroke,
  );
  await page.mouse.up();
  await expect(thumbnail).toHaveAttribute("data-bounds", "21,20,2,1");
  await page.getByRole("button", { name: "Отменить штрих", exact: true }).click();
  await expect(thumbnail).toHaveAttribute("data-bounds", "20,20,3,1");
  await page.getByRole("button", { name: "Повторить штрих", exact: true }).click();
  await expect(thumbnail).toHaveAttribute("data-bounds", "21,20,2,1");
  await page.getByRole("button", { name: "Новый слой", exact: true }).click();
  await expect(page.locator('.layer-row[data-active="true"] canvas')).toHaveAttribute(
    "data-empty",
    "true",
  );
  await page.getByRole("button", { name: "Кисть · B", exact: true }).click();
  await page.mouse.move(box.x + (box.width * 20.5) / 64, box.y + (box.height * 20.5) / 64);
  await page.mouse.down();
  await expect(page.locator('.layer-row[data-active="true"] canvas')).toHaveAttribute(
    "data-empty",
    "true",
  );
  await page.mouse.up();
  await expect(page.locator('.layer-row[data-active="true"] canvas')).toHaveAttribute(
    "data-empty",
    "false",
  );
});

test("numeric fields select all and expose a positioned slider with continuous percentages and one opacity undo", async ({
  page,
}) => {
  for (const [label, min, max] of [
    ["Размер кисти", 1, 32],
    ["Непрозрачность кисти", 0, 100],
    ["Непрозрачность слоя", 0, 100],
  ] as const) {
    const field = await selected(page, label);
    const popup = page.locator(".number-slider-popup:popover-open");
    await expect(popup).toBeVisible();
    const bounds = (await field.boundingBox())!,
      bubble = (await popup.boundingBox())!;
    expect(bubble.y).toBeGreaterThanOrEqual(bounds.y + bounds.height);
    await page.keyboard.type(label === "Размер кисти" ? "7" : "47");
    await expect(field).toHaveValue(label === "Размер кисти" ? "7" : "47");
    const slider = page.getByRole("slider", { name: `${label}: слайдер`, exact: true });
    await slider.focus();
    await slider.press("End");
    await expect(field).toHaveValue(String(max));
    await slider.press("Home");
    await expect(field).toHaveValue(String(min));
    await slider.press("ArrowRight");
    await expect(field).toHaveValue(String(min + 1));
    await slider.press("Escape");
    await expect(popup).toHaveCount(0);
    await expect(field).toBeFocused();
    await page.getByRole("tab", { name: "Текстура", exact: true }).click();
  }
  await page.getByRole("button", { name: "Отменить штрих", exact: true }).click();
  await expect(page.getByLabel("Непрозрачность слоя", { exact: true })).toHaveValue("100");
  const size = await selected(page, "Размер кисти");
  await size.fill("999");
  await expect(size).toHaveValue("32");
  await size.fill("");
  await size.press("Tab");
  await expect(size).toHaveValue("32");
  await size.fill("0");
  await expect(size).toHaveValue("1");
  await page.screenshot({ path: "/tmp/striped-numeric-popup.png" });
});

test.describe("phone numeric settings", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test("slider stays above the tool dialog, accepts touch and Escape closes the slider first", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Параметры инструмента", exact: true }).tap();
    const dialog = page.locator(".mobile-tool-settings");
    const field = await selected(page, "Размер кисти");
    const slider = page.getByRole("slider", { name: "Размер кисти: слайдер", exact: true });
    await expect(slider).toBeVisible();
    const bounds = (await slider.boundingBox())!;
    await page.touchscreen.tap(bounds.x + bounds.width * 0.7, bounds.y + bounds.height / 2);
    expect(Number(await field.inputValue())).toBeGreaterThan(10);
    await page.getByLabel("Непрозрачность кисти", { exact: true }).fill("53");
    await expect(
      page.getByRole("slider", { name: "Непрозрачность кисти: слайдер", exact: true }),
    ).toHaveValue("53");
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
    await page.screenshot({ path: "/tmp/striped-mobile-numeric-popup.png" });
    await page.keyboard.press("Escape");
    await expect(dialog).toBeVisible();
    await expect(page.locator(".number-slider-popup:popover-open")).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
  });
});

test("model-lab uses the same selectable brush size and popup slider", async ({ page }) => {
  await page.goto("/model-lab");
  const field = await selected(page, "Размер кисти");
  const slider = page.getByRole("slider", { name: "Размер кисти: слайдер", exact: true });
  await expect(slider).toBeVisible();
  await slider.focus();
  await slider.press("End");
  await expect(field).toHaveValue("32");
  await slider.press("Escape");
  await expect(field).toBeFocused();
});
