import { useSearchParams, type MetaFunction } from "@remix-run/react";
import ViewerParametersContext from "~/components/skin-viewer/ViewerParametersContext";
import { Interface } from "./components/Interface";
import { Layout } from "./components/Layout";
import { ViewerErrorMessage } from "./components/ViewerErrrorMessage";
import { ViewerWrapper } from "./components/ViewerWrapper";

export const meta: MetaFunction = () => {
  return [
    { title: "Striped Skins" },
    { name: "description", content: "Simple MineLP Skin Viewer" },
  ];
};

export default function Index() {
  const [searchParams] = useSearchParams()
  const hideHud = searchParams.get("no-hud") !== null;

  if (hideHud) {
    return (
      <ViewerParametersContext>
        <ViewerWrapper />
      </ViewerParametersContext>
    );
  }

  return (
    <Layout>
      <ViewerParametersContext>
        <ViewerWrapper />
        <Interface />
      </ViewerParametersContext>
    </Layout>
  );
}

export function ErrorBoundary() {
  const [searchParams] = useSearchParams();
  const hideHud = searchParams.get("no-hud") !== null;

  if (hideHud) {
    return <ViewerErrorMessage />;
  }

  return (
    <Layout>
      <ViewerParametersContext>
        <ViewerErrorMessage />
        <Interface />
      </ViewerParametersContext>
    </Layout>
  );
}
