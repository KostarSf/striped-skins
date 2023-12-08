import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { useLoaderData, useNavigation } from "@remix-run/react";
import { Interface } from "./components/Interface";
import { Layout } from "./components/Layout";
import { ViewerWrapper } from "./components/ViewerWrapper";
import { ViewerErrorMessage } from "./components/ViewerErrrorMessage";

export const meta: MetaFunction = () => {
  return [
    { title: "Striped Skins" },
    { name: "description", content: "Simple MineLP Skin Viewer" },
  ];
};

export const loader = ({ request }: LoaderFunctionArgs) => {
  const skin = new URL(request.url).searchParams.get("skin");

  if (!skin) {
    return { skinUrl: "/steve_pony.png" };
  }

  return { skinUrl: "/skin-proxy?url=" + skin };
};

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
  )
}
