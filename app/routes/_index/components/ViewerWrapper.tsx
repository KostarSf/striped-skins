import { useNavigation } from "@remix-run/react";
import { SkinViewer } from "~/components/SkinViewer";
import { LoadingScreen } from "~/components/ui/LoadingScreen";

type ViewerWrapperProps = { skinUrl: string; comparedSkinUrl: string | null };

export function ViewerWrapper({ skinUrl, comparedSkinUrl }: ViewerWrapperProps) {

  const navigation = useNavigation();
  const skinIsLoaded = navigation.state === "idle";

  return (
    <div className='absolute inset-0 flex'>
      {skinIsLoaded ? (
        <SkinViewer skinUrl={skinUrl} compareSkinUrl={comparedSkinUrl} />
      ) : (
        <LoadingScreen />
      )}
    </div>
  );
}
