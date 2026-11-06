import { test, expect, type Page } from "@playwright/test";

test.use({ viewport: { width: 1440, height: 1000 } });
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Редактировать", exact: true }).click();
  await expect(page.getByTestId("skin-texture")).toBeVisible();
  await page.getByRole("button", { name: "Прямоугольное выделение · M", exact: true }).click();
  await page.getByTestId("skin-texture").screenshot();
});
async function drag(page: Page, x: number, y: number, right = x + 3, bottom = y + 3) {
  const box = (await page.getByTestId("skin-texture").boundingBox())!;
  const point = (x: number, y: number) =>
    [box.x + ((x + 0.5) * box.width) / 64, box.y + ((y + 0.5) * box.height) / 64] as const;
  await page.mouse.move(...point(x, y));
  await page.mouse.down();
  await page.mouse.move(...point(right, bottom), { steps: 3 });
}
const path = (page: Page) => page.getByTestId("selection-outline").locator("path").first();

test("top toolbar follows the active tool and cursor follows select and keyboard modifiers", async ({
  page,
}) => {
  const toolbar = page.getByRole("toolbar", { name: "Настройки инструментов" });
  const select = toolbar.getByRole("combobox", { name: "Режим выделения" });
  await expect(select).toBeVisible();
  await expect(toolbar.getByLabel("Размер кисти", { exact: true })).toHaveCount(0);
  const area = page.locator(".texture-area");
  const cursors = new Set<string>();
  for (const mode of ["replace", "add", "subtract", "difference"]) {
    await select.selectOption(mode);
    await expect(area).toHaveAttribute("data-selection-mode", mode);
    cursors.add(await area.evaluate((el) => getComputedStyle(el).cursor));
  }
  expect(cursors.size).toBe(4);
  await select.selectOption("replace");
  await page.getByTestId("skin-texture").click();
  const cursor = await area.evaluate((el) => getComputedStyle(el).cursor);
  await page.keyboard.down("Shift");
  await expect(area).toHaveAttribute("data-selection-mode", "add");
  await expect.poll(() => area.evaluate((el) => getComputedStyle(el).cursor)).not.toBe(cursor);
  await page.keyboard.down("Alt");
  await expect(area).toHaveAttribute("data-selection-mode", "difference");
  await page.keyboard.up("Shift");
  await expect(area).toHaveAttribute("data-selection-mode", "subtract");
  await page.keyboard.up("Alt");
  await expect(area).toHaveAttribute("data-selection-mode", "replace");
  await page.keyboard.down("Space");
  await expect(area).toHaveCSS("cursor", "grab");
  await page.keyboard.up("Space");
  await page.keyboard.press("b");
  await expect(toolbar.getByLabel("Размер кисти", { exact: true })).toBeVisible();
  await expect(select).toHaveCount(0);
});

test("draft and committed contours animate; all modifiers and clearing undo in order", async ({
  page,
}, testInfo) => {
  await drag(page, 8, 8);
  const draft = page.getByTestId("selection-draft");
  await expect(draft.locator(".selection-outline-ants")).toHaveCSS(
    "animation-name",
    "selection-march",
  );
  await expect(draft.locator(".selection-outline-dark")).toHaveCSS("stroke", "rgb(16, 16, 20)");
  await page.mouse.up();
  const first = await path(page).getAttribute("d");
  await expect(page.locator("canvas.texture-selection")).toHaveCount(0);
  await expect(path(page)).toHaveCSS("fill", "none");
  const ants = page.getByTestId("selection-outline").locator(".selection-outline-ants");
  await page.screenshot({ path: testInfo.outputPath("selection-editor.png") });
  const offset = await ants.evaluate((el) => getComputedStyle(el).strokeDashoffset);
  await expect
    .poll(() => ants.evaluate((el) => getComputedStyle(el).strokeDashoffset))
    .not.toBe(offset);
  const states = [first];
  for (const [modifier, region] of [
    ["Shift", [10, 10, 15, 15]],
    ["Alt", [9, 9, 10, 10]],
    ["Shift+Alt", [8, 8, 9, 9]],
  ] as const) {
    for (const key of modifier.split("+")) await page.keyboard.down(key);
    await drag(page, region[0], region[1], region[2], region[3]);
    await page.mouse.up();
    for (const key of modifier.split("+").reverse()) await page.keyboard.up(key);
    states.push(await path(page).getAttribute("d"));
    expect(states.at(-1)).not.toBe(states.at(-2));
  }
  await page.keyboard.press("Control+d");
  await expect(page.getByTestId("texture-selection")).toHaveCount(0);
  for (const state of states.slice().reverse()) {
    await page.keyboard.press("Control+z");
    await expect(path(page)).toHaveAttribute("d", state!);
  }
  await page.keyboard.press("Control+z");
  await expect(page.getByTestId("texture-selection")).toHaveCount(0);
  await page.keyboard.press("Control+Shift+z");
  await expect(path(page)).toHaveAttribute("d", first!);
  await expect(page.getByRole("button", { name: /Изменение выделения/ }).first()).toBeVisible();
});

