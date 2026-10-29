import { test, expect } from "@playwright/test";

test.use({ viewport: { width: 1440, height: 1000 } });
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("viewer.options.animations", "");
    localStorage.setItem("viewer.options.smoothCamera", "");
    localStorage.setItem("viewer.options.antialiasing", "off");
  });
});
for (const [path, mode] of [
  ["/", "viewer"],
  ["/editor", "editor"],
] as const) {
  test(`initial ${mode} skeleton is server-rendered, responsive, and matches the loaded panels`, async ({
    page,
    request,
  }) => {
    const html = await (await request.get(path)).text();
    expect(html).toContain('data-testid="studio-skeleton"');
    expect(html).toContain(`data-mode="${mode}"`);
    let release!: () => void;
    let held!: () => void;
    const blocked = new Promise<void>((resolve) => (held = resolve));
    const gate = new Promise<void>((resolve) => (release = resolve));
    await page.route("**/assets/Workspace.client-*.js", async (route) => {
      held();
      await gate;
      await route.continue();
    });
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await blocked;
    const skeleton = page.getByTestId("studio-skeleton");
    await expect(skeleton).toBeVisible();
    await expect(skeleton).toHaveAttribute("data-mode", mode);
    await expect(skeleton).toHaveAttribute("aria-busy", "true");
    await expect(skeleton.locator("canvas, svg, .skeleton-atlas")).toHaveCount(0);
    await expect(skeleton.locator('[data-skeleton-panel="model"]')).toBeVisible();
    if (mode === "editor") {
      await expect(skeleton.locator('[data-skeleton-panel="texture"]')).toBeVisible();
      await expect(skeleton.locator(".tool-rail")).toBeVisible();
      await expect(skeleton.locator(".palette-panel")).toBeVisible();
      await expect(skeleton.locator(".inspector")).toBeVisible();
    }
    // Let hydration replace its SSR fallback before recording the placeholder geometry.
    await skeleton.screenshot();
    const header = (await skeleton.locator(".studio-header").boundingBox())!;
    const panel = (await skeleton.locator('[data-skeleton-panel="model"]').boundingBox())!;
    await page.emulateMedia({ reducedMotion: "reduce" });
    expect(
      await skeleton
        .locator(".skeleton-bone")
        .first()
        .evaluate((e) => getComputedStyle(e).animationName),
    ).toBe("none");
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
      false,
    );
    await page.setViewportSize({ width: 1440, height: 1000 });
    release();
    await expect(page.locator(".model-viewport canvas")).toBeVisible();
    await expect(skeleton).toHaveCount(0);
    const actualHeader = (await page.locator(".studio-header").boundingBox())!;
    const actualPanel = (await page.locator(".model-viewport").boundingBox())!;
    for (const key of ["x", "y", "width", "height"] as const) {
      expect(Math.abs(actualHeader[key] - header[key])).toBeLessThanOrEqual(1);
      expect(Math.abs(actualPanel[key] - panel[key])).toBeLessThanOrEqual(1);
    }
  });
}

test("viewer to editor shows the destination skeleton while the route module is loading", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".model-viewport canvas")).toBeVisible();
  await expect(page.getByTestId("studio-skeleton")).toHaveCount(0);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  await page.route("**/assets/editor-*.js", async (route) => {
    await gate;
    await route.continue();
  });
  await page.getByRole("link", { name: "Редактировать", exact: true }).click();
  const skeleton = page.getByTestId("studio-skeleton");
  await expect(skeleton).toBeVisible();
  await expect(skeleton).toHaveAttribute("data-mode", "editor");
  await expect(page.locator(".studio-header")).toHaveCount(1);
  release();
  await expect(page.getByTestId("skin-texture")).toBeVisible();
  await expect(skeleton).toHaveCount(0);
});

