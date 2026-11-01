import { setColor } from "./color-picker-helpers";
import { test, expect, type Page, type Locator } from "@playwright/test";
import { SkinDocument, encodeSkinProject, writeSkinMetadata } from "@striped-skins/api";

test.use({ viewport: { width: 1280, height: 900 }, hasTouch: true });
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("viewer.options.animations", "");
    localStorage.setItem("viewer.options.smoothCamera", "");
    localStorage.setItem("viewer.options.antialiasing", "off");
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type, options) {
      return original.call(this, type, {
        ...options,
        ...(type.startsWith("webgl") ? { preserveDrawingBuffer: true } : {}),
      });
    } as typeof original;
  });
  await page.goto("/editor");
  await expect(page.getByTestId("skin-texture")).toBeAttached();
  const pixels = new Uint8ClampedArray(64 * 64 * 4);
  for (let i = 0; i < pixels.length; i += 4) pixels.set([200, 30, 40, 255], i);
  pixels.set([0, 255, 0, 255], (4 * 64 + 4) * 4);
  const skin = new SkinDocument(64, 64, pixels);
  writeSkinMetadata(skin, { race: "HUMAN" });
  await page.getByRole("button", { name: "Открыть", exact: true }).click();
  await expect(
    page.getByText("Служебные пиксели, раса и аксессуары считываются автоматически.", {
      exact: true,
    }),
  ).toHaveCount(0);
  await page.getByLabel("Открыть PNG", { exact: true }).setInputFiles({
    name: "parts.striped",
    mimeType: "application/zip",
    buffer: Buffer.from(encodeSkinProject(new SkinDocument(64, 64, skin.pixels))),
  });
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByTestId("skin-texture")).toBeAttached();
  await expect(page.getByRole("navigation", { name: "Меню редактора" })).not.toBeVisible();
  await expect
    .poll(() =>
      page.locator('section[aria-label="Предпросмотр модели"] canvas').evaluate((node) => {
        const copy = document.createElement("canvas");
        copy.width = copy.height = 32;
        const context = copy.getContext("2d")!;
        context.drawImage(node as HTMLCanvasElement, 0, 0, 32, 32);
        return context.getImageData(0, 0, 32, 32).data.some((v, i) => i % 4 === 3 && v > 0);
      }),
    )
    .toBe(true);
});
const combo = (page: Page) => page.getByRole("combobox", { name: "Слой рисования", exact: true });
const part = (page: Page, id: string) => page.locator(`.paint-part-option[data-part="${id}"]`);
const read = (canvas: Locator, x: number, y: number) =>
  canvas.evaluate(
    (node, p) =>
      Array.from((node as HTMLCanvasElement).getContext("2d")!.getImageData(p.x, p.y, 1, 1).data),
    { x, y },
  );
const frame = (page: Page) =>
  page
    .locator('section[aria-label="Предпросмотр модели"] canvas')
    .evaluate(async (node) =>
      Array.from(
        new Uint8Array(
          await crypto.subtle.digest(
            "SHA-256",
            new TextEncoder().encode((node as HTMLCanvasElement).toDataURL()),
          ),
        ),
      ).join(","),
    );

const orangePixels = (page: Page) =>
  page.locator('section[aria-label="Предпросмотр модели"] canvas').evaluate((node) => {
    const copy = document.createElement("canvas");
    copy.width = copy.height = 128;
    const context = copy.getContext("2d")!;
    context.drawImage(node as HTMLCanvasElement, 0, 0, 128, 128);
    const data = context.getImageData(0, 0, 128, 128).data;
    let count = 0;
    for (let i = 0; i < data.length; i += 4)
      if (data[i] > 180 && data[i + 1] > 60 && data[i + 2] < 60 && data[i + 3] > 0) count++;
    return count;
  });

async function clickTexel(page: Page, x: number, y: number) {
  const canvas = page.getByTestId("skin-texture");
  await canvas.screenshot();
  const box = (await canvas.boundingBox())!;
  await page.mouse.click(
    box.x + (box.width * (x + 0.5)) / 64,
    box.y + (box.height * (y + 0.5)) / 64,
  );
}

