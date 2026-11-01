import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { decodeSkinProject } from "@striped-skins/api";

test("SSR negotiates the complete language list and isolates concurrent requests", async ({
  request,
}) => {
  const languages = [
    ["ru-RU,ru;q=0.9,en;q=0.8", "ru", "Загрузка редактора"],
    ["en-US,en;q=0.9,ru;q=0.8", "en", "Loading editor"],
    ["de-DE,ru;q=0.8,en;q=0.7", "ru", "Загрузка редактора"],
    ["fr-FR", "en", "Loading editor"],
    ["ru;q=0,en;q=0.5", "en", "Loading editor"],
  ];
  await Promise.all(
    languages.map(async ([header, locale, loading]) => {
      const response = await request.get("/editor?lng=ru", {
        headers: { "Accept-Language": header, Cookie: "lng=ru; i18next=ru" },
      });
      expect(response.status()).toBe(200);
      expect(response.headers()["content-language"]).toBe(locale);
      expect(response.headers().vary).toMatch(/Accept-Language/i);
      expect(response.headers()["set-cookie"]).toBeUndefined();
      const html = await response.text();
      expect(html).toContain(`<html lang="${locale}">`);
      expect(html).toContain(loading);
      expect(html).toContain(
        locale === "ru"
          ? "Просматривайте, сравнивайте и редактируйте скины"
          : "View, compare and edit Mine Little Pony skins.",
      );
    }),
  );
});

test("saved preference overrides browser language on SSR and automatic removes it", async ({
  request,
}) => {
  const saved = await request.post("/", { form: { intent: "language", language: "en" } });
  expect(saved.status()).toBe(200);
  expect(saved.headers()["set-cookie"]).toMatch(/striped-skins-language=.*Max-Age=31536000/i);
  expect(saved.headers()["set-cookie"]).toMatch(/HttpOnly/i);
  const explicit = await request.get("/editor", { headers: { "Accept-Language": "ru-RU" } });
  expect(explicit.headers()["content-language"]).toBe("en");
  expect(explicit.headers().vary).toMatch(/Cookie/i);
  expect(await explicit.text()).toContain('<html lang="en">');
  const invalid = await request.post("/", { form: { intent: "language", language: "de" } });
  expect(invalid.status()).toBe(400);
  expect(invalid.headers()["set-cookie"]).toBeUndefined();
  const automatic = await request.post("/", { form: { intent: "language", language: "auto" } });
  expect(automatic.headers()["set-cookie"]).toMatch(/Max-Age=0/i);
  const detected = await request.get("/editor", { headers: { "Accept-Language": "ru-RU" } });
  expect(await detected.text()).toContain('<html lang="ru">');
  const malformed = await request.get("/editor", {
    headers: {
      "Accept-Language": "en-US",
      Cookie: "striped-skins-language=invalid",
    },
  });
  expect(malformed.status()).toBe(200);
  expect(malformed.headers()["content-language"]).toBe("en");
});