test("lazy editor workspace keeps the real header and replaces the skeleton without losing the document", async ({
  page,
}) => {
  let release!: () => void;
  let held!: () => void;
  const blocked = new Promise<void>((resolve) => (held = resolve));
  const gate = new Promise<void>((resolve) => (release = resolve));
  // Intercept before loading the viewer, so module preloading cannot bypass the gate.
  await page.route("**/assets/EditorWorkspace-*.js", async (route) => {
    held();
    await gate;
    await route.continue();
  });
  await page.goto("/");
  await expect(page.locator(".model-viewport canvas")).toBeVisible();
  await expect(page.getByTestId("studio-skeleton")).toHaveCount(0);
  await page.getByRole("button", { name: "Параметры скина", exact: true }).click();
  await page.getByLabel("Раса", { exact: true }).selectOption("KIRIN");
  await page.getByRole("button", { name: "Закрыть параметры", exact: true }).click();
  await page.getByRole("link", { name: "Редактировать", exact: true }).click();
  await blocked;
  const skeleton = page.getByTestId("studio-skeleton");
  await expect(skeleton).toBeVisible();
  await expect(skeleton).toHaveAttribute("data-mode", "editor");
  await expect(page.locator(".studio-header")).toHaveCount(1);
  await expect(page.getByRole("link", { name: "Редактировать", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );
  const before = (await skeleton.locator('[data-skeleton-panel="model"]').boundingBox())!;
  release();
  await expect(page.getByTestId("skin-texture")).toBeVisible();
  await expect(skeleton).toHaveCount(0);
  await expect(page.getByLabel("Раса", { exact: true })).toHaveValue("KIRIN");
  await expect(page.getByText("Есть изменения", { exact: true })).toBeVisible();
  const after = (await page.locator(".model-viewport").boundingBox())!;
  expect(Math.abs(before.y - after.y)).toBeLessThanOrEqual(1);
  expect(Math.abs(before.height - after.height)).toBeLessThanOrEqual(1);
});

test("initial skin download keeps the layout skeleton until the document is available", async ({
  page,
}) => {
  let release!: () => void;
  let held!: () => void;
  const blocked = new Promise<void>((resolve) => (held = resolve));
  const gate = new Promise<void>((resolve) => (release = resolve));
  await page.route("**/steve_pony.png", async (route) => {
    held();
    await gate;
    await route.continue();
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await blocked;
  const skeleton = page.getByTestId("studio-skeleton");
  await expect(skeleton).toBeVisible();
  await expect(page.locator(".model-viewport canvas")).toHaveCount(0);
  release();
  await expect(page.locator(".model-viewport canvas")).toBeVisible();
  await expect(skeleton).toHaveCount(0);
});

test("viewer and editor share compact header sizing on phones, tablets and desktop", async ({
  page,
}) => {
  for (const width of [320, 390, 800, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    await expect(page.locator(".model-viewport canvas")).toBeVisible();
    const buttons = () =>
      page.locator(
        ".studio-header .mode-tabs a:visible, .studio-header .file-actions button:visible",
      );
    const checkButtons = async () => {
      const boxes = await Promise.all(
        (await buttons().all()).map((button) => button.boundingBox()),
      );
      for (const box of boxes) {
        expect(box!.width).toBe(boxes[0]!.width);
        expect(box!.height).toBe(36);
        expect(box!.y).toBe(boxes[0]!.y);
      }
    };
    await checkButtons();
    const viewer = (await page.locator(".studio-header").boundingBox())!;
    const brand = (await page.locator(".brand-mark").boundingBox())!;
    await expect(page.getByRole("button", { name: "Открыть", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Скачать PNG", exact: true })).toBeVisible();
    await page.getByRole("link", { name: "Редактировать", exact: true }).click();
    await expect(page.getByTestId("skin-texture")).toBeAttached();
    await checkButtons();
    const editor = (await page.locator(".studio-header").boundingBox())!;
    const editorBrand = (await page.locator(".brand-mark").boundingBox())!;
    expect(editor.height).toBe(viewer.height);
    expect(viewer.height).toBeLessThanOrEqual(60);
    expect(editorBrand).toEqual(brand);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
  }
});
