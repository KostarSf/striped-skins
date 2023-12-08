import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";

export const meta: MetaFunction = () => {
  return [
    { title: "Striped Skins" },
    { name: "description", content: "Simple MineLP Skin Viewer" },
  ];
};

export const loader = ({ request }: LoaderFunctionArgs) => {
  const searchParams = new URL(request.url).searchParams;

  const skin = searchParams.get("skin");
  const comparedSkin = searchParams.get("compare-with");

  const comparedSkinUrl = comparedSkin
    ? "/skin-proxy?url=" + comparedSkin
    : null;

  if (!skin) {
    return { skinUrl: "/steve_pony.png", comparedSkinUrl };
  }

  return {
    skinUrl: "/skin-proxy?url=" + skin,
    comparedSkinUrl,
  };
};
