import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";

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
