import { test, expect, type Page } from "@playwright/test";

test.use({ viewport: { width: 1600, height: 1000 } });
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("viewer.options.animations", "");
    localStorage.setItem("viewer.options.smoothCamera", "");
    if (localStorage.getItem("viewer.options.groundGrid") === null)
      localStorage.setItem("viewer.options.groundGrid", "");
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
  // Wait for a painted frame without creating the WebGL context ourselves.
  // Reading getContext('webgl2') before R3F initializes would silently enable default MSAA.
  await expect
    .poll(() =>
      page.locator('section[aria-label="Предпросмотр модели"] canvas').evaluate((c) => {
        const copy = document.createElement("canvas");
        copy.width = copy.height = 32;
        const ctx = copy.getContext("2d")!;
        ctx.drawImage(c as HTMLCanvasElement, 0, 0, 32, 32);
        return ctx.getImageData(0, 0, 32, 32).data.some((v, i) => i % 4 === 3 && v > 0);
      }),
    )
    .toBe(true);
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
  // The physical Z key must work with a Russian keyboard layout as well.
  await page
    .locator(".editor-workspace")
    .dispatchEvent("keydown", { key: "я", code: "KeyZ", ctrlKey: true });
  await expect.poll(() => pixel(page)).toEqual(initial);
  await page
    .locator(".editor-workspace")
    .dispatchEvent("keydown", { key: "Я", code: "KeyZ", ctrlKey: true, shiftKey: true });
  await expect.poll(() => pixel(page)).toEqual([255, 0, 255, 255]);
  await page.keyboard.press("Meta+z");
  await expect.poll(() => pixel(page)).toEqual(initial);
  await page.keyboard.press("Meta+Shift+z");
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

test("wheel zoom keeps the pixel under the cursor fixed after panning and at zoom limits", async ({
  page,
}) => {
  await enter(page);
  await page.getByRole("button", { name: "2D", exact: true }).click();
  await page.getByRole("button", { name: "Скрыть 3D-превью", exact: true }).click();
  const area = (await page.locator(".texture-area").boundingBox())!;
  const fitWidth = Math.min(area.width - 64, area.height - 112);
  await expect.poll(async () => (await tex(page).boundingBox())!.width).toBeCloseTo(fitWidth, 1);
  const beforePan = (await tex(page).boundingBox())!;
  const center = { x: area.x + area.width / 2, y: area.y + area.height / 2 };
  await page.mouse.move(center.x, center.y);
  await page.mouse.down({ button: "right" });
  await page.mouse.move(center.x + 41, center.y - 27);
  await page.mouse.up({ button: "right" });
  await expect
    .poll(async () => (await tex(page).boundingBox())!.x)
    .toBeCloseTo(beforePan.x + 41, 1);
  await expect
    .poll(async () => (await tex(page).boundingBox())!.y)
    .toBeCloseTo(beforePan.y - 27, 1);
  const initial = (await tex(page).boundingBox())!;
  const anchor = {
    x: Math.round(initial.x + initial.width * 0.23),
    y: Math.round(initial.y + initial.height * 0.67),
  };
  const position = async () => {
    const r = (await tex(page).boundingBox())!;
    return { x: (anchor.x - r.x) / r.width, y: (anchor.y - r.y) / r.height, width: r.width };
  };
  const expected = await position();
  await page.mouse.move(anchor.x, anchor.y);
  let zoom = 1;
  for (const delta of [-200, -500, -100000, -100000, 200, 100000, 100000]) {
    zoom = Math.max(0.15, Math.min(32, zoom * Math.exp(-delta * 0.002)));
    await page.mouse.wheel(0, delta);
    await expect.poll(async () => (await position()).width).toBeCloseTo(fitWidth * zoom, 1);
    const p = await position();
    expect(p.x).toBeCloseTo(expected.x, 3);
    expect(p.y).toBeCloseTo(expected.y, 3);
  }
});

