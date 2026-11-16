import { expect, type Page } from "@playwright/test";

/** Wait for the committed session, rather than racing its debounced IndexedDB write. */
export async function waitForRecoveryState(page: Page, stateId: number) {
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          new Promise<number | undefined>((resolve, reject) => {
            const request = indexedDB.open("striped.editor", 1);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
              const db = request.result;
              const tx = db.transaction("documents", "readonly");
              const saved = tx.objectStore("documents").get("session");
              tx.oncomplete = () => {
                resolve(saved.result?.first?.document.stateId);
                db.close();
              };
              tx.onabort = () => {
                db.close();
                reject(tx.error);
              };
            };
          }),
      ),
    )
    .toBe(stateId);
}
