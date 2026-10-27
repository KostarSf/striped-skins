import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { useLocation, useNavigation } from "react-router";
import { StudioSkeleton } from "./studio/StudioSkeleton";
const Workspace = lazy(() => import("./Workspace.client"));
export function WorkspaceBoundary({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const location = useLocation();
  const navigation = useNavigation();
  const nextPath = navigation.location?.pathname;
  const navigating = navigation.state !== "idle" && nextPath !== location.pathname && !!nextPath;
  const mode = (navigating ? nextPath : location.pathname)?.startsWith("/editor")
    ? "editor"
    : "viewer";
  const fallback = <StudioSkeleton mode={mode} />;
  useEffect(() => setReady(true), []);
  return ready ? (
    <Suspense fallback={fallback}>
      <Workspace>{navigating ? fallback : children}</Workspace>
    </Suspense>
  ) : (
    fallback
  );
}
