import { useSkinTextureContext } from "~/components/model-components/skinTextureContext";
import { RegularClosedWing } from "./RegularClosedWing";

export default function RegularWings() {
  const { oldSkinFormat } = useSkinTextureContext();

  return (
    <>
      <RegularClosedWing position={[-1, 0, 0]} side='right' />

      <group rotation={[0, 0, oldSkinFormat ? Math.PI : 0]}>
        <RegularClosedWing
          position={[oldSkinFormat ? -1 : 1, 0, 0]}
          side={oldSkinFormat ? "right" : "left"}
          mirrored={oldSkinFormat}
        />
      </group>
    </>
  );
}
