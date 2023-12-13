import { Form, useSearchParams } from "@remix-run/react";
import { usePonyPreferencesManager } from "~/api/PonyPreferencesManager";
import type { ComparisonModeType } from "~/components/skin-viewer/ViewerParametersContext";
import {
  SECOND_SKIN_SEARCH_PARAM,
  SKIN_SEARCH_PARAM,
  useViewerParameters,
} from "~/components/skin-viewer/ViewerParametersContext";
import { SkinInputField } from "~/components/ui/SkinInputField";
import { APP_VERSION } from "~/constants";
import SkinInfoWidget from "./SkinInfoWidget";

export function Interface() {
  const [params] = useSearchParams();
  const skinUrl = params.get(SKIN_SEARCH_PARAM) ?? "";
  const comparedSkinUrl = params.get(SECOND_SKIN_SEARCH_PARAM) ?? "";

  const { comparisonMode, setComparisonMode, setFirstSkin, setSecondSkin } =
    useViewerParameters();
  const { firstPony, secondPony } = usePonyPreferencesManager();

  const switchComparisonModeHandle = (type: ComparisonModeType) => {
    return () => setComparisonMode(type);
  };

  const setFirstSkinHandle = (url: string) => {
    setFirstSkin(url, false)
  }

  const setSecondSkinHandle = (url: string) => {
    setSecondSkin(url, false);
  };

  return (
    <>
      <div className='absolute left-0 top-0 right-0 p-4 pointer-events-none'>
        <Form
          className='flex w-full justify-evenly xl:gap-5 flex-col xl:flex-row items-center xl:items-start'
          method='GET'
        >
          <input type='submit' hidden />

          <div className='max-w-screen-md flex-1 max-xl:w-full'>
            <SkinInputField
              defaultFieldValue={skinUrl}
              onImageChange={setFirstSkinHandle}
            />
            <div className='mt-2 flex justify-between items-start gap-2'>
              {comparisonMode === "off" && (
                <button
                  className='text-zinc-600 bg-white rounded-md px-4 py-2 hover:text-orange-500 transition shadow-lg pointer-events-auto'
                  onClick={switchComparisonModeHandle("side-by-side")}
                  title='Comparison mode'
                >
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    fill='none'
                    viewBox='0 0 24 24'
                    strokeWidth={1.5}
                    stroke='currentColor'
                    className='w-6 h-6'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      d='M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 01-2.031.352 5.989 5.989 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971z'
                    />
                  </svg>
                </button>
              )}

              {comparisonMode === "off" && (
                <SkinInfoWidget skin={firstPony.skin} />
              )}
            </div>
          </div>

          {comparisonMode !== "off" && (
            <>
              <div className='max-w-screen-md flex-1 max-xl:w-full'>
                <div className='flex gap-2 items-start'>
                  <button
                    className='text-zinc-600 bg-white rounded-md px-4 py-2 hover:text-orange-500 transition shadow-lg pointer-events-auto'
                    onClick={switchComparisonModeHandle("off")}
                    title='Quit comparison mode'
                  >
                    <svg
                      xmlns='http://www.w3.org/2000/svg'
                      fill='none'
                      viewBox='0 0 24 24'
                      strokeWidth={1.5}
                      stroke='currentColor'
                      className='w-6 h-6'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        d='M6 18L18 6M6 6l12 12'
                      />
                    </svg>
                  </button>

                  <div className='flex-1'>
                    <SkinInputField
                      defaultFieldValue={comparedSkinUrl}
                      onImageChange={setSecondSkinHandle}
                      searchParamName='second-skin'
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </Form>

        {comparisonMode === "side-by-side" && (
          <div className='flex justify-between w-full max-xl:max-w-screen-md xl:justify-evenly gap-4 mx-auto max-xl:mt-2'>
            <div className='max-w-screen-md xl:w-full'>
              <SkinInfoWidget skin={firstPony.skin} />
            </div>
            <div className='max-w-screen-md xl:w-full flex gap-2 justify-end items-start'>
              <SkinInfoWidget skin={secondPony.skin} />
            </div>
          </div>
        )}
      </div>

      <div className='absolute left-0 bottom-0 right-0 p-4'>
        <p className='text-xs/none text-zinc-300 font-mono'>
          {`v${APP_VERSION}`}
        </p>
      </div>
    </>
  );
}
