import { test, expect, type Page } from "@playwright/test";

test.use({ viewport: { width: 1600, height: 1000 } });
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("viewer.options.animations", "");
    localStorage.setItem("viewer.options.smoothCamera", "");
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type, options) {
      return original.call(this, type, {
        ...options,
        ...(type.startsWith("webgl") ? { preserveDrawingBuffer: true } : {}),
      });
    } as typeof original;
  });
});
const tex = (page: Page) => page.getByTestId("skin-texture");
const pixel = (page: Page, x = 12, y = 12) =>
  tex(page).evaluate(
    (c, p) =>
      Array.from((c as HTMLCanvasElement).getContext("2d")!.getImageData(p.x, p.y, 1, 1).data),
    { x, y },
  );
async function paint(page: Page, x = 12, y = 12) {
  const box = (await tex(page).boundingBox())!;
  await page.mouse.click(
    box.x + ((x + 0.5) * box.width) / 64,
    box.y + ((y + 0.5) * box.height) / 64,
  );
}
const image = (page: Page) =>
  page.locator('section[aria-label="Предпросмотр модели"] canvas').evaluate(async (c) => {
    const bytes = new TextEncoder().encode((c as HTMLCanvasElement).toDataURL());
    return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), (b) =>
      b.toString(16).padStart(2, "0"),
    ).join("");
  });
const coverage = (page: Page) =>
  page.locator('section[aria-label="Предпросмотр модели"] canvas').evaluate((c) => {
    const canvas = c as HTMLCanvasElement,
      gl = canvas.getContext("webgl2")!,
      pixels = new Uint8Array(canvas.width * canvas.height * 4);
    gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    let minX = canvas.width,
      minY = canvas.height,
      maxX = 0,
      maxY = 0,
      count = 0;
    for (let y = 0; y < canvas.height; y++)
      for (let x = 0; x < canvas.width; x++)
        if (pixels[(y * canvas.width + x) * 4 + 3] > 26) {
          minX = Math.min(x, minX);
          maxX = Math.max(x, maxX);
          minY = Math.min(y, minY);
          maxY = Math.max(y, maxY);
          count++;
        }
    return [minX, minY, maxX, maxY, count];
  });
async function enter(page: Page, path = "/editor") {
  await page.goto(path);
  await expect(page.locator("canvas").first()).toBeVisible();
  await expect(page.locator(".studio-loading-badge")).toHaveCount(0);
}

