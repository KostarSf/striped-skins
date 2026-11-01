import { test } from "node:test";
import assert from "node:assert/strict";
import { zipSync, strToU8 } from "fflate";
import {
  SkinDocument,
  encodeSkinProject,
  decodeSkinProject,
  writeSkinMetadata,
  decodeSkinMetadata,
} from "../../packages/api/build/esm/index.js";
import { validateSnapshot } from "../../packages/api/build/esm/SkinDocument.js";
const fresh = (size = 64) => new SkinDocument(size, size, new Uint8ClampedArray(size * size * 4));
const paint = (doc, color, x = 10, y = 10) => {
  doc.beginStroke();
  doc.paint(x, y, color);
  doc.endStroke();
};
const red = [255, 0, 0, 255],
  blue = [0, 0, 255, 255];

test("history states seek across pixels, groups and metadata atomically in both directions", () => {
  const doc = fresh();
  const snapshots = [doc.snapshot()];
  for (const action of [
    () => paint(doc, red),
    () => doc.addLayer("group"),
    () => doc.addLayer(),
    () => paint(doc, blue),
    () => writeSkinMetadata(doc, { race: "KIRIN" }),
    () => doc.updateLayer(doc.activeLayerId, { opacity: 40 }),
  ]) {
    action();
    snapshots.push(doc.snapshot());
  }
  const states = doc.historyStates;
  assert.equal(states.length, snapshots.length);
  assert.equal(states[0].label, "Исходное состояние");
  let notifications = 0;
  doc.subscribe(() => notifications++);
  const content = ({ layers, activeLayerId, pixels, metadata, stateId }) => ({
    layers,
    activeLayerId,
    pixels,
    metadata,
    stateId,
  });
  for (const index of [0, 4, 2, 6, 1, 5, 0, 6]) {
    notifications = 0;
    doc.goToHistoryState(states[index].id);
    assert.equal(notifications, 1);
    assert.deepEqual(content(doc.snapshot()), content(snapshots[index]));
    assert.deepEqual(
      doc.historyStates.map((state) => state.status),
      states.map((_, i) => (i === index ? "current" : i > index ? "future" : "past")),
    );
  }
  notifications = 0;
  doc.goToHistoryState(states.at(-1).id);
  doc.goToHistoryState(-1);
  assert.equal(notifications, 0);
});

test("undone states survive navigation, project files and no-op edits until a new document action", () => {
  const doc = fresh();
  paint(doc, red);
  paint(doc, blue);
  const states = doc.historyStates;
  doc.undo();
  assert.equal(doc.historyStates.at(-1).status, "future");
  const restored = decodeSkinProject(encodeSkinProject(doc));
  assert.deepEqual(restored.historyStates, doc.historyStates);
  restored.goToHistoryState(states.at(-1).id);
  assert.deepEqual(restored.readPixel(10, 10), blue);
  restored.goToHistoryState(states[1].id);
  restored.updateLayer(restored.activeLayerId, { opacity: 100 });
  restored.setWorkspace("brushSize", 4);
  assert.deepEqual(restored.historyStates, doc.historyStates);
  paint(restored, [0, 255, 0, 255]);
  assert.equal(restored.canRedo, false);
  assert.equal(restored.historyStates.length, states.length);
  assert.equal(
    restored.historyStates.some((state) => state.id === states.at(-1).id),
    false,
  );
  restored.goToHistoryState(states[1].id);
  assert.deepEqual(restored.readPixel(10, 10), red);
  restored.redo();
  assert.deepEqual(restored.readPixel(10, 10), [0, 255, 0, 255]);
});

test("the earliest retained history state remains reachable after the history limit", () => {
  const doc = fresh();
  for (let i = 0; i < 105; i++) paint(doc, i % 2 ? blue : red);
  const states = doc.historyStates;
  assert.equal(states.length, 101);
  assert.equal(states[0].label, "Начало доступной истории");
  doc.goToHistoryState(states[0].id);
  assert.equal(doc.canUndo, false);
  assert.deepEqual(doc.readPixel(10, 10), red);
  doc.goToHistoryState(states.at(-1).id);
  assert.equal(doc.canRedo, false);
  assert.deepEqual(doc.readPixel(10, 10), red);
});

