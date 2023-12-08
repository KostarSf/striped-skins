import { useLoaderData } from "@remix-run/react";
import { Interface } from "./components/Interface";
import { Layout } from "./components/Layout";
import { ViewerErrorMessage } from "./components/ViewerErrrorMessage";
import { ViewerWrapper } from "./components/ViewerWrapper";
import type { loader } from "./server";

export { loader, meta } from "./server";

export default function Index() {
  const { skinUrl, comparedSkinUrl } = useLoaderData<typeof loader>();

  return (
    <Layout>
      <ViewerWrapper skinUrl={skinUrl} comparedSkinUrl={comparedSkinUrl} />
      <Interface />
    </Layout>
  );
}

export function ErrorBoundary() {
  return (
    <Layout>
      <ViewerErrorMessage />
      <Interface />
    </Layout>
  );
}
