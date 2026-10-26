import { lazy, Suspense, useEffect, useState } from "react";

const ModelLab = lazy(() => import("../components/ModelLab.client"));

export default function ModelLabRoute() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated ? (
    <Suspense fallback={<p>Загрузка редактора…</p>}>
      <ModelLab />
    </Suspense>
  ) : (
    <p>Загрузка редактора…</p>
  );
}
