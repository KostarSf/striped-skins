import { test, expect } from "@playwright/test";

test("Back removes both skin URLs and restores default pixels in recovery", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("viewer.options.animations", ""));
  await page.goto("/");
  const savedPixel = (slot: "first" | "second") =>
    page.evaluate((slot) => {
      const saved = JSON.parse(localStorage.getItem("striped.editor.documents.v1") ?? "null");
      return (
        saved?.[slot]?.document.pixels.slice((12 * 64 + 12) * 4, (12 * 64 + 12) * 4 + 4) ?? null
      );
    }, slot);
  await expect.poll(() => savedPixel("first")).not.toBeNull();
  const firstDefault = await savedPixel("first");
  await expect.poll(() => savedPixel("second")).not.toBeNull();
  const secondDefault = await savedPixel("second");
  const png = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 64;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#123456";
    ctx.fillRect(0, 0, 64, 64);
    return canvas.toDataURL().split(",")[1];
  });
  await page.route("**/review-custom.png", (route) =>
    route.fulfill({ contentType: "image/png", body: Buffer.from(png, "base64") }),
  );
  await page.evaluate(() => {
    history.pushState(
      { ...history.state, idx: (history.state?.idx ?? 0) + 1 },
      "",
      "?skin=/review-custom.png&second-skin=/review-custom.png",
    );
    window.dispatchEvent(new PopStateEvent("popstate", { state: history.state }));
  });
  for (const slot of ["first", "second"] as const)
    await expect.poll(() => savedPixel(slot)).toEqual([18, 52, 86, 255]);
  await page.goBack();
  await expect(page).not.toHaveURL(/skin=/);
  await expect.poll(() => savedPixel("first")).toEqual(firstDefault);
  await expect.poll(() => savedPixel("second")).toEqual(secondDefault);
});
