import { APP_VERSION } from "~/constants";
import { SkinSourceInput } from "./SkinSourceInput";
import { useEditorContext } from "./EditorContext";

export function EditorInterface() {
  const { firstSkin, setFirstSkin } = useEditorContext();

  return (
    <>
      <div className='absolute left-0 right-0 top-0 pointer-events-none pt-4'>
        <div className='max-w-screen-md mx-auto'>
          <SkinSourceInput
            defaultFieldValue={firstSkin}
            onInputChange={setFirstSkin}
          />
        </div>
      </div>

      <div className='absolute left-0 right-0 bottom-0 pointer-events-none p-4'>
        <p className='text-zinc-400 text-xs/none font-mono'>
          {"v" + APP_VERSION}
        </p>
      </div>
    </>
  );
}
