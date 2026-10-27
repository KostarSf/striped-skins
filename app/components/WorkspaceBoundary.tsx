import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
const Workspace = lazy(() => import("./Workspace.client"));
export function WorkspaceBoundary({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return ready ? (
    <Suspense fallback={<p>Загрузка…</p>}>
      <Workspace>{children}</Workspace>
    </Suspense>
  ) : (
    <p>Загрузка…</p>
  );
}
