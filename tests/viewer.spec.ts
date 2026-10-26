import { expect, test, type Page } from "@playwright/test";

async function waitForSkin(page: Page) {
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.locator(".loading-spinner:visible")).toHaveCount(0);
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("viewer.options.animations", "");
    localStorage.setItem("viewer.options.smoothCamera", "");
    // Preserve pixels for reading the actual WebGL image, without UI overlays.
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type, options) {
      return getContext.call(this, type, {
        ...options,
        ...(type.startsWith("webgl") ? { preserveDrawingBuffer: true } : {}),
      });
    } as typeof getContext;
  });
});

test("comparison changes the rendered image in both directions without touching the scene", async ({
  page,
}) => {
  await page.goto("/");
  await waitForSkin(page);
  const image = () =>
    page.locator("canvas").evaluate(async (canvas) => {
      const data = new TextEncoder().encode((canvas as HTMLCanvasElement).toDataURL());
      const digest = await crypto.subtle.digest("SHA-256", data);
      return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join(
        "",
      );
    });
  // Wait for the initial camera/texture updates to settle before sampling pixels.
  await page.waitForTimeout(500);
  const single = await image();

  await page.getByTitle("Comparison mode").click();
  await expect(page.locator("form")).toHaveCount(2);
  await expect.poll(image).not.toBe(single);
  await page.waitForTimeout(500);
  const comparison = await image();

  await page.getByTitle("Comparison mode").click();
  await expect(page.locator("form")).toHaveCount(1);
  await expect.poll(image).not.toBe(comparison);
});

test("changing the first skin preserves an explicit exit from comparison mode", async ({
  page,
}) => {
  await page.goto("/?skin=/steve_pony.png&second-skin=/steve_pony.png");
  await waitForSkin(page);
  await expect(page.locator("form")).toHaveCount(2);
  await page.getByTitle("Comparison mode").click();
  await expect(page.locator("form")).toHaveCount(1);

  await page.getByRole("button", { name: "clear", exact: true }).click();
  await expect(page).not.toHaveURL(/[?&]skin=/);
  await expect(page.locator("form")).toHaveCount(1);

  const firstSkin = "http://127.0.0.1:3100/steve_pony.png";
  const input = page.getByPlaceholder("paste link to skin...");
  await input.fill(firstSkin);
  await input.press("Enter");
  await expect(page).toHaveURL(new RegExp("[?&]skin="));
  await waitForSkin(page);
  await expect(page.locator("form")).toHaveCount(1);
  expect(new URL(page.url()).searchParams.get("second-skin")).toBe("/steve_pony.png");
});
