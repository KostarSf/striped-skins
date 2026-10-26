import type { PonySkin } from "@striped-skins/api";
import { forwardRef } from "react";
import type { Group } from "three";
import type { ThreeElements } from "@react-three/fiber";
import type { GeneratedPonyProps } from "../../../models/GeneratedPony.js";
import { GeneratedPony } from "../../../models/GeneratedPony.js";
import { useViewerPreferencesContext } from "../../../store/viewer-preferences.context.js";
export const PonyModel = forwardRef<
  Group,
  { skin: PonySkin } & Pick<GeneratedPonyProps, "preview" | "hidden" | "motionLayers"> &
    ThreeElements["group"]
>(function PonyModel({ skin, preview, hidden, motionLayers, ...props }, ref) {
  const animations = useViewerPreferencesContext((s) => s.userOptions.animations);
  return (
    <group ref={ref} {...props}>
      <GeneratedPony
        document={skin.document}
        animate={animations}
        preview={preview}
        hidden={hidden}
        motionLayers={motionLayers}
      />
    </group>
  );
});
