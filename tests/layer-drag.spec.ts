import { expect, test, type Locator, type Page } from "@playwright/test";
import { SkinDocument, encodeSkinProject, type LayerNode } from "@striped-skins/api";
import {
  layerRows,
  layerDropTarget,
  layerDropChangesOrder,
} from "../app/components/studio/layer-drag";

function node(
  id: string,
  parentId: string | null = null,
  kind: "layer" | "group" = "layer",
): LayerNode {
  return {
    id,
    name: id,
    parentId,
    kind,
    visible: true,
    locked: false,
    alphaLocked: false,
    opacity: 100,
  };
}

test("both sides of a visual gap give the same order, including adjacent and extreme moves", () => {
  const layers = [node("3"), node("2"), node("1")];
  const rows = layerRows(layers, []);
  const lowerHalf = layerDropTarget(layers, rows, "3", "2", "bottom", 80)!;
  expect(layerDropChangesOrder(layers, "3", lowerHalf)).toBe(false);
  const upperHalf = layerDropTarget(layers, rows, "3", "2", "top", 80)!;
  const previousBottom = layerDropTarget(layers, rows, "3", "1", "bottom", 80)!;
  expect(previousBottom).toMatchObject({
    parentId: upperHalf.parentId,
    beforeId: upperHalf.beforeId,
  });
  expect(upperHalf).toMatchObject({ parentId: null, beforeId: "1", anchorId: "2", edge: "top" });
  expect(layerDropChangesOrder(layers, "3", upperHalf)).toBe(true);
  expect(layerDropTarget(layers, rows, "3", "1", "top", 80)).toMatchObject({ beforeId: null });
  expect(layerDropTarget(layers, rows, "1", "3", "bottom", 80)).toMatchObject({ beforeId: "3" });
});

test("a visible source between remaining rows never shifts the hovered insertion line", () => {
  const layers = [node("4"), node("3"), node("2"), node("1")];
  const rows = layerRows(layers, []);
  const upward = layerDropTarget(layers, rows, "3", "2", "bottom", 80)!;
  expect(upward).toMatchObject({ beforeId: "2", anchorId: "2", edge: "bottom" });
  expect(layerDropChangesOrder(layers, "3", upward)).toBe(false);
  const downward = layerDropTarget(layers, rows, "2", "3", "top", 80)!;
  expect(downward).toMatchObject({ beforeId: "1", anchorId: "3", edge: "top" });
  expect(layerDropChangesOrder(layers, "2", downward)).toBe(false);

  const grouped = [node("4"), node("X", "G"), node("G", null, "group"), node("1")];
  expect(layerDropTarget(grouped, layerRows(grouped, []), "G", "1", "bottom", 80)).toMatchObject({
    beforeId: "1",
    anchorId: "1",
    edge: "bottom",
  });
});

test("horizontal position chooses root, group and nested group gaps without splitting subtrees", () => {
  const layers = [
    node("1"),
    node("G", null, "group"),
    node("A", "G"),
    node("H", "G", "group"),
    node("X", "H"),
    node("B", "G"),
    node("2"),
    node("3"),
  ].reverse();
  const rows = layerRows(layers, []);
  const target = (id: string, edge: "top" | "bottom", x: number) =>
    layerDropTarget(layers, rows, "3", id, edge, x);
  expect(target("B", "bottom", 4)).toMatchObject({ parentId: null, beforeId: "G", depth: 0 });
  expect(target("2", "top", 80)).toMatchObject({ parentId: "G", beforeId: "B", depth: 1 });
  expect(target("X", "bottom", 36)).toMatchObject({ parentId: "G", beforeId: "H", depth: 1 });
  expect(target("X", "bottom", 80)).toMatchObject({ parentId: "H", beforeId: "X", depth: 2 });
  expect(target("G", "bottom", 80)).toMatchObject({ parentId: "G", beforeId: null, depth: 1 });
  expect(target("G", "bottom", 4)).toMatchObject({ parentId: null, beforeId: "G", anchorId: "2" });
  expect(target("A", "top", 4)).toEqual(target("G", "bottom", 4));
  expect(layerDropTarget(layers, rows, "G", "X", "top", 80)).toBeNull();
  expect(layerDropTarget(layers, rows, "G", "G", "bottom", 80)).toBeNull();
  expect(layerDropTarget(layers, layerRows(layers, ["H"]), "3", "H", "bottom", 80)).toMatchObject({
    parentId: "H",
    beforeId: null,
    depth: 2,
  });
});

