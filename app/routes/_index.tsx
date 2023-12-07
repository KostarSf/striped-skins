import { CameraControls, useTexture } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Box } from "~/components/model/Box";

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

  return (
    <div className='w-screen h-screen'>
      <Canvas>
        <CameraControls />

        <ambientLight intensity={0.7} />
        <directionalLight color='white' position={[2, 3, 5]} />

        <PonyModel skinUrl={skinUrl} />
      </Canvas>
    </div>
  );
}

function PonyModel({ skinUrl }: { skinUrl: string }) {
  const texture = useTexture(skinUrl);

  return (
    <>
      <Box // Head
        texture={texture}
        parameters={{
          textureSize: 64,
          uvScale: [8, 8, 8],
          uvOrigin: [0, 0],
        }}
        position={[0, 2, 0]}
        rotation={[0, 0, 0]}
        scale={[8, 8, 8]}
      />

      <Box // Right ear
        texture={texture}
        parameters={{
          textureSize: 64,
          uvScale: [2, 2, 2],
          uvOrigin: [12, 16],
        }}
        position={[-0.6, 3, -0.35]}
        rotation={[0, 0, 0]}
        scale={[2, 2, 2]}
      />

      <Box // Left ear
        texture={texture}
        parameters={{
          textureSize: 64,
          uvScale: [2, 2, 2],
          uvOrigin: [12, 16],
        }}
        position={[0.6, 3, -0.35]}
        rotation={[0, 0, 0]}
        scale={[2, 2, 2]}
      />

      <Box // Front right leg
        texture={texture}
        parameters={{
          textureSize: 64,
          uvScale: [3, 4, 12],
          uvOrigin: [40, 16],
        }}
        position={[-0.5, 0, 0]}
        rotation={[0, 0, 0]}
        scale={[3, 4, 12]}
      />

      <Box // Font left leg
        texture={texture}
        parameters={{
          textureSize: 64,
          uvScale: [3, 4, 12],
          uvOrigin: [32, 48],
        }}
        position={[0.5, 0, 0]}
        rotation={[0, 0, 0]}
        scale={[3, 4, 12]}
      />
    </>
  );
}
