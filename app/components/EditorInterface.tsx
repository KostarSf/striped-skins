import { SkinSourceInput } from "./SkinSourceInput";
import { useEditorContext } from "./EditorContext";
import PonyInfoWidget from "./PonyInfoWidget";
import {
  usePonyContext,
  useViewerPreferencesContext,
} from "./striped-viewer.client";
import { IconButton } from "./IconButton";
import { ScaleIcon } from "@heroicons/react/24/outline";

export function EditorInterface() {
  const { mode } = useViewerPreferencesContext((state) => state);

  return (
    <div className='absolute left-0 right-0 top-0 bottom-0 flex flex-col pointer-events-none pt-4 pb-9 px-4'>
      {mode === "side-by-side" ? (
        <SideBySideSkinInterface />
      ) : (
        <SingleSkinInterface />
      )}
    </div>
  );
}

function SingleSkinInterface() {
  const { firstSkin, setFirstSkin } = useEditorContext();
  const { firstPony } = usePonyContext((state) => state);

  const { setMode } = useViewerPreferencesContext((state) => state);

  return (
    <>
      <div className='lg:max-w-screen-lg mx-auto w-full flex-1'>
        <SkinSourceInput
          defaultFieldValue={firstSkin}
          onInputChange={setFirstSkin}
        />

        <div className='inline-block mt-2 pointer-events-auto'>
          <IconButton
            icon={<ScaleIcon className='w-6 h-6' />}
            onClick={() => setMode("side-by-side")}
            title='Comparison mode'
          />
        </div>
      </div>

      <div className='w-full py-2 lg:max-w-screen-lg mx-auto flex justify-end'>
        <PonyInfoWidget skin={firstPony.skin} />
      </div>
    </>
  );
}

function SideBySideSkinInterface() {
  const { firstSkin, secondSkin, setFirstSkin, setSecondSkin } =
    useEditorContext();
  const { firstPony, secondPony } = usePonyContext((state) => state);

  const { setMode } = useViewerPreferencesContext((state) => state);

  return (
    <>
      <div className='w-full flex-1'>
        <div className='flex flex-col md:flex-row gap-x-4 gap-y-2 max-w-screen-2xl mx-auto'>
          <SkinSourceInput
            defaultFieldValue={firstSkin}
            onInputChange={setFirstSkin}
          />

          <SkinSourceInput
            defaultFieldValue={secondSkin}
            onInputChange={setSecondSkin}
          />
        </div>

        <div className='mt-2 max-w-screen-2xl mx-auto'>
          <IconButton
            icon={<ScaleIcon className='w-6 h-6' />}
            onClick={() => setMode("first-model")}
            title='Comparison mode'
          />
        </div>
      </div>

      <div className='py-2 flex items-end justify-between max-w-screen-2xl mx-auto w-full'>
        <PonyInfoWidget skin={firstPony.skin} />
        <PonyInfoWidget skin={secondPony.skin} />
      </div>
    </>
  );
}