test.describe("layer dragging in the browser", () => {
  test.use({ viewport: { width: 1280, height: 900 } });
  test.beforeEach(async ({ page }) => {
    page.on("dialog", (dialog) => void dialog.accept());
    await page.addInitScript(() => {
      localStorage.setItem("viewer.options.animations", "");
      localStorage.setItem("viewer.options.smoothCamera", "");
      localStorage.setItem("viewer.options.antialiasing", "off");
    });
    await page.goto("/editor");
    await expect(page.getByTestId("skin-texture")).toBeAttached();
  });

  async function open(page: Page, document: SkinDocument) {
    await page.getByRole("button", { name: "Открыть", exact: true }).click();
    await page.getByLabel("Открыть PNG", { exact: true }).setInputFiles({
      name: "drag.striped",
      mimeType: "application/zip",
      buffer: Buffer.from(encodeSkinProject(document)),
    });
  }
  const row = (page: Page, name: string) =>
    page.getByTestId("layer-row").filter({
      has: page.getByRole("button", { name: `Выбрать слой ${name}`, exact: true }),
    });
  const names = (page: Page) => page.locator(".layer-name").allTextContents();
  async function beginDrag(page: Page, source: Locator) {
    const box = (await source.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 10, box.y + box.height / 2, { steps: 5 });
  }
  async function hover(page: Page, target: Locator, half: "top" | "bottom", x: number) {
    const box = (await target.boundingBox())!;
    // A second move also exercises native HTML dragover after dragenter.
    await page.mouse.move(box.x + x, box.y + box.height * (half === "top" ? 0.25 : 0.75), {
      steps: 4,
    });
    await page.mouse.move(box.x + x + 1, box.y + box.height * (half === "top" ? 0.25 : 0.75));
  }

  test("insertion preview tracks row halves, adjacent moves, undo and cancellation", async ({
    page,
  }) => {
    const doc = new SkinDocument(64, 64, new Uint8ClampedArray(64 * 64 * 4));
    doc.updateLayer(doc.activeLayerId, { name: "4" });
    doc.addLayer();
    doc.updateLayer(doc.activeLayerId, { name: "3" });
    doc.addLayer();
    doc.updateLayer(doc.activeLayerId, { name: "2" });
    doc.addLayer();
    doc.updateLayer(doc.activeLayerId, { name: "1" });
    await open(page, doc);
    await expect.poll(() => names(page)).toEqual(["1", "2", "3", "4"]);
    const indicator = page.getByTestId("layer-drop-indicator");
    await beginDrag(page, row(page, "3"));
    await hover(page, row(page, "2"), "bottom", 80);
    await expect(indicator).toBeVisible();
    await expect(indicator).toHaveAttribute("data-edge", "bottom");
    await expect(row(page, "2").getByTestId("layer-drop-indicator")).toBeVisible();
    const aboveSource = (await row(page, "2").boundingBox())!;
    const line = (await indicator.boundingBox())!;
    expect(line.y + line.height).toBeCloseTo(aboveSource.y + aboveSource.height, 0);
    await page.mouse.up();
    await expect.poll(() => names(page)).toEqual(["1", "2", "3", "4"]);
    await expect(page.locator(".document-dot")).toHaveAttribute("data-dirty", "false");
    await beginDrag(page, row(page, "3"));
    await hover(page, row(page, "2"), "top", 80);
    await expect(row(page, "2").getByTestId("layer-drop-indicator")).toHaveAttribute(
      "data-edge",
      "top",
    );
    await page.screenshot({ path: "/tmp/striped-layer-drop-preview.png" });
    await page.mouse.up();
    await expect.poll(() => names(page)).toEqual(["1", "3", "2", "4"]);
    await expect(indicator).toHaveCount(0);
    await page.getByRole("button", { name: "Отменить штрих", exact: true }).click();
    await expect.poll(() => names(page)).toEqual(["1", "2", "3", "4"]);
    await beginDrag(page, row(page, "3"));
    await hover(page, row(page, "1"), "bottom", 80);
    await expect(row(page, "1").getByTestId("layer-drop-indicator")).toHaveAttribute(
      "data-edge",
      "bottom",
    );
    await page.mouse.up();
    await expect.poll(() => names(page)).toEqual(["1", "3", "2", "4"]);
    await beginDrag(page, row(page, "2"));
    await hover(page, row(page, "1"), "top", 80);
    await expect(indicator).toBeVisible();
    await page.keyboard.press("Escape");
    await page.mouse.up();
    await expect(indicator).toHaveCount(0);
    await expect.poll(() => names(page)).toEqual(["1", "3", "2", "4"]);
  });

  test("group boundary indentation selects nesting, collapsed groups open on drop, and cycles are rejected", async ({
    page,
  }) => {
    const doc = new SkinDocument(64, 64, new Uint8ClampedArray(64 * 64 * 4));
    const source = doc.activeLayerId;
    doc.updateLayer(source, { name: "Внешний" });
    const group = doc.addLayer("group")!;
    doc.updateLayer(group, { name: "Папка" });
    const child = doc.addLayer()!;
    doc.updateLayer(child, { name: "Внутри" });
    const upper = doc.addLayer("layer", null)!;
    doc.updateLayer(upper, { name: "Сверху" });
    await open(page, doc);
    const indicator = page.getByTestId("layer-drop-indicator");
    await beginDrag(page, row(page, "Внешний"));
    await hover(page, row(page, "Внутри"), "bottom", 4);
    await expect(indicator).toHaveAttribute("data-parent-id", "");
    const rootLeft = (await indicator.boundingBox())!.x;
    await hover(page, row(page, "Внутри"), "bottom", 80);
    await expect(indicator).toHaveAttribute("data-parent-id", group);
    expect((await indicator.boundingBox())!.x - rootLeft).toBe(12);
    await page.mouse.up();
    await row(page, "Внешний").locator(".layer-select").click();
    await expect(page.getByLabel("Группа слоя", { exact: true })).toHaveValue(group);
    await page.getByRole("button", { name: "Отменить штрих", exact: true }).click();
    await page.getByRole("button", { name: "Свернуть группу Папка", exact: true }).click();
    const groupRow = page
      .getByTestId("layer-row")
      .filter({ has: page.getByRole("button", { name: "Выбрать группу Папка", exact: true }) });
    await beginDrag(page, row(page, "Внешний"));
    await hover(page, groupRow, "bottom", 80);
    await expect(indicator).toHaveAttribute("data-parent-id", group);
    await page.mouse.up();
    await expect(row(page, "Внутри")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Свернуть группу Папка", exact: true }),
    ).toBeVisible();
    await row(page, "Внешний").locator(".layer-select").click();
    await expect(page.getByLabel("Группа слоя", { exact: true })).toHaveValue(group);
    await beginDrag(page, groupRow);
    await hover(page, row(page, "Внутри"), "top", 80);
    await expect(indicator).toHaveCount(0);
    await page.mouse.up();
    await expect.poll(() => names(page)).toEqual(["Сверху", "Папка", "Внешний", "Внутри"]);
    await beginDrag(page, groupRow);
    await hover(page, row(page, "Сверху"), "top", 80);
    await expect(indicator).toHaveAttribute("data-parent-id", "");
    await page.mouse.up();
    await expect.poll(() => names(page)).toEqual(["Папка", "Внешний", "Внутри", "Сверху"]);
    await row(page, "Внутри").locator(".layer-select").click();
    await expect(page.getByLabel("Группа слоя", { exact: true })).toHaveValue(group);
    await page.getByRole("button", { name: "Отменить штрих", exact: true }).click();
    await expect.poll(() => names(page)).toEqual(["Сверху", "Папка", "Внешний", "Внутри"]);
    // Move a child out at the same group/root boundary using its left side.
    await beginDrag(page, row(page, "Внешний"));
    await hover(page, row(page, "Внутри"), "bottom", 4);
    await expect(indicator).toHaveAttribute("data-parent-id", "");
    await page.mouse.up();
    await row(page, "Внешний").locator(".layer-select").click();
    await expect(page.getByLabel("Группа слоя", { exact: true })).toHaveValue("");
    await expect.poll(() => names(page)).toEqual(["Сверху", "Папка", "Внутри", "Внешний"]);
  });
});
