import { lazy, Suspense } from "react";
const Editor = lazy(() => import("../components/SkinEditorRoute.client"));
export default function EditorRoute() {
  return (
    <Suspense fallback={<output>Загрузка редактора…</output>}>
      <Editor />
    </Suspense>
  );
}
