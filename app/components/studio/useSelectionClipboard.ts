import { useCallback, useMemo, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import type { SelectionClipboard, SkinDocument } from "@striped-skins/api";

// Shared by open documents for this browser session, excluded from saved projects and recovery.
let clipboard: SelectionClipboard | null = null;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const snapshot = () => clipboard;
const serverSnapshot = () => null;
function store(value: SelectionClipboard | null) {
  if (!value) return;
  clipboard = value;
  listeners.forEach((listener) => listener());
}

export function useSelectionClipboard(skin: SkinDocument) {
  const { t } = useTranslation();
  const value = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  useSyncExternalStore(skin.subscribe, skin.getSnapshot, skin.getSnapshot);
  const copy = useCallback(() => store(skin.copySelection()), [skin]);
  const cut = useCallback(() => store(skin.cutSelection()), [skin]);
  const paste = useCallback(() => {
    if (clipboard) skin.pasteSelection(clipboard, t("clipboard.layerName"));
  }, [skin, t]);
  const canCopy = !skin.isDrawing && skin.canCopySelection,
    canCut = !skin.isDrawing && skin.canCutSelection,
    canPaste = !skin.isDrawing && skin.canPasteSelection(value);
  return useMemo(
    () => ({ copy, cut, paste, canCopy, canCut, canPaste }),
    [copy, cut, paste, canCopy, canCut, canPaste],
  );
}
export type SelectionClipboardActions = ReturnType<typeof useSelectionClipboard>;
