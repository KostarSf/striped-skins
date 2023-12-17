import type { LoaderFunctionArgs } from "@remix-run/node";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const skinUrl = new URL(request.url).searchParams.get("url");

  if (!skinUrl) {
    return new Response(null, { status: 400 });
  }

  const response = await fetch(skinUrl);
  if (!response.ok) {
    return new Response(null, { status: 400 });
  }

  return new Response(response.body, {
    headers: {
      "Cache-Control": "max-age=600",
      "Access-Control-Allow-Origin": "*",
    },
  });
};
