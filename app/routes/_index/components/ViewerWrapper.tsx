import { SkinViewer } from "~/components/SkinViewer";
import { LoadingScreen } from "~/components/ui/LoadingScreen";

type ViewerWrapperProps = { skinUrl: string; skinIsLoaded: boolean };

export function ViewerWrapper({ skinUrl, skinIsLoaded }: ViewerWrapperProps) {
  return (
    <div className='absolute inset-0'>
      {skinIsLoaded ? <SkinViewer skinUrl={skinUrl} /> : <LoadingScreen />}
    </div>
  );
}