test("X swaps primary and secondary colors; removing palette entries leaves document pixels unchanged", async ({
  page,
}) => {
  await enter(page);
  await page.getByLabel("Цвет кисти", { exact: true }).fill("#123456");
  await page.getByLabel("Дополнительный цвет", { exact: true }).fill("#abcdef");
  await page.getByRole("button", { name: "Добавить цвет в палитру", exact: true }).click();
  const pixels = await tex(page).evaluate((c) => (c as HTMLCanvasElement).toDataURL());
  await page.getByRole("button", { name: "Цвет #123456", exact: true }).hover();
  await page.getByRole("button", { name: "Удалить цвет #123456", exact: true }).click();
  await expect(page.getByRole("button", { name: "Цвет #123456", exact: true })).toHaveCount(0);
  // Auto-detected entries are removable too, without modifying the skin.
  const automatic = page.locator(".palette-swatch").first();
  const name = (await automatic.getAttribute("aria-label"))!.replace("Цвет ", "");
  await automatic.hover();
  await page.getByRole("button", { name: `Удалить цвет ${name}`, exact: true }).click();
  expect(await tex(page).evaluate((c) => (c as HTMLCanvasElement).toDataURL())).toBe(pixels);
  await expect(page.getByRole("button", { name: "Отменить штрих", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Добавить цвет в палитру", exact: true }).click();
  await expect(page.getByRole("button", { name: "Цвет #123456", exact: true })).toBeVisible();
  await page.keyboard.press("x");
  await expect(page.getByLabel("Цвет кисти", { exact: true })).toHaveValue("#abcdef");
  await expect(page.getByLabel("Дополнительный цвет", { exact: true })).toHaveValue("#123456");
  await paint(page);
  await expect.poll(() => pixel(page)).toEqual([171, 205, 239, 255]);
  await page.getByRole("button", { name: "Поменять цвета · X", exact: true }).click();
  await expect(page.getByLabel("Цвет кисти", { exact: true })).toHaveValue("#123456");
  await page.getByRole("textbox", { name: "HEX цвета кисти", exact: true }).focus();
  await page.keyboard.press("x");
  await expect(page.getByLabel("Цвет кисти", { exact: true })).toHaveValue("#123456");
});

async function opaquePoint(page: Page) {
  return page.locator('section[aria-label="Предпросмотр модели"] canvas').evaluate((c) => {
    const canvas = c as HTMLCanvasElement,
      gl = canvas.getContext("webgl2")!;
    const data = new Uint8Array(canvas.width * canvas.height * 4);
    gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, data);
    const r = canvas.getBoundingClientRect();
    for (let y = Math.floor(canvas.height * 0.3); y < canvas.height * 0.7; y += 5)
      for (let x = Math.floor(canvas.width * 0.3); x < canvas.width * 0.7; x += 5)
        if (data[((canvas.height - 1 - y) * canvas.width + x) * 4 + 3] > 250)
          return {
            x: r.x + ((x + 0.5) * r.width) / canvas.width,
            y: r.y + ((y + 0.5) * r.height) / canvas.height,
          };
    return null;
  });
}

test("3D hovering previews brush color and synchronizes UV face/pixel without changing the document", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await enter(page);
  await page.getByLabel("Цвет кисти", { exact: true }).fill("#ff00ff");
  const point = { x: 0, y: 0 };
  await expect
    .poll(async () => {
      const hit = await opaquePoint(page);
      if (hit) Object.assign(point, hit);
      return !!hit;
    })
    .toBe(true);
  const initial = await image(page);
  const pixels = await tex(page).evaluate((c) => (c as HTMLCanvasElement).toDataURL());
  const revision = await page.getByTestId("document-status").getAttribute("data-revision");
  await page.mouse.move(point.x, point.y);
  const uv = page.getByTestId("uv-hover");
  await expect(uv).toBeVisible();
  const coords = (await uv.getAttribute("data-pixel"))!;
  const [x, y] = coords.split(",").map(Number);
  await expect(uv.locator("rect").first()).toHaveAttribute("x", String(x));
  await expect(uv.locator("rect").first()).toHaveAttribute("y", String(y));
  await expect(uv.locator("polygon").first()).not.toHaveAttribute("points", "");
  // Rotation mode inspects UVs, but has no colored brush preview.
  expect(await image(page)).toBe(initial);
  await page.getByRole("button", { name: "Режим: вращение", exact: true }).click();
  await page.mouse.move(point.x, point.y);
  await expect(uv).toBeVisible();
  await expect.poll(() => image(page)).not.toBe(initial);
  expect(await tex(page).evaluate((c) => (c as HTMLCanvasElement).toDataURL())).toBe(pixels);
  await expect(page.getByTestId("document-status")).toHaveAttribute("data-revision", revision!);
  await expect(page.getByRole("button", { name: "Отменить штрих", exact: true })).toBeDisabled();
  // The same picker drives painting, so the pixel under the preview is exactly the painted pixel.
  await page.mouse.click(point.x, point.y);
  await expect(page.getByTestId("document-status")).toHaveAttribute("data-pixel", coords);
  await expect.poll(() => pixel(page, x, y)).toEqual([255, 0, 255, 255]);
  await page.mouse.move(5, 5);
  await expect(uv).toHaveCount(0);
  await page.keyboard.press("Control+z");
  expect(await tex(page).evaluate((c) => (c as HTMLCanvasElement).toDataURL())).toBe(pixels);
  await page.getByRole("button", { name: "UV", exact: true }).click();
  await page.mouse.move(point.x, point.y);
  await expect(uv).toHaveCount(0);
  // Restore UV borders before comparing with the original frame.
  await page.getByRole("button", { name: "UV", exact: true }).click();
  await page.keyboard.press("e");
  await expect.poll(() => image(page)).toBe(initial);
  await page.keyboard.press("i");
  await expect.poll(() => image(page)).toBe(initial);
  expect(errors).toEqual([]);
});

test("antialiasing uses screen-space SMAA with no MSAA and survives projection changes", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await enter(page, "/");
  const contextAA = () =>
    page
      .locator('section[aria-label="Предпросмотр модели"] canvas')
      .evaluate(
        (c) => (c as HTMLCanvasElement).getContext("webgl2")!.getContextAttributes()!.antialias,
      );
  expect(await contextAA()).toBe(false);
  const smooth = await image(page);
  await page.locator(".view-options summary").click();
  await page.getByRole("checkbox", { name: "Сглаживание", exact: true }).uncheck();
  await expect.poll(() => image(page)).not.toBe(smooth);
  const sharp = await image(page);
  await page.getByRole("checkbox", { name: "Сглаживание", exact: true }).check();
  await expect.poll(() => image(page)).not.toBe(sharp);
  expect(await contextAA()).toBe(false);
  await page.getByLabel("Ракурс модели").selectOption("orthographic");
  await expect.poll(() => image(page)).not.toBe(smooth);
  const ortho = await image(page);
  await page.getByRole("button", { name: "Приблизить модель", exact: true }).click();
  await expect.poll(() => image(page)).not.toBe(ortho);
  expect(errors).toEqual([]);
});