test("viewer quick settings are nonmodal, retain all options, and share changes with editor", async ({
  page,
}) => {
  await enter(page, "/");
  await expect(page.getByRole("link", { name: "Striped Skins — просмотрщик" })).toContainText(
    "Striped Skins",
  );
  await expect(
    page.getByRole("complementary", { name: "Параметры скина", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Параметры скина", exact: true }).click();
  const panel = page.getByRole("complementary", { name: "Параметры скина", exact: true });
  await expect(panel.getByLabel("Раса", { exact: true }).locator("option")).toHaveCount(13);
  await expect(panel.getByLabel("Размер модели").locator("option")).toHaveCount(6);
  await panel.getByLabel("Раса", { exact: true }).selectOption("ALICORN");
  await panel.getByRole("checkbox", { name: "Корона", exact: true }).check();
  await expect(page.getByText("Есть изменения", { exact: true })).toBeVisible();
  const before = await image(page),
    box = (await page.locator('section[aria-label="Предпросмотр модели"]').boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5, { steps: 8 });
  await page.mouse.up();
  await expect.poll(() => image(page)).not.toBe(before);
  await page.getByRole("button", { name: "Закрыть параметры", exact: true }).click();
  await page.getByRole("button", { name: "Параметры скина", exact: true }).click();
  await expect(panel.getByLabel("Раса", { exact: true })).toHaveValue("ALICORN");
  await page.getByRole("link", { name: "Редактировать", exact: true }).click();
  await expect(tex(page)).toBeVisible();
  await expect(page.getByLabel("Раса", { exact: true })).toHaveValue("ALICORN");
  await expect(page.getByRole("checkbox", { name: "Корона", exact: true })).toBeChecked();
});

test("layout modes, texture pan/zoom and tool shortcuts preserve the exact document", async ({
  page,
}) => {
  await enter(page);
  await expect(tex(page)).toBeVisible();
  const initial = await pixel(page);
  await page.getByLabel("Цвет кисти", { exact: true }).fill("#ff00ff");
  await paint(page);
  await expect.poll(() => pixel(page)).toEqual([255, 0, 255, 255]);
  await page.getByRole("button", { name: "3D", exact: true }).click();
  await expect(tex(page)).not.toBeVisible();
  await page.getByRole("button", { name: "2D", exact: true }).click();
  await expect(tex(page)).toBeVisible();
  await expect(page.locator(".mini-preview")).toBeVisible();
  await page.getByRole("button", { name: "Скрыть 3D-превью", exact: true }).click();
  await expect(page.locator(".mini-preview")).toHaveCount(0);
  await page.getByRole("button", { name: "3D-превью", exact: true }).click();
  await expect(page.locator(".mini-preview")).toBeVisible();
  await page.getByRole("button", { name: "Рядом", exact: true }).click();
  await expect.poll(() => pixel(page)).toEqual([255, 0, 255, 255]);
  const oldBox = (await tex(page).boundingBox())!;
  await page.getByRole("button", { name: "2D +", exact: true }).click();
  await expect
    .poll(async () => (await tex(page).boundingBox())!.width)
    .toBeGreaterThan(oldBox.width);
  await page.getByRole("button", { name: "Вписать текстуру", exact: true }).click();
  const area = (await page.locator(".texture-area").boundingBox())!;
  await page.mouse.move(area.x + area.width / 2, area.y + area.height / 2);
  await page.mouse.down({ button: "right" });
  await page.mouse.move(area.x + area.width / 2 + 35, area.y + area.height / 2 + 20, { steps: 5 });
  await page.mouse.up({ button: "right" });
  await expect.poll(async () => (await tex(page).boundingBox())!.x).toBeGreaterThan(oldBox.x + 25);
  await expect.poll(() => pixel(page)).toEqual([255, 0, 255, 255]);
  await page.getByRole("button", { name: "Вписать текстуру", exact: true }).click();
  await page.keyboard.press("Control+z");
  await expect.poll(() => pixel(page)).toEqual(initial);
  await page.keyboard.press("Control+Shift+z");
  await expect.poll(() => pixel(page)).toEqual([255, 0, 255, 255]);
  await page.keyboard.press("i");
  await paint(page);
  await expect(page.getByLabel("Цвет кисти", { exact: true })).toHaveValue("#ff00ff");
  await page.keyboard.press("e");
  await paint(page);
  await expect.poll(() => pixel(page)).toEqual([0, 0, 0, 0]);
  await page.keyboard.press("Control+z");
  await expect.poll(() => pixel(page)).toEqual([255, 0, 255, 255]);
});

test("camera zoom, presets and projection change the actual WebGL frame", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await enter(page, "/");
  await page.waitForTimeout(150);
  const initial = await image(page);
  const initialCoverage = await coverage(page);
  await page.getByRole("button", { name: "Приблизить модель", exact: true }).click();
  await expect.poll(() => image(page)).not.toBe(initial);
  await page.getByRole("button", { name: "Сброс вида", exact: true }).click();
  // Coplanar cutout surfaces can differ in color at floating-point ties. Verify
  // the visible model returns to the same position, scale and silhouette instead.
  await expect
    .poll(async () => {
      const current = await coverage(page);
      return (
        current.slice(0, 4).every((v, i) => Math.abs(v - initialCoverage[i]) <= 1) &&
        Math.abs(current[4] - initialCoverage[4]) / initialCoverage[4] < 0.002
      );
    })
    .toBe(true);
  await page.getByLabel("Ракурс модели").selectOption("front");
  await expect.poll(() => image(page)).not.toBe(initial);
  const front = await image(page);
  await page.getByLabel("Ракурс модели").selectOption("orthographic");
  await expect.poll(() => image(page)).not.toBe(front);
  const ortho = await image(page);
  await page.getByRole("button", { name: "Приблизить модель", exact: true }).click();
  await expect.poll(() => image(page)).not.toBe(ortho);
  await page.getByLabel("Ракурс модели").selectOption("perspective");
  await expect
    .poll(async () => {
      const current = await coverage(page);
      return current.slice(0, 4).every((v, i) => Math.abs(v - initialCoverage[i]) <= 1);
    })
    .toBe(true);
  await page.evaluate(() => {
    Element.prototype.requestFullscreen = () =>
      Promise.reject(new Error("Fullscreen blocked by host"));
  });
  await page.getByRole("button", { name: "Полноэкранный вид", exact: true }).click();
  await expect(page.locator(".model-viewport")).toHaveClass(/maximized/);
  await page.keyboard.press("Escape");
  await expect(page.locator(".model-viewport")).not.toHaveClass(/maximized/);
  expect(errors).toEqual([]);
});

test("dirty import can be cancelled or exported before replacement; Escape and focus remain usable", async ({
  page,
}) => {
  await enter(page);
  await page.getByLabel("Цвет кисти", { exact: true }).fill("#ff00ff");
  await paint(page);
  await page.getByRole("button", { name: "Открыть", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Использовать пример скина" }).click();
  await expect(page.getByRole("heading", { name: "В текущем скине есть изменения" })).toBeVisible();
  await page.getByRole("button", { name: "Отмена", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect.poll(() => pixel(page)).toEqual([255, 0, 255, 255]);
  await page.getByRole("button", { name: "Открыть", exact: true }).click();
  await page.getByRole("button", { name: "Использовать пример скина" }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Экспортировать и открыть", exact: true }).click();
  expect((await download).suggestedFilename()).toMatch(/\.png$/);
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect.poll(() => pixel(page)).not.toEqual([255, 0, 255, 255]);
  await expect(page.getByText("Есть изменения", { exact: true })).toHaveCount(0);
});

test("mobile editor exposes texture, metadata and import without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await enter(page);
  await expect(page.getByRole("link", { name: "Striped Skins — просмотрщик" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.getByRole("button", { name: "2D", exact: true }).click();
  await page.getByLabel("Цвет кисти", { exact: true }).fill("#ff00ff");
  await tex(page).scrollIntoViewIfNeeded();
  await paint(page);
  await expect.poll(() => pixel(page)).toEqual([255, 0, 255, 255]);
  await page.getByLabel("Раса", { exact: true }).selectOption("KIRIN");
  await expect(page.getByLabel("Раса", { exact: true })).toHaveValue("KIRIN");
  await page.getByRole("button", { name: "Открыть", exact: true }).click();
  await page.getByRole("button", { name: "По ссылке", exact: true }).click();
  await expect(page.getByLabel("Ссылка на скин")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

test("original Figma UI assets load locally at their intended dimensions", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (r) => requests.push(r.url()));
  await enter(page);
  const images = await page.locator('img[src^="/design/"]').evaluateAll((imgs) =>
    imgs.map((node) => {
      const i = node as HTMLImageElement;
      return {
        src: i.getAttribute("src")!,
        ok: i.complete && i.naturalWidth > 0,
        w: i.getBoundingClientRect().width,
        h: i.getBoundingClientRect().height,
      };
    }),
  );
  expect(images.length).toBeGreaterThan(10);
  for (const image of images) {
    expect(image.ok, image.src).toBe(true);
    const expected = image.src.endsWith("brand.svg") ? 18 : image.src.endsWith("eye.svg") ? 16 : 20;
    expect(image.w, image.src).toBe(expected);
    expect(image.h, image.src).toBe(expected);
  }
  expect(requests.some((url) => url.includes("figma.com/api/mcp/asset"))).toBe(false);
  expect(await page.evaluate(() => document.fonts.check('13px "Inter"'))).toBe(true);
});

test("3D brush in the redesigned workspace edits the shared texture and remains undoable", async ({
  page,
}) => {
  await enter(page);
  await page.getByLabel("Цвет кисти", { exact: true }).fill("#ff00ff");
  const before = await tex(page).evaluate((c) =>
    Array.from((c as HTMLCanvasElement).getContext("2d")!.getImageData(0, 0, 64, 64).data),
  );
  const point = await page
    .locator('section[aria-label="Предпросмотр модели"] canvas')
    .evaluate((c) => {
      const canvas = c as HTMLCanvasElement,
        gl = canvas.getContext("webgl2")!,
        data = new Uint8Array(canvas.width * canvas.height * 4);
      gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, data);
      const r = canvas.getBoundingClientRect();
      for (let y = Math.floor(canvas.height * 0.25); y < canvas.height * 0.75; y += 5)
        for (let x = Math.floor(canvas.width * 0.25); x < canvas.width * 0.75; x += 5)
          if (data[((canvas.height - 1 - y) * canvas.width + x) * 4 + 3] > 250)
            return {
              x: r.x + (x * r.width) / canvas.width,
              y: r.y + (y * r.height) / canvas.height,
            };
      throw new Error("No visible model surface");
    });
  await page.getByRole("button", { name: "Режим: вращение", exact: true }).click();
  await page.mouse.click(point.x, point.y);
  await expect(page.getByTestId("document-status")).not.toHaveAttribute("data-pixel", "");
  const [x, y] = (await page.getByTestId("document-status").getAttribute("data-pixel"))!
    .split(",")
    .map(Number);
  await expect.poll(() => pixel(page, x, y)).toEqual([255, 0, 255, 255]);
  await page.keyboard.press("Control+z");
  await expect
    .poll(() => pixel(page, x, y))
    .toEqual(before.slice((y * 64 + x) * 4, (y * 64 + x) * 4 + 4));
});
