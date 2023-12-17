import { useState } from "react";
import { IconButton } from "./IconButton";
import { XMarkIcon } from "@heroicons/react/24/outline";

type WidgetBaseProps = {
  children?: React.ReactNode;
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  // className?: { container?: string }
};

export function WidgetBase({
  title,
  icon,
  children,
  defaultOpen,
  // className
}: WidgetBaseProps) {
  const [open, setOpen] = useState(!!defaultOpen);

  const toggleWidgetHandle = () => setOpen((open) => !open);

  return (
    <>
      {!open && (
        <IconButton {...{ icon, title }} shadow onClick={toggleWidgetHandle} />
      )}

      {open && (
        <div className='rounded-md bg-white shadow-lg inline-block text-left pointer-events-auto max-h-[60vh] overflow-y-auto relative sm:px-4'>
          <div className='flex gap-4 justify-between pb-4 pt-4 sticky mx-4 top-0 left-0 bg-white z-10 sm:pt-6'>
            <p className='font-bold uppercase'>{title}</p>

            <button
              className='inline-block -m-4 p-4 text-zinc-600'
              type='button'
              onClick={toggleWidgetHandle}
              aria-label={'Close ' + title}
            >
              <XMarkIcon className='h-6 w-6 ' />
            </button>
          </div>

          <div className='flex flex-col px-4 pt-2 pb-4 sm:pb-6 gap-y-6'>
            {children}
          </div>
        </div>
      )}
    </>
  );
}