test("3D brush preview matches every shared UV target shown by the 2D brush", async ({ page }) => {
  await enter(page);
  await page.getByLabel("Цвет кисти", { exact: true }).fill("#ff00ff");
  await page.getByRole("button", { name: "Режим: вращение", exact: true }).click();
  await page.mouse.move(5, 5);
  const initial = await image(page);
  const rect = (await page.locator(".model-viewport canvas").boundingBox())!;
  // The folded wing reuses these atlas pixels on several quads.
  await page.mouse.move(rect.x + rect.width * 0.6, rect.y + rect.height * 0.5);
  const hover = page.getByTestId("uv-hover");
  await expect(hover).toHaveAttribute("data-surface", /wings\//);
  await expect.poll(() => image(page)).not.toBe(initial);
  await page.locator(".model-viewport canvas").screenshot();
  const from3D = await image(page);
  const [x, y] = (await hover.getAttribute("data-pixel"))!.split(",").map(Number);
  const pixels = await tex(page).evaluate((c) => (c as HTMLCanvasElement).toDataURL());
  const atlas = (await tex(page).boundingBox())!;
  await page.mouse.move(
    atlas.x + ((x + 0.5) * atlas.width) / 64,
    atlas.y + ((y + 0.5) * atlas.height) / 64,
  );
  await expect(hover).toHaveCount(0);
  await expect.poll(() => image(page)).toBe(from3D);
  expect(await tex(page).evaluate((c) => (c as HTMLCanvasElement).toDataURL())).toBe(pixels);
  await expect(page.getByRole("button", { name: "Отменить штрих", exact: true })).toBeDisabled();
});

test("ground grid toggles without changing camera scale and persists across modes and reload", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await enter(page, "/");
  const initial = await image(page);
  const scale = await page.getByTestId("model-scale").textContent();
  await page.locator(".view-options summary").click();
  await page.getByRole("checkbox", { name: "Сетка под моделью", exact: true }).check();
  await expect.poll(() => image(page)).not.toBe(initial);
  await expect(page.getByTestId("model-scale")).toHaveText(scale!);
  await page.getByRole("checkbox", { name: "Сетка под моделью", exact: true }).uncheck();
  await expect.poll(() => image(page)).toBe(initial);
  await page.getByRole("checkbox", { name: "Сетка под моделью", exact: true }).check();
  await page.keyboard.press("Escape");
  await page.getByRole("link", { name: "Редактировать", exact: true }).click();
  await expect(tex(page)).toBeVisible();
  await page.locator(".view-options summary").click();
  await expect(
    page.getByRole("checkbox", { name: "Сетка под моделью", exact: true }),
  ).toBeChecked();
  await page.reload();
  await expect(tex(page)).toBeVisible();
  await page.locator(".view-options summary").click();
  await expect(
    page.getByRole("checkbox", { name: "Сетка под моделью", exact: true }),
  ).toBeChecked();
  expect(errors).toEqual([]);
});

