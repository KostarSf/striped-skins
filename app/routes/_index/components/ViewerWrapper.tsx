import { useNavigation } from "@remix-run/react";
import { SkinViewer } from "~/components/skin-viewer/SkinViewer";
import { LoadingScreen } from "~/components/ui/LoadingScreen";

// type ViewerWrapperProps = { skinUrl: string; comparedSkinUrl: string | null };

export function ViewerWrapper() {

  const navigation = useNavigation();
  const skinIsLoaded = navigation.state === "idle";

  return (
    <div className='absolute inset-0 flex'>
      {skinIsLoaded ? (
        <SkinViewer />
      ) : (
        <LoadingScreen />
      )}
    </div>
  );
}
