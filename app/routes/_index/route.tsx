import { useLoaderData, useNavigation } from "@remix-run/react";
import { Interface } from "./components/Interface";
import { Layout } from "./components/Layout";
import { ViewerErrorMessage } from "./components/ViewerErrrorMessage";
import { ViewerWrapper } from "./components/ViewerWrapper";
import type { loader } from "./server";

export { loader, meta } from "./server";

export default function Index() {
  const { skinUrl } = useLoaderData<typeof loader>();

  const navigation = useNavigation();
  const skinIsLoaded = navigation.state === "idle";

  return (
    <Layout>
      <ViewerWrapper skinUrl={skinUrl} skinIsLoaded={skinIsLoaded} />
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
