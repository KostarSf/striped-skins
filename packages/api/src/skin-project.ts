import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { SkinDocument, validateSnapshot, type ProjectSnapshot } from "./SkinDocument.js";

const MAX_ARCHIVE = 64 * 1024 * 1024;
const MAX_EXPANDED = 128 * 1024 * 1024;
/** ZIP manifest and raw RGBA entries preserve invisible RGB and shared history buffers. */
export function encodeSkinProject(document: SkinDocument): Uint8Array {
  if (document.isDrawing) document.endStroke();
  const files: Record<string, Uint8Array> = {};
  const buffers = new Map<Uint8ClampedArray, string>();
  const snapshot = document.snapshot();
  validateSnapshot(snapshot);
  const manifest = JSON.stringify(snapshot, (_key, value: unknown) => {
    if (!(value instanceof Uint8ClampedArray)) return value;
    let path = buffers.get(value);
    if (!path) {
      path = `buffers/${buffers.size}.rgba`;
      buffers.set(value, path);
      files[path] = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    }
    return { rgba: path };
  });
  files["project.json"] = strToU8(manifest);
  if (
    files["project.json"].byteLength > 32 * 1024 * 1024 ||
    Object.values(files).reduce((sum, bytes) => sum + bytes.byteLength, 0) > MAX_EXPANDED
  )
    throw new Error("Проект превышает допустимый размер файла; уменьшите число слоёв");
  const archive = zipSync(files, { level: 6 });
  if (archive.byteLength > MAX_ARCHIVE)
    throw new Error("Файл проекта превышает 64 МиБ; уменьшите число слоёв");
  return archive;
}
export function decodeSkinProject(bytes: Uint8Array): SkinDocument {
  if (bytes.byteLength > MAX_ARCHIVE) throw new Error("Файл проекта превышает 64 МиБ");
  let expanded = 0,
    entries = 0;
  const files = unzipSync(bytes, {
    filter: (file) => {
      expanded += file.originalSize;
      entries++;
      if (
        expanded > MAX_EXPANDED ||
        entries > 1024 ||
        (file.name === "project.json" && file.originalSize > 32 * 1024 * 1024)
      )
        throw new Error("Проект превышает допустимый размер");
      return file.name === "project.json" || /^buffers\/\d+\.rgba$/.test(file.name);
    },
  });
  if (!files["project.json"]) throw new Error("В файле нет проекта Striped");
  const buffers = new Map<string, Uint8ClampedArray>();
  const snapshot: unknown = JSON.parse(strFromU8(files["project.json"]), (_key, value: unknown) => {
    if (value && typeof value === "object" && "rgba" in value) {
      const path = (value as { rgba: unknown }).rgba;
      if (typeof path !== "string" || !/^buffers\/\d+\.rgba$/.test(path) || !files[path])
        throw new Error("В проекте отсутствуют данные слоя");
      if (!buffers.has(path)) buffers.set(path, new Uint8ClampedArray(files[path]));
      return buffers.get(path);
    }
    return value;
  });
  if (
    !snapshot ||
    typeof snapshot !== "object" ||
    !("version" in snapshot) ||
    snapshot.version !== 2
  )
    throw new Error("Неподдерживаемая версия проекта Striped");
  return SkinDocument.restore(snapshot as ProjectSnapshot);
}