test("UV toggle controls the model's quad borders together with the atlas guides", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await enter(page);
  await page.mouse.move(5, 5);
  const initial = await image(page);
  const pixels = await tex(page).evaluate((c) => (c as HTMLCanvasElement).toDataURL());
  await page.getByRole("button", { name: "UV", exact: true }).click();
  await expect(page.locator(".texture-guides")).toHaveCount(0);
  await expect.poll(() => image(page)).not.toBe(initial);
  await page.getByRole("button", { name: "UV", exact: true }).click();
  await expect(page.locator(".texture-guides")).toBeVisible();
  await expect.poll(() => image(page)).toBe(initial);
  expect(await tex(page).evaluate((c) => (c as HTMLCanvasElement).toDataURL())).toBe(pixels);
  expect(errors).toEqual([]);
});

test("2D brush hover highlights the same 3D texel without painting, and clears on tool/pan/leave", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await enter(page);
  await page.getByLabel("Цвет кисти", { exact: true }).fill("#ff00ff");
  // Find a visible texel using the existing forward picker, then hover that texel in the atlas.
  await page.getByLabel("Цвет кисти", { exact: true }).blur();
  const point = { x: 0, y: 0 };
  await expect
    .poll(async () => {
      const p = await opaquePoint(page);
      if (p) Object.assign(point, p);
      return !!p;
    })
    .toBe(true);
  await page.mouse.move(point.x, point.y);
  await expect(page.getByTestId("uv-hover")).toBeVisible();
  const [x, y] = (await page.getByTestId("uv-hover").getAttribute("data-pixel"))!
    .split(",")
    .map(Number);
  await page.mouse.move(5, 5);
  await expect(page.getByTestId("uv-hover")).toHaveCount(0);
  const initial = await image(page);
  const pixels = await tex(page).evaluate((c) => (c as HTMLCanvasElement).toDataURL());
  const revision = await page.getByTestId("document-status").getAttribute("data-revision");
  const hoverPixel = async () => {
    const box = (await tex(page).boundingBox())!;
    await page.mouse.move(
      box.x + ((x + 0.5) * box.width) / 64,
      box.y + ((y + 0.5) * box.height) / 64,
    );
    await expect.poll(() => image(page)).not.toBe(initial);
  };
  await hoverPixel();
  expect(await tex(page).evaluate((c) => (c as HTMLCanvasElement).toDataURL())).toBe(pixels);
  await expect(page.getByTestId("document-status")).toHaveAttribute("data-revision", revision!);
  await expect(page.getByRole("button", { name: "Отменить штрих", exact: true })).toBeDisabled();
  await page.mouse.move(5, 5);
  await expect.poll(() => image(page)).toBe(initial);
  await hoverPixel();
  await page.keyboard.press("e");
  await expect.poll(() => image(page)).toBe(initial);
  await page.keyboard.press("b");
  await expect.poll(() => image(page)).not.toBe(initial);
  await page.keyboard.down("Space");
  await expect.poll(() => image(page)).toBe(initial);
  await page.keyboard.up("Space");
  await hoverPixel();
  await page.mouse.down({ button: "right" });
  await expect.poll(() => image(page)).toBe(initial);
  await page.mouse.up({ button: "right" });
  await page.mouse.move(5, 5);
  await page.getByRole("button", { name: "2D", exact: true }).click();
  await page.locator(".mini-preview canvas").screenshot();
  const miniInitial = await image(page);
  await hoverPixel();
  await expect.poll(() => image(page)).not.toBe(miniInitial);
  await page.mouse.move(5, 5);
  await expect.poll(() => image(page)).toBe(miniInitial);
  expect(errors).toEqual([]);
});

