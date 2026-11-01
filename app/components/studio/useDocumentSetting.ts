import { useCallback, useEffect, useRef, useSyncExternalStore, type SetStateAction } from "react";
import type { SkinDocument, WorkspaceValue } from "@striped-skins/api";

export function useDocumentSetting<T extends WorkspaceValue>(
  document: SkinDocument,
  key: string,
  initial: T,
): [T, (value: SetStateAction<T>) => void] {
  useSyncExternalStore(document.subscribe, document.getSnapshot, document.getSnapshot);
  const fallback = useRef(initial);
  useEffect(() => {
    document.initializeWorkspace(key, fallback.current);
  }, [document, key]);
  const set = useCallback(
    (value: SetStateAction<T>) => {
      const current = document.getWorkspace(key, fallback.current);
      document.setWorkspace(key, typeof value === "function" ? value(current) : value);
    },
    [document, key],
  );
  return [document.getWorkspace(key, initial), set];
}
