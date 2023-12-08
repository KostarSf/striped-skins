import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { Form, useLoaderData, useSearchParams } from "@remix-run/react";
import { SkinViewer } from "~/components/SkinViewer";

export const meta: MetaFunction = () => {
  return [
    { title: "New Remix App" },
    { name: "description", content: "Welcome to Remix!" },
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
  const [params] = useSearchParams();

  return (
    <div className='w-screen h-screen bg-zinc-700'>
      <Form method='GET' className='p-4'>
        <input
          className='w-full py-2 px-4 rounded-md'
          type='text'
          name="skin"
          placeholder='Ссылка на скин'
          defaultValue={params.get("skin") ?? ""}
        />
      </Form>

      <SkinViewer skinUrl={skinUrl} />
    </div>
  );
}
