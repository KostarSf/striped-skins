import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { decodeSkinMetadata, decodeSkinProject } from "@striped-skins/api";
import { setColor } from "./color-picker-helpers";

test.use({ viewport: { width: 1280, height: 900 } });
test.beforeEach(async ({ page }) => {
  page.on("dialog", (dialog) => void dialog.accept());
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
  const hue = popup.locator(".react-colorful").getByRole("slider").last();
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

test("spectrum color limit is shared and persisted while exact colors and skin pixels stay intact", async ({
  page,
}, testInfo) => {
  await editor(page);
  const pixels = await texture(page);
  await trigger(page).click();
  let popup = picker(page);
  let limit = popup.getByRole("slider", { name: "Количество цветов", exact: true });
  await expect(limit).toHaveValue("5");
  await expect(limit).toHaveAttribute("aria-valuetext", "Без ограничений");
  await popup.getByLabel("HEX выбранного цвета").fill("#123456");
  await limit.fill("1");
  await expect(limit).toHaveAttribute("aria-valuetext", "64");
  await expect(trigger(page)).toHaveAttribute("data-color", "#123456");
  await popup.locator(".react-colorful__saturation").click({ position: { x: 110, y: 55 } });
  const color = (await trigger(page).getAttribute("data-color"))!;
  expect(color).toMatch(/^#(?:00|55|aa|ff){3}$/);
  await page.screenshot({ path: testInfo.outputPath("quantized-spectrum.png") });
  await popup.getByLabel("HEX выбранного цвета").fill("#abcdef");
  await expect(trigger(page)).toHaveAttribute("data-color", "#abcdef");
  await popup.getByLabel("Красный", { exact: true }).fill("18");
  await expect(trigger(page)).toHaveAttribute("data-color", "#12cdef");
  const swatch = popup
    .getByRole("group", { name: "Палитра скина", exact: true })
    .getByRole("button")
    .first();
  const paletteColor = (await swatch.getAttribute("aria-label"))!.split(": ")[1];
  await swatch.click();
  await expect(trigger(page)).toHaveAttribute("data-color", paletteColor);
  await popup.getByRole("button", { name: "Исходный", exact: true }).click();
  await popup.getByRole("button", { name: "Закрыть выбор цвета" }).click();
  await trigger(page, "Дополнительный цвет").click();
  popup = picker(page, "Дополнительный цвет");
  limit = popup.getByRole("slider", { name: "Количество цветов", exact: true });
  await expect(limit).toHaveValue("1");
  await popup.getByRole("button", { name: "Закрыть выбор цвета" }).click();
  expect(await texture(page)).toBe(pixels);
  await expect(page.getByRole("button", { name: "Отменить штрих", exact: true })).toBeDisabled();
  await page.reload();
  await expect(trigger(page)).toBeVisible();
  await trigger(page).click();
  limit = picker(page).getByRole("slider", { name: "Количество цветов", exact: true });
  await expect(limit).toHaveValue("1");
  await limit.fill("5");
  await expect(picker(page).locator(".color-spectrum-stepped")).toHaveCount(0);
  await picker(page)
    .locator(".react-colorful__saturation")
    .click({ position: { x: 95, y: 65 } });
  expect(await trigger(page).getAttribute("data-color")).not.toMatch(/^#(?:00|55|aa|ff){3}$/);
});

test("rectangular spectrum cells match selection and preserve hue through gray and black", async ({
  page,
}, testInfo) => {
  await editor(page);
  await trigger(page).click();
  const popup = picker(page);
  const hex = popup.getByLabel("HEX выбранного цвета");
  const limit = popup.getByRole("slider", { name: "Количество цветов", exact: true });
  const field = popup.locator(".react-colorful__saturation");
  const hue = popup.locator(".react-colorful__hue [role=slider]");
  const area = popup.locator(".react-colorful__saturation [role=slider]");
  await hex.fill("#00ff00");
  await limit.fill("2");
  const box = (await field.boundingBox())!;
  const point = (x: number, y: number) => ({ x: box.width * x, y: (box.height - 12) * y });
  // A single uninterrupted drag crosses both achromatic regions.
  await field.click({ position: point(0.7, 0.3) });
  await page.mouse.down();
  for (const [x, y] of [
    [0.02, 0.3],
    [0.7, 0.98],
    [0.7, 0.3],
  ]) {
    await page.mouse.move(box.x + point(x, y).x, box.y + point(x, y).y, { steps: 8 });
    await expect(hue).toHaveAttribute("aria-valuenow", "120");
    if (x === 0.02)
      await expect(trigger(page)).toHaveAttribute("data-color", /^#([\da-f]{2})\1\1$/);
    if (y === 0.98) await expect(trigger(page)).toHaveAttribute("data-color", "#000000");
  }
  await page.mouse.up();
  await expect
    .poll(async () => {
      const selected = (await trigger(page).getAttribute("data-color"))!;
      return (
        parseInt(selected.slice(3, 5), 16) > parseInt(selected.slice(1, 3), 16) &&
        selected.slice(1, 3) === selected.slice(5, 7)
      );
    })
    .toBe(true);
  // Exact gray input also retains the previous hue, while exact chromatic input replaces it.
  await hex.fill("#808080");
  await expect(hue).toHaveAttribute("aria-valuenow", "120");
  await hex.fill("#0000ff");
  await expect(hue).toHaveAttribute("aria-valuenow", "240");
  for (const [setting, levels] of [
    [0, 2],
    [1, 4],
    [2, 8],
    [3, 16],
    [4, 32],
  ]) {
    await limit.fill(String(setting));
    const data = await field.evaluate((element) => {
      const image = getComputedStyle(element).backgroundImage;
      const svg = decodeURIComponent(image.slice(image.indexOf(",") + 1, image.lastIndexOf('"')));
      return [
        ...new DOMParser().parseFromString(svg, "image/svg+xml").querySelectorAll("rect"),
      ].map((rect) => ({
        x: Number(rect.getAttribute("x")),
        y: Number(rect.getAttribute("y")),
        color: rect.getAttribute("fill"),
      }));
    });
    expect(data).toHaveLength(levels ** 2);
    const cell = data[Math.floor(levels / 2) * levels + Math.floor(levels / 2)];
    for (const offset of [0.2, 0.8]) {
      await field.click({
        position: point((cell.x + offset) / levels, (cell.y + offset) / levels),
      });
      await expect(trigger(page)).toHaveAttribute("data-color", cell.color!);
    }
    await expect(hue).toHaveAttribute("aria-valuenow", "240");
  }
  await limit.fill("2");
  await hex.fill("#a100ff");
  await field.click({ position: point(0.95, 0.02) });
  await popup.screenshot({ path: testInfo.outputPath("rectangular-spectrum-512.png") });
  await area.focus();
  const marker = popup.locator(".react-colorful__saturation-pointer");
  const before = (await marker.boundingBox())!;
  await area.press("ArrowLeft");
  expect((await marker.boundingBox())!.x).toBeLessThan(before.x - box.width / 9);
  // Returning to unlimited mode must keep hue through black too.
  await limit.fill("5");
  await hex.fill("#00ff00");
  await field.click({ position: point(0.8, 0.999) });
  await field.click({ position: point(0.8, 0.3) });
  await expect(hue).toHaveAttribute("aria-valuenow", "120");
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
  await page.getByRole("tab", { name: "Параметры скина", exact: true }).click();
  const pixels = await texture(page);
  const original = await trigger(page, "Цвет свечения").getAttribute("data-color");
  await setColor(page, "Цвет свечения", "#ab12ef");
  await expect(trigger(page, "Цвет свечения")).toHaveAttribute("data-color", "#ab12ef");
  await expect.poll(() => texture(page)).not.toBe(pixels);
  await page.getByRole("button", { name: "Отменить штрих", exact: true }).click();
  await expect(trigger(page, "Цвет свечения")).toHaveAttribute("data-color", original!);
  expect(await texture(page)).toBe(pixels);
});

test("picker colors and palette stay consistent through project saving, recovery and mobile panels", async ({
  page,
}) => {
  await editor(page);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await setColor(page, "Цвет кисти", "#123456");
  await page.getByRole("button", { name: "Добавить цвет в палитру", exact: true }).click();
  await setColor(page, "Цвет кисти", "#654321");
  await page.getByRole("button", { name: "Добавить цвет в палитру", exact: true }).click();
  await setColor(page, "Дополнительный цвет", "#abcdef");
  const railColors = page.locator(".skin-palette .palette-swatch");
  expect(
    await railColors.evaluateAll((buttons) =>
      buttons.slice(0, 2).map((button) => button.getAttribute("aria-label")),
    ),
  ).toEqual(["Цвет #654321", "Цвет #123456"]);
  await page.getByRole("tab", { name: "Параметры скина", exact: true }).click();
  await trigger(page, "Цвет свечения").click();
  const glow = picker(page, "Цвет свечения");
  const palette = glow.getByRole("group", { name: "Палитра скина", exact: true });
  expect(
    await palette
      .getByRole("button")
      .evaluateAll((buttons) =>
        buttons.slice(0, 2).map((button) => button.getAttribute("aria-label")),
      ),
  ).toEqual(["Из палитры: #654321", "Из палитры: #123456"]);
  await glow.getByRole("button", { name: "Недавний цвет: #abcdef", exact: true }).click();
  await glow.getByLabel("HEX выбранного цвета").fill("#0f1e2d");
  await glow.getByRole("button", { name: "Закрыть выбор цвета" }).click();
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Сохранить проект", exact: true }).click();
  const bytes = await readFile((await (await downloading).path())!);
  const project = decodeSkinProject(bytes);
  expect(project.getWorkspace("colors", {})).toEqual({ primary: "#654321", secondary: "#abcdef" });
  expect(project.getWorkspace("customColors", [])).toEqual(["#654321", "#123456"]);
  expect(decodeSkinMetadata(project).glow).toBe("0f1e2d");
  await page.reload();
  await expect(trigger(page)).toHaveAttribute("data-color", "#654321");
  await expect(trigger(page, "Дополнительный цвет")).toHaveAttribute("data-color", "#abcdef");
  await page.getByRole("tab", { name: "Параметры скина", exact: true }).click();
  await expect(trigger(page, "Цвет свечения")).toHaveAttribute("data-color", "#0f1e2d");
  await page.getByRole("button", { name: "Открыть", exact: true }).click();
  await page
    .getByLabel("Открыть PNG", { exact: true })
    .setInputFiles({ name: "colors.striped", mimeType: "application/zip", buffer: bytes });
  await expect(trigger(page)).toHaveAttribute("data-color", "#654321");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Параметры инструмента", exact: true }).click();
  await expect(page.getByLabel("HEX цвета кисти", { exact: true })).toHaveValue("#654321");
  await expect(page.getByLabel("HEX дополнительного цвета", { exact: true })).toHaveValue(
    "#ABCDEF",
  );
  await setColor(page, "Пикер цвета кисти", "#123456");
  await expect(page.getByLabel("HEX цвета кисти", { exact: true })).toHaveValue("#123456");
  await page.keyboard.press("Escape");
  await expect(trigger(page)).toHaveAttribute("data-color", "#123456");
  await page.getByRole("button", { name: "Параметры документа", exact: true }).click();
  await page.getByRole("tab", { name: "Параметры скина", exact: true }).click();
  await expect(trigger(page, "Цвет свечения")).toHaveAttribute("data-color", "#0f1e2d");
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole("link", { name: "← Просмотрщик", exact: true }).click();
  await page.getByRole("button", { name: "Параметры скина", exact: true }).click();
  await expect(trigger(page, "Цвет свечения")).toHaveAttribute("data-color", "#0f1e2d");
  await setColor(page, "Цвет свечения", "#fedcba");
  await page.getByRole("link", { name: "Редактировать", exact: true }).click();
  await page.getByRole("tab", { name: "Параметры скина", exact: true }).click();
  await expect(trigger(page, "Цвет свечения")).toHaveAttribute("data-color", "#fedcba");
  await expect(page.locator('input[type="color"]')).toHaveCount(0);
  expect(errors).toEqual([]);
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
  test("phone spectrum uses the saved limit with touch and keyboard controls", async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 320, height: 844 });
    await editor(page);
    await trigger(page).tap();
    const popup = picker(page);
    const limit = popup.getByRole("slider", { name: "Количество цветов", exact: true });
    await limit.fill("1");
    await limit.focus();
    await limit.press("Home");
    await expect(limit).toHaveAttribute("aria-valuetext", "8");
    await popup.getByLabel("HEX выбранного цвета").fill("#00ff00");
    const box = (await popup.locator(".react-colorful__saturation").boundingBox())!;
    await page.touchscreen.tap(box.x + box.width * 0.7, box.y + box.height * 0.3);
    expect(await trigger(page).getAttribute("data-color")).toMatch(/^#(?:00|ff){3}$/);
    for (const [x, y] of [
      [0.05, 0.3],
      [0.7, 0.95],
      [0.7, 0.3],
    ]) {
      await page.touchscreen.tap(box.x + box.width * x, box.y + (box.height - 12) * y);
      await expect(popup.locator(".react-colorful__hue [role=slider]")).toHaveAttribute(
        "aria-valuenow",
        "120",
      );
    }
    await expect(trigger(page)).toHaveAttribute("data-color", "#00ff00");
    const range = (await limit.boundingBox())!;
    expect(range.x).toBeGreaterThanOrEqual(8);
    expect(range.x + range.width).toBeLessThanOrEqual(312);
    await page.screenshot({ path: testInfo.outputPath("phone-quantized-spectrum.png") });
    await page.reload();
    await expect(trigger(page)).toBeVisible();
    await trigger(page).tap();
    await expect(
      picker(page).getByRole("slider", { name: "Количество цветов", exact: true }),
    ).toHaveValue("0");
  });
  test("phone color fields show complete HEX and RGB values", async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await editor(page);
    await trigger(page).tap();
    const popup = picker(page);
    const hex = popup.getByLabel("HEX выбранного цвета");
    for (const width of [320, 390, 430, 600]) {
      await page.setViewportSize({ width, height: 844 });
      await hex.fill("#dddddd");
      await hex.blur();
      await page.evaluate(() => document.fonts.ready);
      for (const input of await popup.locator("input").all()) {
        await expect(input).toBeVisible();
        const metrics = await input.evaluate((element: HTMLInputElement) => {
          const style = getComputedStyle(element);
          const context = document.createElement("canvas").getContext("2d")!;
          context.font = style.font;
          const box = element.getBoundingClientRect();
          const dialog = element.closest("dialog")!.getBoundingClientRect();
          return {
            textWidth: context.measureText(element.value).width,
            availableWidth:
              element.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight),
            fontSize: parseFloat(style.fontSize),
            insideDialog: box.left >= dialog.left && box.right <= dialog.right,
          };
        });
        expect(metrics.availableWidth).toBeGreaterThanOrEqual(metrics.textWidth);
        expect(metrics.fontSize).toBeGreaterThanOrEqual(16);
        expect(metrics.insideDialog).toBe(true);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        width,
      );
      await page.screenshot({ path: testInfo.outputPath(`phone-picker-${width}.png`) });
    }
    await hex.fill("#ffffff");
    await popup.getByLabel("Красный", { exact: true }).fill("128");
    await expect(hex).toHaveValue("#80FFFF");
    await expect(trigger(page)).toHaveAttribute("data-color", "#80ffff");
  });
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