test("editor view options share preferences, tool order and smaller foreground secondary swatch", async ({
  page,
}) => {
  await enter(page);
  const rail = page.getByRole("complementary", { name: "Инструменты", exact: true });
  await expect(rail.getByRole("button").first()).toHaveAccessibleName("Перемещение · H");
  const primary = (await page.getByLabel("Цвет кисти", { exact: true }).boundingBox())!;
  const secondary = (await page.getByLabel("Дополнительный цвет", { exact: true }).boundingBox())!;
  expect(secondary.width).toBeLessThan(primary.width);
  expect(secondary.height).toBeLessThan(primary.height);
  expect(secondary.x).toBeLessThan(primary.x + primary.width);
  expect(secondary.y).toBeLessThan(primary.y + primary.height);
  expect(
    await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.getAttribute("aria-label"), {
      x: secondary.x + 3,
      y: secondary.y + 3,
    }),
  ).toBe("Дополнительный цвет");
  await expect(page.locator('img[src="/design/cube.svg"]')).toHaveCount(0);
  for (const footer of await page.locator(".viewport-footer").all()) {
    await expect(footer.locator(".camera-actions > .viewport-hint")).toBeVisible();
  }
  await page.locator(".view-options summary").click();
  await expect(page.getByRole("checkbox", { name: "Анимации", exact: true })).not.toBeChecked();
  await page.getByRole("checkbox", { name: "Сглаживание", exact: true }).uncheck();
  await page.getByRole("checkbox", { name: "Плавная камера", exact: true }).check();
  await page.keyboard.press("Escape");
  await expect(page.locator(".view-options")).not.toHaveAttribute("open", "");
  await page.getByRole("link", { name: "← Просмотрщик", exact: true }).click();
  await expect(tex(page)).toHaveCount(0);
  await page.locator(".view-options summary").click();
  await expect(page.getByRole("checkbox", { name: "Сглаживание", exact: true })).not.toBeChecked();
  await expect(page.getByRole("checkbox", { name: "Плавная камера", exact: true })).toBeChecked();
  await page.reload();
  await page.locator(".view-options summary").click();
  await expect(page.getByRole("checkbox", { name: "Сглаживание", exact: true })).not.toBeChecked();
});