test("layers composite bottom to top, group alpha is isolated, and structural history restores pixels", () => {
  const doc = fresh();
  paint(doc, red);
  const base = doc.activeLayerId;
  const group = doc.addLayer("group");
  const lower = doc.addLayer();
  paint(doc, blue);
  const upper = doc.addLayer();
  paint(doc, [0, 255, 0, 255]);
  doc.updateLayer(group, { opacity: 50 });
  assert.deepEqual(doc.readPixel(10, 10), [128, 128, 0, 255]);
  doc.updateLayer(upper, { visible: false });
  assert.deepEqual(doc.readPixel(10, 10), [128, 0, 128, 255]);
  doc.setActiveLayer(group);
  doc.mergeGroup(group);
  assert.equal(doc.layers.find((n) => n.id === group).kind, "layer");
  assert.deepEqual(doc.readPixel(10, 10), [128, 0, 128, 255]);
  doc.undo();
  assert.equal(doc.layers.find((n) => n.id === group).kind, "group");
  assert.ok(doc.layers.some((n) => n.id === lower));
  doc.deleteLayer(group);
  assert.deepEqual(doc.readPixel(10, 10), red);
  doc.undo();
  assert.deepEqual(doc.readPixel(10, 10), [128, 0, 128, 255]);
  doc.setActiveLayer(base);
  doc.moveLayer(group, group);
  assert.equal(doc.layers.find((n) => n.id === group).parentId, null);
});

test("locks apply through ancestors, alpha lock preserves alpha, metadata is independent of layers", () => {
  const doc = fresh();
  const group = doc.addLayer("group"),
    layer = doc.addLayer();
  paint(doc, [1, 2, 3, 128]);
  doc.updateLayer(layer, { alphaLocked: true });
  paint(doc, red);
  assert.equal(doc.layers.find((n) => n.id === layer).pixels[(10 * 64 + 10) * 4 + 3], 128);
  paint(doc, red, 20, 20);
  assert.deepEqual(doc.readPixel(20, 20), [0, 0, 0, 0]);
  paint(doc, [0, 0, 0, 0]);
  assert.equal(doc.readPixel(10, 10)[3], 128);
  doc.updateLayer(group, { locked: true });
  paint(doc, blue);
  assert.match(doc.paintBlockedReason, /заблокированы/);
  assert.deepEqual(doc.readPixel(10, 10), [255, 0, 0, 128]);
  writeSkinMetadata(doc, { race: "KIRIN", wearables: [22, 50] });
  doc.updateLayer(group, { visible: false });
  assert.equal(decodeSkinMetadata(doc).race, "KIRIN");
  doc.setActiveLayer("layer-1");
  paint(doc, red, 0, 0);
  assert.equal(decodeSkinMetadata(doc).race, "KIRIN");
});

test("reordering, nested duplication and merge down are reversible and never alias raster data", () => {
  const doc = fresh();
  paint(doc, red);
  const top = doc.addLayer();
  paint(doc, blue);
  doc.moveLayer(top, null, "layer-1");
  assert.deepEqual(doc.readPixel(10, 10), red);
  doc.undo();
  assert.deepEqual(doc.readPixel(10, 10), blue);
  doc.duplicateLayer(top);
  paint(doc, red);
  doc.undo();
  assert.deepEqual(doc.readPixel(10, 10), blue);
  doc.undo();
  assert.equal(doc.layers.length, 2);
  doc.setActiveLayer(top);
  doc.mergeDown();
  assert.equal(doc.layers.length, 1);
  assert.deepEqual(doc.readPixel(10, 10), blue);
  doc.undo();
  assert.equal(doc.layers.length, 2);
  doc.undo();
  assert.deepEqual(doc.readPixel(10, 10), red);
  doc.redo();
  assert.deepEqual(doc.readPixel(10, 10), blue);
});

test("duplicating long layer and group names preserves valid project and recovery history", () => {
  for (const kind of ["layer", "group"]) {
    for (const length of [92, 93, 100]) {
      const doc = fresh();
      const id = kind === "group" ? doc.addLayer("group") : doc.activeLayerId;
      const name = "Я".repeat(length);
      doc.updateLayer(id, { name });
      if (kind === "group") {
        const child = doc.addLayer();
        doc.updateLayer(child, { name: "В".repeat(100) });
      }
      doc.duplicateLayer(id);
      const duplicate = doc.activeLayerId;
      assert.equal(doc.activeLayer.name, `${name.slice(0, 92)} — копия`);
      assert.ok(doc.layers.every((node) => node.name.length <= 100));
      // A later rename must not hide an invalid name in structural undo history.
      doc.updateLayer(duplicate, { name: "Переименованная копия" });
      for (const restored of [
        SkinDocument.restore(doc.snapshot()),
        decodeSkinProject(encodeSkinProject(doc)),
      ]) {
        restored.undo();
        assert.equal(restored.activeLayer.name, `${name.slice(0, 92)} — копия`);
        restored.undo();
        assert.ok(restored.layers.every((node) => node.id !== duplicate));
        restored.redo();
        assert.equal(restored.activeLayerId, duplicate);
        assert.equal(restored.activeLayer.name.length, 100);
        restored.redo();
        assert.equal(restored.activeLayer.name, "Переименованная копия");
        validateSnapshot(restored.snapshot());
      }
    }
  }
});