for (const locale of ["en-US", "ru-RU"] as const) {
  test.describe(locale, () => {
    test.use({ locale, viewport: { width: 1280, height: 900 } });
    const en = locale === "en-US";
    test("View language preference switches in place, persists and can return to automatic", async ({
      page,
      context,
    }, testInfo) => {
      page.on("dialog", (dialog) => void dialog.accept());
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });
      await page.goto("/editor");
      await expect(page.getByTestId("skin-texture")).toBeVisible();
      await page
        .getByRole("button", { name: en ? "New layer" : "Новый слой", exact: true })
        .click();
      await page
        .getByLabel(en ? "Layer name" : "Имя слоя", { exact: true })
        .fill("My пользовательский слой");
      await page.getByLabel(en ? "Layer name" : "Имя слоя", { exact: true }).press("Enter");
      const revision = await page.getByTestId("document-status").getAttribute("data-revision");
      const pixels = await page
        .getByTestId("skin-texture")
        .evaluate((canvas) => (canvas as HTMLCanvasElement).toDataURL());
      await page
        .getByTestId("skin-texture")
        .evaluate((canvas) => canvas.setAttribute("data-language-test", "same-canvas"));
      await page.locator(".view-options > summary").click();
      const select = page.locator('.view-options select[name="language"]');
      await expect(select).toHaveValue("auto");
      await select.selectOption(en ? "ru" : "en");
      await expect(page.locator("html")).toHaveAttribute("lang", en ? "ru" : "en");
      await expect(select).toHaveValue(en ? "ru" : "en");
      await expect(page.getByTestId("skin-texture")).toHaveAttribute(
        "data-language-test",
        "same-canvas",
      );
      await expect(page.getByTestId("document-status")).toHaveAttribute("data-revision", revision!);
      expect(
        await page
          .getByTestId("skin-texture")
          .evaluate((canvas) => (canvas as HTMLCanvasElement).toDataURL()),
      ).toBe(pixels);
      await expect(page.getByLabel(en ? "Имя слоя" : "Layer name", { exact: true })).toHaveValue(
        "My пользовательский слой",
      );
      await expect(page).toHaveTitle(en ? /просмотрщик и редактор/ : /skin viewer and editor/);
      const cookie = (await context.cookies()).find(
        (entry) => entry.name === "striped-skins-language",
      )!;
      expect(cookie.httpOnly).toBe(true);
      expect(cookie.expires).toBeGreaterThan(Date.now() / 1000 + 300 * 86400);
      await expect(page.getByTestId("autosave-status")).toHaveCount(0);
      await page.reload();
      await expect(page.getByLabel(en ? "Имя слоя" : "Layer name", { exact: true })).toHaveValue(
        "My пользовательский слой",
      );
      await expect(page.locator("html")).toHaveAttribute("lang", en ? "ru" : "en");
      await page.locator(".studio-brand").click();
      await expect(page.locator(".viewer-content canvas")).toBeVisible();
      await page.locator(".view-options > summary").click();
      await expect(select).toHaveValue(en ? "ru" : "en");
      await page.setViewportSize({ width: 390, height: 844 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
        false,
      );
      await page.screenshot({ path: testInfo.outputPath(`${locale}-language-setting.png`) });
      await select.selectOption("auto");
      await expect(page.locator("html")).toHaveAttribute("lang", en ? "en" : "ru");
      await expect(select).toHaveValue("auto");
      expect(
        (await context.cookies()).some((entry) => entry.name === "striped-skins-language"),
      ).toBe(false);
      await page.reload();
      await expect(page.locator("html")).toHaveAttribute("lang", en ? "en" : "ru");
      expect(errors).toEqual([]);
    });
    test("viewer, editor, errors and project history use the detected language without saving it", async ({
      page,
      context,
    }, testInfo) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });
      page.on("dialog", (dialog) => void dialog.accept());
      await page.addInitScript(() => {
        localStorage.setItem("viewer.options.animations", "");
        localStorage.setItem("viewer.options.smoothCamera", "");
        localStorage.setItem("viewer.options.antialiasing", "off");
      });
      await page.goto("/");
      await expect(page.locator("html")).toHaveAttribute("lang", en ? "en" : "ru");
      await expect(page.locator(".model-viewport canvas")).toBeVisible();
      await expect(
        page.getByRole("button", { name: en ? "Open" : "Открыть", exact: true }),
      ).toBeVisible();
      await page.getByRole("link", { name: en ? "Edit" : "Редактировать", exact: true }).click();
      await expect(page.getByTestId("skin-texture")).toBeVisible();
      await expect(page.getByLabel(en ? "Layer name" : "Имя слоя", { exact: true })).toHaveValue(
        en ? "Base" : "Основа",
      );
      await page
        .getByRole("button", { name: en ? "New layer" : "Новый слой", exact: true })
        .click();
      await expect(page.locator(".history-panel")).toContainText(
        en ? "Create layer" : "Создание слоя",
      );
      const name = page.getByLabel(en ? "Layer name" : "Имя слоя", { exact: true });
      await name.fill("Мой layer");
      await name.press("Enter");
      await page
        .getByRole("button", { name: en ? "Brush color" : "Цвет кисти", exact: true })
        .click();
      await expect(
        page.getByRole("dialog", {
          name: en ? "Color picker: Brush color" : "Выбор цвета: Цвет кисти",
          exact: true,
        }),
      ).toBeVisible();
      await page
        .getByRole("button", {
          name: en ? "Close color picker" : "Закрыть выбор цвета",
          exact: true,
        })
        .click();
      await page.screenshot({ path: testInfo.outputPath(`${locale}-editor.png`) });
      const pending = page.waitForEvent("download");
      await page
        .getByRole("button", { name: en ? "Save project" : "Сохранить проект", exact: true })
        .click();
      const download = await pending;
      const bytes = await readFile((await download.path())!);
      const saved = decodeSkinProject(bytes);
      expect(saved.activeLayer.name).toBe("Мой layer");
      expect(saved.history).toContain("history.createLayer");

      // A project made in one locale preserves user names and translates its history in the other.
      const otherContext = await page
        .context()
        .browser()!
        .newContext({
          locale: en ? "ru-RU" : "en-US",
          viewport: { width: 1280, height: 900 },
        });
      try {
        const other = await otherContext.newPage();
        await other.goto(`${testInfo.project.use.baseURL}/editor`);
        await expect(other.getByTestId("skin-texture")).toBeVisible();
        await other.getByRole("button", { name: en ? "Открыть" : "Open", exact: true }).click();
        await other
          .locator('input[type="file"]')
          .setInputFiles({ name: "saved.striped", mimeType: "application/zip", buffer: bytes });
        await expect(other.getByLabel(en ? "Имя слоя" : "Layer name", { exact: true })).toHaveValue(
          "Мой layer",
        );
        await expect(other.locator(".history-panel")).toContainText(
          en ? "Создание слоя" : "Create layer",
        );
      } finally {
        await otherContext.close();
      }

      await page.getByRole("button", { name: en ? "Open" : "Открыть", exact: true }).click();
      await page.locator('input[type="file"]').setInputFiles({
        name: "invalid.striped",
        mimeType: "application/zip",
        buffer: Buffer.from("invalid archive"),
      });
      await expect(page.getByRole("alert")).toContainText(
        en ? "Could not complete the operation" : "Не удалось выполнить операцию",
      );
      await page
        .getByRole("button", { name: en ? "Close import" : "Закрыть импорт", exact: true })
        .click();
      await page.reload();
      await expect(page.getByLabel(en ? "Layer name" : "Имя слоя", { exact: true })).toHaveValue(
        "Мой layer",
      );
      await page.setViewportSize({ width: 390, height: 844 });
      await expect(page.locator(".mobile-editor-footer")).toBeVisible();
      await page
        .getByRole("button", {
          name: en ? "Document settings" : "Параметры документа",
          exact: true,
        })
        .click();
      await expect(
        page.getByRole("button", { name: en ? "New layer" : "Новый слой", exact: true }),
      ).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
        false,
      );
      await page.screenshot({ path: testInfo.outputPath(`${locale}-mobile.png`) });
      expect(
        await page.evaluate(() =>
          Object.keys(localStorage).filter((key) => /i18next|locale|language|^lng$/i.test(key)),
        ),
      ).toEqual([]);
      expect(
        (await context.cookies()).filter((cookie) =>
          /i18next|locale|language|^lng$/i.test(cookie.name),
        ),
      ).toEqual([]);
      expect(errors).toEqual([]);
    });
  });
}
