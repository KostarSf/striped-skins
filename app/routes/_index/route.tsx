import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { Form, useLoaderData, useSearchParams } from "@remix-run/react";
import { SkinViewer } from "~/components/SkinViewer";

export const meta: MetaFunction = () => {
  return [
    { title: "Striped Skins" },
    { name: "description", content: "Another MineLP Skin Viewer" },
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
    <div className='w-screen h-screen bg-zinc-700 relative'>
      <div className='absolute inset-0'>
        <SkinViewer skinUrl={skinUrl} />
      </div>

      <div className='absolute left-0 top-0 right-0 p-4'>
        <Form method='GET'>
          <input
            className='w-full py-2 px-4 rounded-md outline-none focus:ring ring-orange-500 transition shadow-lg'
            type='text'
            name='skin'
            placeholder='Ссылка на скин'
            defaultValue={params.get("skin") ?? ""}
          />
        </Form>
      </div>
    </div>
  );
}
