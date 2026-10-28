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

  await page.getByRole("button", { name: "Сравнить скины", exact: true }).click();
  await expect(page.getByRole("button", { name: "Скин 2", exact: true })).toBeVisible();
  await expect.poll(image).not.toBe(single);
  await page.waitForTimeout(500);
  const comparison = await image();

  await page.getByRole("button", { name: "Сравнить скины", exact: true }).click();
  await expect(page.getByRole("button", { name: "Скин 2", exact: true })).toHaveCount(0);
  await expect.poll(image).not.toBe(comparison);
});

test("changing the first skin preserves an explicit exit from comparison mode", async ({
  page,
}) => {
  await page.goto("/?skin=/steve_pony.png&second-skin=/steve_pony.png");
  await waitForSkin(page);
  await expect(page.getByRole("button", { name: "Скин 2", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Сравнить скины", exact: true }).click();
  await expect(page.getByRole("button", { name: "Скин 2", exact: true })).toHaveCount(0);

  await page.getByRole("button", { name: "Открыть", exact: true }).click();
  await page.getByRole("button", { name: "Использовать пример скина" }).click();
  await expect(page).not.toHaveURL(/[?&]skin=/);
  await expect(page.getByRole("button", { name: "Скин 2", exact: true })).toHaveCount(0);
  const firstSkin = "http://127.0.0.1:3100/steve_pony.png";
  await openURL(page, firstSkin);
  await expect(page).toHaveURL(new RegExp("[?&]skin="));
  await waitForSkin(page);
  await expect(page.getByRole("button", { name: "Скин 2", exact: true })).toHaveCount(0);
  expect(new URL(page.url()).searchParams.get("second-skin")).toBe("/steve_pony.png");
});

test("signed skin URLs retain every query parameter on submit and reload", async ({
  page,
  baseURL,
}) => {
  const firstSkin = `${baseURL}/steve_pony.png?ex=6ae05cc7&is=6adf0b47&hm=first+signature%2F%3D`;
  const secondSkin = `${baseURL}/steve_pony.png?ex=6ae05cc7&is=6adf0b47&hm=second%26signature`;
  let proxyRequests: URL[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname === "/skin-proxy") proxyRequests.push(url);
  });

  await page.goto("/");
  await waitForSkin(page);
  await openURL(page, firstSkin);
  await expect
    .poll(() => proxyRequests.map((url) => url.searchParams.get("url")))
    .toContain(firstSkin);
  await waitForSkin(page);

  await page.getByRole("button", { name: "Сравнить скины", exact: true }).click();
  await expect(page.getByRole("button", { name: "Скин 2", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Скин 2", exact: true }).click();
  await openURL(page, secondSkin);
  await expect
    .poll(() => proxyRequests.map((url) => url.searchParams.get("url")))
    .toContain(secondSkin);
  await waitForSkin(page);

  const query = new URL(page.url()).searchParams;
  expect(query.get("skin")).toBe(firstSkin);
  expect(query.get("second-skin")).toBe(secondSkin);

  proxyRequests = [];
  // This case verifies URL decoding on a fresh load; editor restoration has a separate test.
  await page.addInitScript(() => {
    localStorage.removeItem("striped.editor.documents.v1");
    indexedDB.deleteDatabase("striped.editor");
  });
  await page.reload();
  await expect
    .poll(() => proxyRequests.map((url) => url.searchParams.get("url")))
    .toEqual(expect.arrayContaining([firstSkin, secondSkin]));
  await waitForSkin(page);
  for (const request of proxyRequests) {
    expect([...request.searchParams.keys()]).toEqual(["url"]);
    expect([firstSkin, secondSkin]).toContain(request.searchParams.get("url"));
  }
});

async function openURL(page: Page, url: string) {
  await page.getByRole("button", { name: "Открыть", exact: true }).click();
  await page.getByLabel("Ссылка на скин").fill(url);
  await page.getByRole("button", { name: "Открыть по ссылке", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
}
