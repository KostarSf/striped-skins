import { expect, type Page } from "@playwright/test";

export async function setColor(page: Page, label: string, color: string) {
  await page.getByRole("button", { name: label, exact: true }).click();
  const popup = page.getByRole("dialog", { name: `Выбор цвета: ${label}`, exact: true });
  await popup.getByLabel("HEX выбранного цвета", { exact: true }).fill(color);
  await popup.getByRole("button", { name: "Закрыть выбор цвета", exact: true }).click();
  await expect(popup).not.toBeVisible();
}
