import { InformationCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import type { PonySkin } from "@striped-skins/api";
import { useState } from "react";

type PonyInfoWidgetProps = {
  skin: PonySkin;
  defaultOpen?: boolean;
  canCollapse?: boolean;
};

export default function PonyInfoWidget({
  skin,
  defaultOpen,
  canCollapse = true,
}: PonyInfoWidgetProps) {
  const [open, setOpen] = useState(!!defaultOpen);

  const { race, snout, tailLength, body, magicGlow, tailShape, wearables } =
    skin;

  return !open ? (
    <button
      className='px-4 py-2 bg-white rounded-md shadow-lg hover:text-orange-500 transition text-zinc-600 pointer-events-auto'
      onClick={() => setOpen(true)}
    >
      <InformationCircleIcon className='w-6 h-6' />
    </button>
  ) : (
    <div className='rounded-md bg-white shadow-lg inline-block text-left pointer-events-auto max-h-[60vh] overflow-y-auto relative sm:px-4'>
      <div className='flex gap-4 justify-between pb-4 pt-4 sticky mx-4 top-0 left-0 bg-white z-10 sm:pt-6'>
        <p className='font-bold uppercase'>Skin info</p>

        <button
          className='inline-block -m-4 p-4 text-zinc-600'
          type='button'
          onClick={() => setOpen(false)}
        >
          <XMarkIcon className='h-6 w-6 ' />
        </button>
      </div>

      <div className='flex flex-col px-4 pt-2 pb-4 sm:pb-6 gap-y-6'>
        <PixelParameter
          title='Race'
          value={race.name}
          pixel={race.pixel}
          canCollapse={canCollapse}
        />
        <PixelParameter
          title='Body'
          value={body.name}
          pixel={body.pixel}
          canCollapse={canCollapse}
        />
        <PixelParameter
          title='Snout'
          value={snout.name}
          pixel={snout.pixel}
          canCollapse={canCollapse}
        />
        <PixelParameter
          title='Tail Length'
          value={tailLength.name}
          pixel={tailLength.pixel}
          canCollapse={canCollapse}
        />
        <PixelParameter
          title='Tail Shape'
          value={tailShape.name}
          pixel={tailShape.pixel}
          canCollapse={canCollapse}
        />
        <PixelParameter
          title='Magic'
          pixel={magicGlow}
          canCollapse={canCollapse}
        />
        <PixelParameter
          title='Wearables'
          pixel={wearables.rawPixel}
          canCollapse={canCollapse}
        />
        {wearables.items.map((item, i) => (
          <PixelParameter
            key={i}
            value={item.name}
            pixel={item.pixel}
            canCollapse={canCollapse}
          />
        ))}
      </div>
    </div>
  );
}

function PixelParameter({
  pixel,
  title,
  value,
  canCollapse,
}: {
  pixel: string;
  title?: string;
  value?: string;
  canCollapse?: boolean;
}) {
  const none = pixel === "none";
  const hexColor = (none ? "" : "#") + pixel.toUpperCase();

  return (
    <div
      className={"flex gap-2" + (canCollapse ? " flex-col sm:flex-row" : "")}
    >
      {title && (
        <p className='font-semibold w-24 sm:w-[clamp(6rem,calc(6rem+2.5vw),12rem)] shrink-0'>
          {title}
        </p>
      )}
      <div className='flex items-center gap-2'>
        <div
          className={
            "w-4 h-4 rounded-md shadow-sm shrink-0" + (none ? " border" : "")
          }
          title={hexColor}
          style={{ backgroundColor: "#" + pixel.padStart(6, "0") }}
        />
        <div className='relative'>
          <p
            className={
              value
                ? "text-base/none"
                : "text-xs/tight font-bold uppercase text-zinc-400"
            }
          >
            {value ? value : hexColor}
          </p>
          <p className='text-xs/tight font-bold absolute left-0 top-full text-zinc-400'>
            {value && hexColor}
          </p>
        </div>
      </div>
    </div>
  );
}
