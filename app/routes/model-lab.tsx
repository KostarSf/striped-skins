import { useTranslation } from "react-i18next";
import { lazy, Suspense, useEffect, useState } from "react";

const ModelLab = lazy(() => import("../components/ModelLab.client"));

export default function ModelLabRoute() {
  const { t } = useTranslation();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated ? (
    <Suspense fallback={<p>{t("loading.editorEllipsis")}</p>}>
      <ModelLab />
    </Suspense>
  ) : (
    <p>{t("loading.editorEllipsis")}</p>
  );
}
