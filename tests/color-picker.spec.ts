import { expect, test, type Page } from "@playwright/test";
import { setColor } from "./color-picker-helpers";

test.use({ viewport: { width: 1280, height: 900 } });
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("viewer.options.animations", "");
    localStorage.setItem("viewer.options.smoothCamera", "");
  });
});
async function editor(page: Page) {
  await page.goto("/editor");
  await expect(page.getByTestId("skin-texture")).toBeAttached();
  await expect(page.locator(".studio-loading-badge")).toHaveCount(0);
}
const trigger = (page: Page, label = "Цвет кисти") =>
  page.getByRole("button", { name: label, exact: true });
const picker = (page: Page, label = "Цвет кисти") =>
  page.getByRole("dialog", { name: `Выбор цвета: ${label}`, exact: true });
const texture = (page: Page) =>
  page.getByTestId("skin-texture").evaluate((canvas) => (canvas as HTMLCanvasElement).toDataURL());

test("HEX, RGB, spectrum and keyboard stay synchronized without painting; the original color can be restored", async ({
  page,
}, testInfo) => {
  await editor(page);
  const pixels = await texture(page);
  const original = await trigger(page).getAttribute("data-color");
  await trigger(page).focus();
  await page.keyboard.press("Enter");
  const popup = picker(page);
  await expect(popup).toBeVisible();
  await expect(popup.getByRole("button", { name: "Закрыть выбор цвета" })).toBeFocused();
  const hex = popup.getByLabel("HEX выбранного цвета");
  await hex.fill("#123456");
  for (const [label, value] of [
    ["Красный", "18"],
    ["Зелёный", "52"],
    ["Синий", "86"],
  ]) {
    await expect(popup.getByLabel(label, { exact: true })).toHaveValue(value);
  }
  await popup.getByLabel("Красный", { exact: true }).fill("255");
  await expect(hex).toHaveValue("#FF3456");
  await hex.fill("#12");
  await expect(trigger(page)).toHaveAttribute("data-color", "#ff3456");
  await hex.press("Tab");
  await expect(hex).toHaveValue("#FF3456");
  const hue = popup.getByRole("slider").last();
  await hue.focus();
  await hue.press("ArrowRight");
  await expect(trigger(page)).not.toHaveAttribute("data-color", "#ff3456");
  const saturation = popup.locator(".react-colorful__saturation");
  const before = await trigger(page).getAttribute("data-color");
  await saturation.click({ position: { x: 80, y: 50 } });
  await expect(trigger(page)).not.toHaveAttribute("data-color", before!);
  await page.screenshot({ path: testInfo.outputPath("desktop-picker.png") });
  await popup.getByRole("button", { name: "Исходный", exact: true }).click();
  await expect(trigger(page)).toHaveAttribute("data-color", original!);
  await page.keyboard.press("Escape");
  await expect(popup).not.toBeVisible();
  await expect(trigger(page)).toBeFocused();
  expect(await texture(page)).toBe(pixels);
  await expect(page.getByRole("button", { name: "Отменить штрих", exact: true })).toBeDisabled();
  await expect(page.locator('input[type="color"]')).toHaveCount(0);
});

test("skin swatches and recent colors are shared between pickers and survive reload", async ({
  page,
}) => {
  await editor(page);
  await trigger(page).click();
  const swatch = picker(page)
    .getByRole("group", { name: "Палитра скина", exact: true })
    .getByRole("button")
    .first();
  const color = (await swatch.getAttribute("aria-label"))!.split(": ")[1];
  await swatch.click();
  await expect(trigger(page)).toHaveAttribute("data-color", color);
  await picker(page).getByLabel("HEX выбранного цвета").fill("#123456");
  await picker(page).getByRole("button", { name: "Закрыть выбор цвета" }).click();
  await trigger(page, "Дополнительный цвет").click();
  const recent = picker(page, "Дополнительный цвет").getByRole("button", {
    name: "Недавний цвет: #123456",
    exact: true,
  });
  await recent.click();
  await expect(trigger(page, "Дополнительный цвет")).toHaveAttribute("data-color", "#123456");
  await page.mouse.click(750, 110);
  await expect(picker(page, "Дополнительный цвет")).not.toBeVisible();
  await page.reload();
  await expect(page.getByTestId("skin-texture")).toBeVisible();
  await trigger(page).click();
  await expect(
    picker(page).getByRole("button", { name: "Недавний цвет: #123456", exact: true }),
  ).toBeVisible();
});

