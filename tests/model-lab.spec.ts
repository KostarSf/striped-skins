import { test, expect, type Page } from "@playwright/test";

test.use({ viewport: { width: 1280, height: 900 } });
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type, options) {
      return original.call(this, type, {
        ...options,
        ...(type.startsWith("webgl") ? { preserveDrawingBuffer: true } : {}),
      });
    } as typeof original;
  });
  await page.goto("/model-lab");
  await expect(page.getByTestId("skin-texture")).toBeVisible();
  await expect.poll(() => page.getByTestId("render-stats").getAttribute("data-calls")).toBe("28");
});

async function frame(page: Page) {
  return page
    .locator("section canvas")
    .evaluate((canvas) => (canvas as HTMLCanvasElement).toDataURL());
}
async function pixel(page: Page, x: number, y: number) {
  return page
    .getByTestId("skin-texture")
    .evaluate(
      (canvas, point) =>
        Array.from(
          (canvas as HTMLCanvasElement).getContext("2d")!.getImageData(point.x, point.y, 1, 1).data,
        ),
      { x, y },
    );
}

test("left-button dragging rotates after idle and after returning from brush mode", async ({
  page,
}) => {
  const canvas = (await page.locator("section canvas").boundingBox())!;
  const drag = async () => {
    const before = await frame(page);
    await page.mouse.move(canvas.x + canvas.width / 2, canvas.y + canvas.height / 2);
    await page.mouse.down();
    // A user can pause with the button held after on-demand rendering goes idle.
    await page.waitForTimeout(250);
    await page.mouse.move(canvas.x + canvas.width / 2 + 160, canvas.y + canvas.height / 2 + 40, {
      steps: 12,
    });
    await page.mouse.up();
    await expect.poll(() => frame(page)).not.toBe(before);
  };
  await drag();
  await page.getByRole("button", { name: "Режим: вращение" }).click();
  await page.getByRole("button", { name: "Режим: кисть" }).click();
  await drag();
  await expect(page.getByRole("button", { name: "Отменить штрих" })).toBeDisabled();
});

test("all six sizes change the image, and hiding a parent keeps its ears", async ({ page }) => {
  const initial = await frame(page);
  const frames = new Set([initial]);
  for (const size of ["FOAL", "YEARLING", "TALL", "LANKY", "BULKY"]) {
    const previous = await frame(page);
    await page.getByLabel("Размер модели").selectOption(size);
    await expect.poll(() => frame(page)).not.toBe(previous);
    const current = await frame(page);
    expect(frames.has(current)).toBe(false);
    frames.add(current);
  }
  await page.getByLabel("Размер модели").selectOption("NORMAL");
  await expect.poll(() => frame(page)).toBe(initial);
  await page.getByRole("checkbox", { name: "Показать head", exact: true }).uncheck();
  await expect(
    page.getByRole("checkbox", { name: "Показать head/ears/left", exact: true }),
  ).toBeChecked();
  await expect.poll(() => page.getByTestId("render-stats").getAttribute("data-calls")).toBe("27");
  await page.getByRole("checkbox", { name: "Показать head/ears/left", exact: true }).uncheck();
  await expect.poll(() => page.getByTestId("render-stats").getAttribute("data-calls")).toBe("26");
});

