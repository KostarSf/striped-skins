import { Form, useSearchParams } from "@remix-run/react";
import { useState } from "react";
import { SkinInputField } from "~/components/ui/SkinInputField";
import { APP_VERSION } from "~/constants";

export function Interface() {
  const [params, setParams] = useSearchParams();
  const skinUrl = params.get("skin") ?? "";
  const comparedSkinUrl = params.get("compare-with") ?? "";

  const [enableComparison, setEnableComparison] = useState(!!comparedSkinUrl);

  const switchComparisonModeHandle = () => {
    setEnableComparison((comparison) => {
      if (comparison) {
        params.delete("compare-with");
      } else {
        params.set("compare-with", params.get("skin") || "");
      }

      setParams(params);

      return !comparison;
    });
  };

  return (
    <>
      <div className='absolute left-0 top-0 right-0 p-4'>
        <Form
          className='flex w-full justify-evenly xl:gap-5 flex-col xl:flex-row items-center xl:items-start'
          method='GET'
        >
          <input type='submit' hidden />

          <div className='max-w-screen-md flex-1 max-xl:w-full'>
            <SkinInputField defaultFieldValue={skinUrl} />
            <div className='mt-2 flex justify-between'>
              {!enableComparison && (
                <button
                  className='text-zinc-600 bg-white rounded-md px-4 py-2 hover:text-orange-500 transition shadow-lg'
                  onClick={switchComparisonModeHandle}
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

              {/* <button className='px-4 py-2 bg-white rounded-md shadow-lg hover:text-orange-500 transition'>
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
                    d='M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z'
                  />
                </svg>
              </button> */}
            </div>
          </div>

          {enableComparison && (
            <div className='max-w-screen-md flex-1 max-xl:w-full'>
              <div className='flex gap-2 items-start'>
                <button
                  className='text-zinc-600 bg-white rounded-md px-4 py-2 hover:text-orange-500 transition shadow-lg'
                  onClick={switchComparisonModeHandle}
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
                    searchParamName='compare-with'
                  />
                </div>
              </div>

              {/* <div className='mt-2 flex justify-end'>
                <button className='px-4 py-2 bg-white rounded-md shadow-lg hover:text-orange-500 transition'>
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
                      d='M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z'
                    />
                  </svg>
                </button>
              </div> */}
            </div>
          )}
        </Form>
      </div>

      <div className='absolute left-0 bottom-0 right-0 p-4'>
        <p className='text-xs/none text-zinc-300 font-mono'>
          {`v${APP_VERSION}`}
        </p>
      </div>
    </>
  );
}