test("switching directly between pickers immediately includes the previous selection in recent colors", async ({
  page,
}) => {
  await editor(page);
  await trigger(page).click();
  await picker(page).getByLabel("HEX выбранного цвета").fill("#123456");
  const secondary = trigger(page, "Дополнительный цвет");
  // Leave the first popover open and reach the other trigger with the keyboard.
  for (
    let step = 0;
    step < 10 && !(await secondary.evaluate((button) => button === document.activeElement));
    step++
  ) {
    await page.keyboard.press("Shift+Tab");
  }
  await expect(secondary).toBeFocused();
  await expect(picker(page)).toBeVisible();
  await page.keyboard.press("Enter");
  const popup = picker(page, "Дополнительный цвет");
  await expect(picker(page)).not.toBeVisible();
  const recent = popup.getByRole("button", { name: "Недавний цвет: #123456", exact: true });
  await expect(recent).toBeVisible();
  await recent.click();
  await expect(secondary).toHaveAttribute("data-color", "#123456");
  await popup.getByLabel("HEX выбранного цвета").fill("#abcdef");
  // Pointer switching must update the new popup too, without duplicating entries.
  await trigger(page).click();
  await expect(
    picker(page).getByRole("button", { name: "Недавний цвет: #abcdef", exact: true }),
  ).toBeVisible();
  await expect(
    picker(page).getByRole("button", { name: "Недавний цвет: #123456", exact: true }),
  ).toHaveCount(1);
  await picker(page).getByRole("button", { name: "Закрыть выбор цвета" }).click();
});

test("glow changes update skin metadata and remain undoable", async ({ page }) => {
  await editor(page);
  const pixels = await texture(page);
  const original = await trigger(page, "Цвет свечения").getAttribute("data-color");
  await setColor(page, "Цвет свечения", "#ab12ef");
  await expect(trigger(page, "Цвет свечения")).toHaveAttribute("data-color", "#ab12ef");
  await expect.poll(() => texture(page)).not.toBe(pixels);
  await page.getByRole("button", { name: "Отменить штрих", exact: true }).click();
  await expect(trigger(page, "Цвет свечения")).toHaveAttribute("data-color", original!);
  expect(await texture(page)).toBe(pixels);
});

test("picker fits narrow screens and Escape closes only the nested color popup", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await editor(page);
  await page.getByRole("button", { name: "Параметры инструмента", exact: true }).click();
  const parent = page.getByRole("dialog", { name: "Кисть", exact: true });
  await trigger(page, "Пикер цвета кисти").click();
  const popup = picker(page, "Пикер цвета кисти");
  await expect(popup).toBeVisible();
  for (const size of [
    { width: 320, height: 740 },
    { width: 390, height: 500 },
  ]) {
    await page.setViewportSize(size);
    await expect
      .poll(async () => {
        const box = await popup.boundingBox();
        return (
          !!box &&
          box.x >= 7 &&
          box.y >= 7 &&
          box.x + box.width <= size.width - 7 &&
          box.y + box.height <= size.height - 7
        );
      })
      .toBe(true);
  }
  await popup.getByLabel("HEX выбранного цвета").fill("#aabbcc");
  await expect(page.getByLabel("HEX цвета кисти", { exact: true })).toHaveValue("#AABBCC");
  await page.screenshot({ path: testInfo.outputPath("mobile-picker.png") });
  await page.keyboard.press("Escape");
  await expect(popup).not.toBeVisible();
  await expect(parent).toBeVisible();
  await expect(trigger(page, "Пикер цвета кисти")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(parent).not.toBeVisible();
});

test.describe("touch and model lab", () => {
  test.use({ hasTouch: true });
  test("spectrum accepts touch and model lab uses the same custom controls", async ({ page }) => {
    await page.goto("/model-lab");
    await expect(page.getByTestId("skin-texture")).toBeVisible();
    await trigger(page).tap();
    const popup = picker(page);
    const box = (await popup.locator(".react-colorful__saturation").boundingBox())!;
    const before = await trigger(page).getAttribute("data-color");
    await page.touchscreen.tap(box.x + box.width * 0.4, box.y + box.height * 0.3);
    await expect(trigger(page)).not.toHaveAttribute("data-color", before!);
    await popup.getByRole("button", { name: "Закрыть выбор цвета" }).tap();
    await setColor(page, "Цвет кисти", "#123456");
    await expect(trigger(page)).toHaveAttribute("data-color", "#123456");
    await expect(page.locator('input[type="color"]')).toHaveCount(0);
  });
});