test("2D painting and erasing stay inside the selected part's UV islands, including wide brushes and gaps", async ({
  page,
}) => {
  await combo(page).click();
  await part(page, "head").click();
  await setColor(page, "Цвет кисти", "#ff00ff");
  const canvas = page.getByTestId("skin-texture");
  const before = await canvas.evaluate((node) => (node as HTMLCanvasElement).toDataURL());
  await clickTexel(page, 50, 50);
  await clickTexel(page, 4, 4);
  expect(await canvas.evaluate((node) => (node as HTMLCanvasElement).toDataURL())).toBe(before);
  await expect(page.getByRole("button", { name: "Отменить штрих", exact: true })).toBeDisabled();
  await page.getByLabel("Размер кисти", { exact: true }).fill("9");
  await page.keyboard.press("Enter");
  await clickTexel(page, 8, 8);
  await expect.poll(() => read(canvas, 12, 12)).toEqual([255, 0, 255, 255]);
  expect(await read(canvas, 4, 4)).toEqual([0, 255, 0, 255]);
  expect(await read(canvas, 50, 50)).toEqual([200, 30, 40, 255]);
  await page.getByRole("button", { name: "Отменить штрих", exact: true }).click();
  expect(await canvas.evaluate((node) => (node as HTMLCanvasElement).toDataURL())).toBe(before);
  await page.getByRole("button", { name: "Ластик · E", exact: true }).click();
  await clickTexel(page, 8, 8);
  await expect.poll(() => read(canvas, 8, 8)).toEqual([0, 0, 0, 0]);
  expect(await read(canvas, 4, 4)).toEqual([0, 255, 0, 255]);
  await page.getByRole("button", { name: "Пипетка · I", exact: true }).click();
  await clickTexel(page, 4, 4);
  await expect(page.getByLabel("Цвет кисти", { exact: true })).toHaveAttribute(
    "data-color",
    "#00ff00",
  );
  await combo(page).click();
  await page.keyboard.press("Home");
  await page.keyboard.press("Enter");
  await clickTexel(page, 50, 50);
  await expect.poll(() => read(canvas, 50, 50)).toEqual([0, 255, 0, 255]);
});

test("rapid keyboard selection does not wait for the popover toggle event", async ({ page }) => {
  await combo(page).click();
  await part(page, "hat").click();
  await expect(combo(page)).toContainText("Внешний слой головы");
  // Deliver the next keys before the browser can dispatch its deferred toggle event.
  const keys = async (sequence: string[]) => {
    await combo(page).evaluate((button, sequence) => {
      (button as HTMLButtonElement).click();
      for (const key of sequence)
        button.dispatchEvent(
          new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }),
        );
    }, sequence);
  };
  await keys(["Home", "Enter"]);
  await expect(combo(page)).toHaveAttribute("aria-expanded", "false");
  await expect(combo(page)).toContainText("Видимой поверхности");
  await expect(page.getByTestId("part-uv-highlight")).toHaveCount(0);
  await keys(["Home", "ArrowDown", "Enter"]);
  await expect(combo(page)).toHaveAttribute("aria-expanded", "false");
  await expect(combo(page)).toContainText("Голова");
});

test("3D UV contours follow the selected paint part and restore all surfaces in automatic mode", async ({
  page,
}) => {
  const uv = page.locator(".texture-viewport").getByRole("button", { name: "UV", exact: true });
  const bottomFrame = () =>
    page.locator('section[aria-label="Предпросмотр модели"] canvas').evaluate(async (node) => {
      const copy = document.createElement("canvas");
      copy.width = copy.height = 128;
      copy.getContext("2d")!.drawImage(node as HTMLCanvasElement, 0, 0, 128, 128);
      const data = copy.getContext("2d")!.getImageData(0, 64, 128, 64).data;
      return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", data))).join(",");
    });
  await uv.click();
  await expect.poll(() => orangePixels(page)).toBe(0);
  const withoutUV = await bottomFrame();
  await uv.click();
  await expect.poll(bottomFrame).not.toBe(withoutUV);
  const allParts = await bottomFrame();
  await combo(page).click();
  await part(page, "hat").click();
  await expect(combo(page)).toHaveAttribute("aria-expanded", "false");
  await expect(combo(page)).toContainText("Внешний слой головы");
  await expect.poll(bottomFrame).toBe(withoutUV);
  await expect.poll(() => orangePixels(page)).toBeGreaterThan(10);
  await combo(page).click();
  await page.keyboard.press("Home");
  await page.keyboard.press("Enter");
  await expect(combo(page)).toHaveAttribute("aria-expanded", "false");
  await expect(combo(page)).toContainText("Видимой поверхности");
  await expect.poll(bottomFrame).toBe(allParts);
});

