import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import type { Group, Object3DEventMap } from "three";
import { Plane } from "~/components/model-components/Plane";
import { useSkinTextureContext } from "~/components/model-components/skinTextureContext";
import type { LayoutDimensions } from "~/components/model-components/types";

export default function ChangelingWings() {
  const { oldSkinFormat } = useSkinTextureContext();

  const outerWingsLayout: LayoutDimensions = [56, 16, 8, 16];
  const innerWingsLayout: LayoutDimensions = oldSkinFormat
    ? outerWingsLayout
    : [56, 32, 8, 16];

  const outerRightWing = useRef<Group<Object3DEventMap>>(null!);
  const outerLeftWing = useRef<Group<Object3DEventMap>>(null!);

  const innerRightWing = useRef<Group<Object3DEventMap>>(null!);
  const innerLeftWing = useRef<Group<Object3DEventMap>>(null!);

  const invalidate = useThree((state) => state.invalidate);

  useFrame(({ clock }) => {
    const angle = Math.sin(clock.elapsedTime * 2) / 10;

    outerRightWing.current.rotation.z = -0.95 - angle;
    outerLeftWing.current.rotation.z = 0.95 + angle;

    innerRightWing.current.rotation.z = -1.1 - angle;
    innerLeftWing.current.rotation.z = 1.1 + angle;

    invalidate();
  });

  return (
    <>
      <group
        ref={outerRightWing}
        position={[-0.75, 0.7, 0.8]}
        rotation={[-0.3, -0.25, 0]}
      >
        <Plane
          layout={outerWingsLayout}
          position={[-1.6, 0, 0]}
          rotation={[-Math.PI / 2, 0, -Math.PI / 2]}
          scale={[8, 16]}
          doubleSide
        />
      </group>

      <group
        ref={outerLeftWing}
        position={[0.75, 0.7, 0.8]}
        rotation={[-0.3, 0.25, 0]}
      >
        <Plane
          layout={outerWingsLayout}
          position={[1.6, 0, 0]}
          rotation={[-Math.PI / 2, 0, Math.PI / 2]}
          scale={[8, 16]}
          doubleSide
        />
      </group>

      <group
        ref={innerRightWing}
        position={[-0.3, 0.7, 0.4]}
        rotation={[-0.2, -0.1, 0]}
      >
        <Plane
          layout={innerWingsLayout}
          position={[-1.6, 0, 0]}
          rotation={[-Math.PI / 2, 0, -Math.PI / 2]}
          scale={[8, 16]}
          doubleSide
        />
      </group>

      <group
        ref={innerLeftWing}
        position={[0.3, 0.7, 0.4]}
        rotation={[-0.2, 0.1, 0]}
      >
        <Plane
          layout={innerWingsLayout}
          position={[1.6, 0, 0]}
          rotation={[-Math.PI / 2, 0, Math.PI / 2]}
          scale={[8, 16]}
          doubleSide
        />
      </group>
    </>
  );
}