test("merging empty groups respects the HD raster budget without modifying state or redo", () => {
  const size = 2048;
  // Four hidden HD rasters fill the 64 MiB budget; omit unrelated painting history.
  const snapshot = fresh(size).snapshot();
  snapshot.layers = Array.from({ length: 4 }, (_, index) => ({
    ...snapshot.layers[0],
    id: `layer-${index + 1}`,
    visible: false,
    pixels: new Uint8ClampedArray(size * size * 4),
  }));
  const doc = SkinDocument.restore(snapshot);
  const empty = doc.addLayer("group", null);
  doc.updateLayer(empty, { visible: false });
  const nested = doc.addLayer("group", null);
  doc.updateLayer(nested, { visible: false });
  const child = doc.addLayer("group", nested);
  doc.updateLayer(child, { visible: false });
  doc.addLayer("group", child);
  doc.updateLayer(nested, { name: "Изменённая группа" });
  doc.undo();
  assert.equal(doc.canAddLayer, false);
  assert.equal(doc.canRedo, true);
  const before = {
    layers: [...doc.layers],
    active: doc.activeLayerId,
    history: doc.historyStates,
    token: doc.saveToken,
    revision: doc.getSnapshot(),
  };
  let notifications = 0;
  doc.subscribe(() => notifications++);
  for (const id of [empty, nested, child]) {
    assert.throws(() => doc.mergeGroup(id), /64 МиБ/);
    assert.deepEqual(doc.layers, before.layers);
    assert.equal(doc.activeLayerId, before.active);
    assert.deepEqual(doc.historyStates, before.history);
    assert.equal(doc.saveToken, before.token);
    assert.equal(doc.getSnapshot(), before.revision);
    assert.equal(notifications, 0);
    assert.equal(doc.canRedo, true);
  }
  // Replacing an existing descendant raster is allowed even at the limit.
  doc.moveLayer("layer-4", child);
  doc.mergeGroup(nested);
  assert.equal(doc.layers.filter((node) => node.kind === "layer").length, 4);
  assert.equal(doc.activeLayer.kind, "layer");
  doc.undo();
  assert.equal(doc.layers.find((node) => node.id === nested).kind, "group");
  doc.redo();
  validateSnapshot(doc.snapshot());
  // An empty group may become a raster once a slot is freed.
  doc.deleteLayer("layer-3");
  assert.equal(doc.canAddLayer, true);
  doc.mergeGroup(empty);
  assert.equal(doc.layers.filter((node) => node.kind === "layer").length, 4);
  doc.undo();
  assert.equal(doc.layers.find((node) => node.id === empty).kind, "group");
  doc.redo();
  validateSnapshot(doc.snapshot());
});

test("project ZIP round-trip preserves hidden RGB, settings, metadata, shared history and redo", () => {
  const pixels = new Uint8ClampedArray(64 * 64 * 4);
  pixels.set([71, 82, 93, 0], 1000);
  const doc = new SkinDocument(64, 64, pixels, "legacy");
  const group = doc.addLayer("group"),
    layer = doc.addLayer();
  paint(doc, blue);
  doc.setWorkspace("colors", { primary: "#abcdef", secondary: "#010203" });
  doc.setWorkspace("hiddenParts", ["head"]);
  writeSkinMetadata(doc, { race: "KIRIN" });
  doc.updateLayer(group, { opacity: 33 });
  doc.undo();
  const restored = decodeSkinProject(encodeSkinProject(doc));
  assert.deepEqual(restored.snapshot(), doc.snapshot());
  assert.deepEqual(Array.from(restored.layers[0].pixels.slice(1000, 1004)), [71, 82, 93, 0]);
  restored.redo();
  assert.equal(restored.layers.find((n) => n.id === group).opacity, 33);
  restored.undo();
  restored.undo();
  assert.equal(decodeSkinMetadata(restored).race, "HUMAN");
  restored.undo();
  assert.deepEqual(restored.readPixel(10, 10), [0, 0, 0, 0]);
  restored.redo();
  assert.deepEqual(restored.readPixel(10, 10), blue);
  assert.equal(restored.activeLayerId, layer);
  assert.deepEqual(doc.readPixel(10, 10), blue);
});