test("mouse camera mapping works in rotation and brush modes without painting during navigation", async ({
  page,
}) => {
  await enter(page);
  const model = page.locator('section[aria-label="Предпросмотр модели"] canvas');
  const rect = (await model.boundingBox())!;
  const start = { x: rect.x + rect.width * 0.5, y: rect.y + rect.height * 0.5 };
  const drag = async (button: "left" | "middle" | "right") => {
    await page.mouse.move(start.x, start.y);
    await page.mouse.down({ button });
    await page.mouse.move(start.x + 60, start.y + 12, { steps: 8 });
    await page.mouse.up({ button });
    await page.mouse.move(5, 5);
    await model.screenshot();
  };
  const initial = await image(page);
  const rest = await coverage(page);
  const reset = async () => {
    await page.getByRole("button", { name: "Сброс вида", exact: true }).click();
    await expect
      .poll(async () => {
        const c = await coverage(page);
        return c.slice(0, 4).every((v, i) => Math.abs(v - rest[i]) <= 1);
      })
      .toBe(true);
  };
  await drag("left");
  await expect.poll(() => image(page)).not.toBe(initial);
  const left = await coverage(page);
  await reset();
  await drag("middle");
  const middle = await coverage(page);
  for (let i = 0; i < 4; i++) expect(Math.abs(left[i] - middle[i])).toBeLessThanOrEqual(1);
  await reset();
  const beforePan = await coverage(page);
  await drag("right");
  await expect
    .poll(async () => Math.abs((await coverage(page))[0] - beforePan[0]))
    .toBeGreaterThan(20);

  await page.getByRole("button", { name: "Режим: вращение", exact: true }).click();
  const revision = await page.getByTestId("document-status").getAttribute("data-revision");
  const pixels = await tex(page).evaluate((c) => (c as HTMLCanvasElement).toDataURL());
  for (const button of ["middle", "right"] as const) {
    const before = await image(page);
    await drag(button);
    await expect.poll(() => image(page)).not.toBe(before);
  }
  const beforeZoom = await coverage(page);
  await page.mouse.move(start.x, start.y);
  await page.mouse.wheel(0, -250);
  await page.mouse.move(5, 5);
  await expect
    .poll(async () => {
      const c = await coverage(page);
      return c[2] - c[0];
    })
    .toBeGreaterThan(beforeZoom[2] - beforeZoom[0] + 10);
  expect(await tex(page).evaluate((c) => (c as HTMLCanvasElement).toDataURL())).toBe(pixels);
  await expect(page.getByTestId("document-status")).toHaveAttribute("data-revision", revision!);
  await expect(page.getByRole("button", { name: "Отменить штрих", exact: true })).toBeDisabled();
  // Switching smoothness updates controls without issuing another reset command.
  const beforeOptions = await image(page);
  await page.locator(".view-options summary").click();
  await page.getByRole("checkbox", { name: "Плавная камера", exact: true }).check();
  await page.keyboard.press("Escape");
  expect(await image(page)).toBe(beforeOptions);
  await page.locator(".view-options summary").click();
  await page.getByRole("checkbox", { name: "Плавная камера", exact: true }).uncheck();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Сброс вида", exact: true }).click();
  await page.getByLabel("Ракурс модели").selectOption("orthographic");
  await model.screenshot();
  // Orthographic panning must translate the silhouette without rotating or scaling it.
  const orthoPan = await coverage(page);
  await drag("right");
  const afterOrthoPan = await coverage(page);
  expect(Math.abs(afterOrthoPan[0] - orthoPan[0])).toBeGreaterThan(20);
  expect(
    Math.abs(afterOrthoPan[2] - afterOrthoPan[0] - (orthoPan[2] - orthoPan[0])),
  ).toBeLessThanOrEqual(1);
  const beforeOrtho = await coverage(page);
  await page.mouse.move(start.x, start.y);
  await page.mouse.wheel(0, -150);
  await page.mouse.move(5, 5);
  await expect
    .poll(async () => {
      const c = await coverage(page);
      return c[2] - c[0];
    })
    .toBeGreaterThan(beforeOrtho[2] - beforeOrtho[0] + 10);
  // Left is still the paint action, not rotation.
  await page.getByRole("button", { name: "Сброс вида", exact: true }).click();
  const point = { x: 0, y: 0 };
  await expect
    .poll(async () => {
      const p = await opaquePoint(page);
      if (p) Object.assign(point, p);
      return !!p;
    })
    .toBe(true);
  await page.getByLabel("Цвет кисти", { exact: true }).fill("#ff00ff");
  await page.mouse.click(point.x, point.y);
  await expect(page.getByRole("button", { name: "Отменить штрих", exact: true })).toBeEnabled();
});

