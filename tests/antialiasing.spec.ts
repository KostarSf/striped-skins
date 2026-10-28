import { expect, test } from "@playwright/test";

for (const { name, userAgent, initial, selected, width } of [
  {
    name: "desktop UA in a narrow window",
    userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/156.0.0.0 Safari/537.36",
    initial: "smaa",
    selected: "msaa",
    width: 390,
  },
  {
    name: "iPhone UA in a wide window",
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1",
    initial: "msaa",
    selected: "smaa",
    width: 1280,
  },
  {
    name: "Android phone UA",
    userAgent:
      "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/156.0.0.0 Mobile Safari/537.36",
    initial: "msaa",
    selected: "off",
    width: 390,
  },
]) {
  test.describe(name, () => {
    test.use({ userAgent, viewport: { width, height: 844 } });
    test("UA chooses the first AA mode; an explicit selection persists after reload", async ({
      page,
    }) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.addInitScript(() => localStorage.setItem("viewer.options.animations", ""));
      await page.goto("/");
      const canvas = page.locator(".model-viewport canvas");
      await expect(canvas).toHaveAttribute("data-engine", /^three.js/);
      await canvas.screenshot();
      await page.locator(".view-options summary").click();
      const aa = page.getByLabel("Сглаживание", { exact: true });
      await expect(aa).toHaveValue(initial);
      expect(
        await canvas.evaluate(
          (c) => (c as HTMLCanvasElement).getContext("webgl2")!.getContextAttributes()!.antialias,
        ),
      ).toBe(initial === "msaa");
      await aa.selectOption(selected);
      await page.reload();
      await expect(canvas).toHaveAttribute("data-engine", /^three.js/);
      await canvas.screenshot();
      await page.locator(".view-options summary").click();
      await expect(aa).toHaveValue(selected);
      expect(
        await canvas.evaluate(
          (c) => (c as HTMLCanvasElement).getContext("webgl2")!.getContextAttributes()!.antialias,
        ),
      ).toBe(selected === "msaa");
      expect(errors).toEqual([]);
    });
  });
}
