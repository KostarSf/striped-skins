import { lazy, Suspense } from "react";
import { StudioSkeleton } from "../components/studio/StudioSkeleton";
const Editor = lazy(() => import("../components/SkinEditorRoute.client"));
export default function EditorRoute() {
  return (
    <Suspense fallback={<StudioSkeleton mode="editor" />}>
      <Editor />
    </Suspense>
  );
}