test("2D painting updates the 3D frame, protects metadata, and round-trips through PNG", async ({
  page,
}) => {
  const texture = page.getByTestId("skin-texture");
  const before = await pixel(page, 12, 12);
  const metadataBefore = await pixel(page, 0, 0);
  const frameBefore = await frame(page);
  const box = (await texture.boundingBox())!;
  await page.mouse.click(box.x + (12.5 * box.width) / 64, box.y + (12.5 * box.height) / 64);
  await expect.poll(() => pixel(page, 12, 12)).toEqual([255, 0, 255, 255]);
  await expect.poll(() => frame(page)).not.toBe(frameBefore);
  await page.getByRole("button", { name: "Отменить штрих" }).click();
  await expect.poll(() => pixel(page, 12, 12)).toEqual(before);
  await page.getByRole("button", { name: "Повторить штрих" }).click();
  await expect.poll(() => pixel(page, 12, 12)).toEqual([255, 0, 255, 255]);
  const visible = await texture.boundingBox();
  await page.mouse.click(
    visible!.x + (0.5 * visible!.width) / 64,
    visible!.y + (0.5 * visible!.height) / 64,
  );
  await expect.poll(() => pixel(page, 0, 0)).toEqual(metadataBefore);
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Скачать PNG" }).click();
  const download = await pending;
  const path = (await download.path())!;
  await page.getByLabel("Открыть PNG").setInputFiles(path);
  await expect.poll(() => pixel(page, 12, 12)).toEqual([255, 0, 255, 255]);
  expect(await pixel(page, 0, 0)).toEqual(metadataBefore);
  await expect(page.getByRole("button", { name: "Отменить штрих" })).toBeDisabled();
});

test("painting directly on the model updates the matching 2D texel and undo restores it", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const before = await page
    .getByTestId("skin-texture")
    .evaluate((canvas) =>
      Array.from((canvas as HTMLCanvasElement).getContext("2d")!.getImageData(0, 0, 64, 64).data),
    );
  // Find an actually rendered opaque surface instead of assuming a fixed model pixel.
  const point = await page.locator("section canvas").evaluate((canvas) => {
    const c = canvas as HTMLCanvasElement,
      gl = c.getContext("webgl2")!;
    const data = new Uint8Array(c.width * c.height * 4);
    gl.readPixels(0, 0, c.width, c.height, gl.RGBA, gl.UNSIGNED_BYTE, data);
    const rect = c.getBoundingClientRect();
    for (let y = Math.floor(c.height * 0.25); y < c.height * 0.75; y += 7)
      for (let x = Math.floor(c.width * 0.3); x < c.width * 0.7; x += 7) {
        const index = ((c.height - 1 - y) * c.width + x) * 4;
        if (data[index + 3] > 250)
          return {
            x: rect.x + (x * rect.width) / c.width,
            y: rect.y + (y * rect.height) / c.height,
          };
      }
    throw new Error("No rendered surface found");
  });
  await page.getByRole("button", { name: "Режим: вращение" }).click();
  await page.mouse.click(point.x, point.y);
  const status = page.getByTestId("document-status");
  await expect(status).not.toHaveAttribute("data-pixel", "");
  const [x, y] = (await status.getAttribute("data-pixel"))!.split(",").map(Number);
  await expect.poll(() => pixel(page, x, y)).toEqual([255, 0, 255, 255]);
  await page.getByRole("button", { name: "Отменить штрих" }).click();
  await expect
    .poll(() => pixel(page, x, y))
    .toEqual(before.slice((y * 64 + x) * 4, (y * 64 + x) * 4 + 4));
  expect(errors).toEqual([]);
});

test("hidden geometry cannot be painted and repeated variant changes release resources", async ({
  page,
}) => {
  const checkboxes = page.getByRole("checkbox", { name: /^Показать / });
  for (const box of await checkboxes.all()) await box.uncheck();
  await expect.poll(() => page.getByTestId("render-stats").getAttribute("data-calls")).toBe("0");
  await page.getByRole("button", { name: "Режим: вращение" }).click();
  const canvas = (await page.locator("section canvas").boundingBox())!;
  await page.mouse.click(canvas.x + canvas.width / 2, canvas.y + canvas.height / 2);
  await expect(page.getByRole("button", { name: "Отменить штрих" })).toBeDisabled();
  for (const box of await checkboxes.all()) await box.check();
  const stats = page.getByTestId("render-stats");
  await expect.poll(() => stats.getAttribute("data-calls")).toBe("28");
  const geometries = await stats.getAttribute("data-geometries");
  for (let i = 0; i < 8; i++)
    await page.getByRole("checkbox", { name: "Slim", exact: true }).setChecked(i % 2 === 0);
  await expect.poll(() => stats.getAttribute("data-geometries")).toBe(geometries);
  await expect(stats).toHaveAttribute("data-textures", "1");
});