test("recovery captures an unfinished stroke with an undo record and migrates v1 snapshots", () => {
  const doc = fresh();
  doc.beginStroke();
  doc.paint(10, 10, red);
  const restored = SkinDocument.restore(doc.snapshot());
  assert.equal(doc.isDrawing, true);
  assert.equal(restored.canUndo, true);
  restored.undo();
  assert.deepEqual(restored.readPixel(10, 10), [0, 0, 0, 0]);
  const legacy = SkinDocument.restore({
    version: 1,
    width: 64,
    height: 64,
    sourceFormat: "modern",
    pixels: Array.from(doc.pixels),
  });
  assert.equal(legacy.layers.length, 1);
  assert.equal(legacy.canUndo, false);
  assert.deepEqual(legacy.readPixel(10, 10), red);
});

test("malformed projects, cyclic parents, bad history targets and invalid dimensions are rejected", () => {
  for (const mutate of [
    (s) => (s.layers[0].parentId = "layer-1"),
    (s) => (s.layers[0].opacity = 101),
    (s) => (s.layers[0].pixels = new Uint8ClampedArray(4)),
    (s) => (s.activeLayerId = "missing"),
    (s) => (s.width = 2049),
    (s) => (s.undo[0].layerId = "missing"),
    (s) => (s.undo[0].changes[0].index = 999999),
    (s) => (s.nextId = 0),
    (s) => (s.workspace.colors = { primary: "wrong", secondary: "#000000" }),
    (s) => (s.workspace.cameraState = { position: [1], target: [0, 0, 0], zoom: 1 }),
  ]) {
    const doc = fresh();
    paint(doc, red);
    const s = doc.snapshot();
    mutate(s);
    assert.throws(() => SkinDocument.restore(s));
  }
  assert.throws(() => decodeSkinProject(strToU8("broken")));
  assert.throws(() => decodeSkinProject(zipSync({ "project.json": strToU8('{"version":9}') })));
});

test("one numeric adjustment coalesces layer properties without merging separate edits or redo", () => {
  const doc = fresh();
  doc.updateLayer(doc.activeLayerId, { opacity: 75 }, "slider-1");
  doc.updateLayer(doc.activeLayerId, { opacity: 50 }, "slider-1");
  doc.updateLayer(doc.activeLayerId, { opacity: 25 }, "slider-1");
  assert.equal(doc.history.length, 1);
  const restored = decodeSkinProject(encodeSkinProject(doc));
  restored.undo();
  assert.equal(restored.activeLayer.opacity, 100);
  restored.redo();
  assert.equal(restored.activeLayer.opacity, 25);
  doc.updateLayer(doc.activeLayerId, { opacity: 10 }, "slider-2");
  doc.undo();
  assert.equal(doc.activeLayer.opacity, 25);
  doc.redo();
  assert.equal(doc.activeLayer.opacity, 10);
  doc.updateLayer(doc.activeLayerId, { opacity: 5 }, "slider-2");
  assert.equal(doc.history.length, 3);
});

test("raster revisions commit once per stroke and follow cancellation/undo, ignoring workspace edits", () => {
  const doc = fresh(),
    id = doc.activeLayerId;
  const initial = doc.getLayerRevision(id);
  doc.setWorkspace("brushSize", 4);
  doc.updateLayer(id, { opacity: 50 });
  assert.equal(doc.getLayerRevision(id), initial);
  doc.beginStroke();
  doc.paint(20, 20, red);
  assert.equal(doc.getLayerRevision(id), initial);
  assert.deepEqual(doc.readPixel(20, 20), [255, 0, 0, 128]);
  doc.paint(21, 20, blue);
  assert.equal(doc.getLayerRevision(id), initial);
  assert.deepEqual(doc.readPixel(21, 20), [0, 0, 255, 128]);
  doc.endStroke();
  assert.equal(doc.getLayerRevision(id), initial + 1);
  doc.beginStroke();
  doc.endStroke();
  assert.equal(doc.getLayerRevision(id), initial + 1);
  const painted = doc.getLayerRevision(id);
  doc.undo();
  assert.ok(doc.getLayerRevision(id) > painted);
  const undone = doc.getLayerRevision(id);
  doc.redo();
  assert.ok(doc.getLayerRevision(id) > undone);
  doc.beginStroke();
  doc.paint(20, 20, blue);
  const partial = doc.getLayerRevision(id);
  doc.cancelStroke();
  assert.ok(doc.getLayerRevision(id) > partial);
});