test("editor animation option animates the model and pauses it in brush mode", async ({ page }) => {
  await enter(page);
  await page.locator(".view-options summary").click();
  const before = await image(page);
  await page.getByRole("checkbox", { name: "Анимации", exact: true }).check();
  await expect.poll(() => image(page)).not.toBe(before);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Режим: вращение", exact: true }).click();
  await page.mouse.move(5, 5);
  await page.locator('section[aria-label="Предпросмотр модели"] canvas').screenshot();
  const paused = await image(page);
  await page.waitForTimeout(150);
  expect(await image(page)).toBe(paused);
});

test("viewport headings stay inside panels, texture covers the panel, and 3D reports its scale", async ({
  page,
}) => {
  await enter(page);
  const model = page.getByRole("region", { name: "Предпросмотр модели", exact: true });
  const label = page.getByTestId("model-scale");
  await expect(label).toHaveText("100%");
  await page.getByRole("button", { name: "Приблизить модель", exact: true }).click();
  await expect.poll(async () => parseInt((await label.textContent())!)).toBeGreaterThan(100);
  await page.getByRole("button", { name: "Сброс вида", exact: true }).click();
  await expect(label).toHaveText("100%");
  const canvas = page.locator('section[aria-label="Предпросмотр модели"] canvas');
  const canvasBox = (await canvas.boundingBox())!;
  await page.mouse.move(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height / 2);
  await page.keyboard.down("Control");
  await page.mouse.wheel(0, -100);
  await page.keyboard.up("Control");
  await expect.poll(async () => parseInt((await label.textContent())!)).toBeGreaterThan(100);
  await page.getByRole("button", { name: "Сброс вида", exact: true }).click();
  await expect(label).toHaveText("100%");
  await page.getByLabel("Ракурс модели").selectOption("orthographic");
  await page.locator('section[aria-label="Предпросмотр модели"] canvas').screenshot();
  await expect(label).toHaveText("100%");
  await page.getByRole("button", { name: "Приблизить модель", exact: true }).click();
  await expect(label).toHaveText("120%");
  for (const width of [1440, 1280, 1100, 960, 390]) {
    await page.setViewportSize({ width, height: 960 });
    await page.locator(".view-options summary").screenshot();
    const panel = (await model.boundingBox())!;
    const button = (await page.locator(".view-options summary").boundingBox())!;
    expect(button.x + button.width).toBeLessThanOrEqual(panel.x + panel.width - 8);
    expect(button.x).toBeGreaterThanOrEqual(panel.x + 8);
    const texturePanel = (await page
      .getByRole("region", { name: "Редактирование текстуры", exact: true })
      .boundingBox())!;
    const area = (await page.locator(".texture-area").boundingBox())!;
    expect(area.y).toBeCloseTo(texturePanel.y, 1);
    expect(area.height).toBeCloseTo(texturePanel.height, 1);
  }
});

test("viewer camera controls replace the title overlay and the view popup stays inside the panel", async ({
  page,
}) => {
  await enter(page, "/");
  const panel = page.getByRole("region", { name: "Предпросмотр модели", exact: true });
  await expect(panel.locator(".viewport-heading h2")).toHaveCount(0);
  await expect(panel.locator(".viewer-description")).toHaveCount(0);
  await expect(panel.getByText(/Minecraft 1\.20\.1/)).toHaveCount(0);
  for (const width of [1440, 700, 390]) {
    await page.setViewportSize({ width, height: 960 });
    await page.keyboard.press("Escape");
    await page.locator(".view-options summary").click();
    const host = (await panel.boundingBox())!;
    const projection = (await page.getByLabel("Ракурс модели").boundingBox())!;
    const popup = (await page.locator(".view-options > div").boundingBox())!;
    expect(projection.x - host.x).toBeLessThanOrEqual(24);
    expect(projection.y - host.y).toBeLessThanOrEqual(64);
    expect(popup.x).toBeGreaterThanOrEqual(host.x + 8);
    expect(popup.x + popup.width).toBeLessThanOrEqual(host.x + host.width - 8);
    await expect(page.getByRole("checkbox", { name: "Сглаживание", exact: true })).toBeVisible();
  }
});