test("part options show cropped live UV textures and highlight 2D/3D without editing or selecting", async ({
  page,
}, info) => {
  const texture = await page
    .getByTestId("skin-texture")
    .evaluate((node) => (node as HTMLCanvasElement).toDataURL());
  await expect(page.getByRole("button", { name: "Отменить штрих", exact: true })).toBeDisabled();
  await page.locator(".texture-viewport").getByRole("button", { name: "UV", exact: true }).click();
  const before = await frame(page);
  await combo(page).click();
  const head = part(page, "head");
  await expect.poll(() => read(head.locator("canvas"), 25, 40)).toEqual([200, 30, 40, 255]);
  expect(await read(head.locator("canvas"), 10, 22)).toEqual([0, 0, 0, 0]);
  await head.hover();
  await expect(page.getByTestId("part-uv-highlight").locator("polygon")).toHaveCount(6);
  await expect.poll(() => frame(page)).not.toBe(before);
  await expect.poll(() => orangePixels(page)).toBeGreaterThan(100);
  await expect(head).toHaveCSS("color", "rgb(249, 115, 22)");
  await expect(page.getByTestId("part-uv-highlight").locator("polygon").first()).toHaveCSS(
    "fill",
    "rgb(249, 115, 22)",
  );
  await expect(combo(page)).toHaveText("UVВидимой поверхности");
  const headFrame = await frame(page);
  await page.mouse.move(5, 5);
  await expect(page.getByTestId("part-uv-highlight")).toHaveCount(0);
  await expect.poll(() => frame(page)).toBe(before);
  await part(page, "body").hover();
  await expect(page.getByTestId("part-uv-highlight").locator("polygon").first()).toHaveAttribute(
    "data-surface",
    /^body\//,
  );
  await expect.poll(() => frame(page)).not.toBe(headFrame);
  await head.hover();
  await expect.poll(() => frame(page)).toBe(headFrame);
  await page.screenshot({ path: info.outputPath("paint-part-preview.png") });
  await page.keyboard.press("Escape");
  await expect(combo(page)).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByTestId("part-uv-highlight")).toHaveCount(0);
  await expect.poll(() => frame(page)).toBe(before);
  expect(
    await page
      .getByTestId("skin-texture")
      .evaluate((node) => (node as HTMLCanvasElement).toDataURL()),
  ).toBe(texture);
  await expect(page.getByRole("button", { name: "Отменить штрих", exact: true })).toBeDisabled();
});

test("keyboard navigation previews parts, commits only on Enter, persists selection, and dismisses on Tab/outside click", async ({
  page,
}) => {
  await combo(page).focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByTestId("part-uv-highlight").locator("polygon").first()).toHaveAttribute(
    "data-surface",
    /^head\//,
  );
  await expect(combo(page)).toContainText("Видимой поверхности");
  await page.keyboard.press("Enter");
  await expect(combo(page)).toHaveText("Голова");
  await expect(combo(page)).toBeFocused();
  await expect(page.getByTestId("part-uv-highlight")).toHaveCount(0);
  await page.reload();
  await expect(combo(page)).toHaveText("Голова");
  await combo(page).focus();
  await page.keyboard.press("End");
  const last = page.getByRole("option").last();
  await expect(last).toHaveAttribute("data-active", "true");
  await expect(last).toBeInViewport();
  await page.keyboard.press("Escape");
  await expect(combo(page)).toHaveText("Голова");
  await combo(page).click();
  await combo(page).dispatchEvent("keydown", { key: "т", code: "KeyN" });
  await expect(part(page, "body")).toHaveAttribute("data-active", "true");
  await page.keyboard.press("Home");
  await page.keyboard.press("Enter");
  await expect(combo(page)).toContainText("Видимой поверхности");
  await combo(page).click();
  await page.keyboard.press("Tab");
  await expect(combo(page)).toHaveAttribute("aria-expanded", "false");
  await combo(page).click();
  await page.getByRole("heading", { name: "Рисование по поверхности" }).click();
  await expect(combo(page)).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByTestId("part-uv-highlight")).toHaveCount(0);
});

test("selected part thumbnail follows painting, undo and layer visibility", async ({ page }) => {
  await combo(page).click();
  await part(page, "head").click();
  const thumbnail = combo(page).locator("canvas");
  await expect.poll(() => read(thumbnail, 25, 40)).toEqual([200, 30, 40, 255]);
  await setColor(page, "Цвет кисти", "#ff00ff");
  const box = (await page.getByTestId("skin-texture").boundingBox())!;
  await page.mouse.click(box.x + (box.width * 12.5) / 64, box.y + (box.height * 12.5) / 64);
  await expect.poll(() => read(thumbnail, 25, 40)).toEqual([255, 0, 255, 255]);
  await page.getByRole("button", { name: "Отменить штрих", exact: true }).click();
  await expect.poll(() => read(thumbnail, 25, 40)).toEqual([200, 30, 40, 255]);
  await page.getByRole("button", { name: "Скрыть слой Основа", exact: true }).click();
  await expect.poll(() => read(thumbnail, 25, 40)).toEqual([0, 0, 0, 0]);
  await combo(page).click();
  await expect.poll(() => read(part(page, "head").locator("canvas"), 25, 40)).toEqual([0, 0, 0, 0]);
});

test("phone popup fits the screen, supports touch selection, and closes when inspector tabs change", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Параметры документа", exact: true }).click();
  await combo(page).tap();
  const popup = page.getByRole("listbox", { name: "Поверхность для рисования" });
  const box = (await popup.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(8);
  expect(box.x + box.width).toBeLessThanOrEqual(382);
  expect(box.y).toBeGreaterThanOrEqual(8);
  expect(box.y + box.height).toBeLessThanOrEqual(836);
  await page.screenshot({ path: info.outputPath("paint-part-phone.png") });
  await part(page, "head").tap();
  await expect(combo(page)).toHaveText("Голова");
  await combo(page).tap();
  await page.getByRole("tab", { name: "Параметры скина", exact: true }).tap();
  await expect(popup).not.toBeVisible();
  await expect(page.getByTestId("part-uv-highlight")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});