test("outside click clears and can be undone; right-click pan and cancelled selection preserve it", async ({
  page,
}) => {
  await drag(page, 8, 8);
  await page.mouse.up();
  const first = await path(page).getAttribute("d");
  const box = (await page.locator(".texture-area").boundingBox())!;
  await page.mouse.click(box.x + 5, box.y + box.height / 2, { button: "right" });
  await expect(path(page)).toHaveAttribute("d", first!);
  await drag(page, 20, 20);
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await expect(path(page)).toHaveAttribute("d", first!);
  await page.mouse.click(box.x + 5, box.y + box.height / 2);
  await expect(page.getByTestId("texture-selection")).toHaveCount(0);
  await page.keyboard.press("Control+z");
  await expect(path(page)).toHaveAttribute("d", first!);
  await page.reload();
  await expect(path(page)).toHaveAttribute("d", first!);
});

test("selection history survives sharded recovery after a large resize", async ({ page }) => {
  await drag(page, 8, 8);
  await page.mouse.up();
  const first = await path(page).getAttribute("d");
  await page.getByRole("tab", { name: "Параметры скина", exact: true }).click();
  await page.getByLabel("Разрешение скина", { exact: true }).selectOption("1024");
  await expect(page.getByTestId("skin-texture")).toHaveCount(0);
  await page.getByLabel("Разрешение скина", { exact: true }).selectOption("64");
  await expect(page.getByTestId("skin-texture")).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          new Promise<number | undefined>((resolve, reject) => {
            const request = indexedDB.open("striped.editor", 1);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
              const db = request.result;
              const transaction = db.transaction("documents", "readonly");
              const saved = transaction.objectStore("documents").get("session");
              transaction.oncomplete = () => {
                resolve(saved.result?.first?.document.width);
                db.close();
              };
            };
          }),
      ),
    )
    .toBe(64);
  await page.reload();
  await expect(page.getByTestId("skin-texture")).toBeVisible();
  await page.locator(".texture-area").click({ position: { x: 5, y: 250 } });
  await page.keyboard.press("Control+z");
  await expect(page.getByTestId("skin-texture")).toHaveCount(0);
  await page.keyboard.press("Control+z");
  await expect(path(page)).toHaveAttribute("d", first!);
  await expect(page.locator(".recovery-warning")).toHaveCount(0);
});

test("changing a modifier during a drag matches the cursor and committed operation", async ({
  page,
}) => {
  await drag(page, 8, 8);
  await page.mouse.up();
  const first = await path(page).getAttribute("d");
  await drag(page, 20, 20);
  await page.keyboard.down("Shift");
  await expect(page.locator(".texture-area")).toHaveAttribute("data-selection-mode", "add");
  await page.mouse.up();
  await page.keyboard.up("Shift");
  await expect(path(page)).toHaveAttribute("d", /M8 8H12/);
  await expect(path(page)).toHaveAttribute("d", /M20 20H24/);
  await page.keyboard.press("Control+z");
  await expect(path(page)).toHaveAttribute("d", first!);
});
