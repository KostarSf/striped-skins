import type { LoaderFunctionArgs } from "@remix-run/node";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const skinUrl = new URL(request.url).searchParams.get("url");

  if (!skinUrl) {
    return new Response(null, { status: 400 });
  }

  const response = await fetch(skinUrl);
  if (response.ok) {
    response.headers.set("Cache-Control", "max-age=600");
  }

  response.headers.set("Access-Control-Allow-Origin", '*');

  return response;
};
