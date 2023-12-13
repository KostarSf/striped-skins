import type { PonySkin } from "@striped-skins/api";
import { useState } from "react";

type SkinInfoWidgetProps = {
  skin: PonySkin;
  defaultOpen?: boolean;
};

export default function SkinInfoWidget({
  skin,
  defaultOpen,
}: SkinInfoWidgetProps) {
  const [open, setOpen] = useState(!!defaultOpen);

  const { race, snout, tailLength, body, magicGlow, tailShape, wearables } =
    skin;

  return !open ? (
    <button
      className='px-4 py-2 bg-white rounded-md shadow-lg hover:text-orange-500 transition text-zinc-600 pointer-events-auto'
      onClick={() => setOpen(true)}
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
          d='M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z'
        />
      </svg>
    </button>
  ) : (
    <div className='rounded-md bg-white shadow-lg inline-block text-left pointer-events-auto'>
      <div className='flex justify-between'>
        <p className='font-bold uppercase px-4 py-2'>Skin info</p>
        <button
          className='px-4 py-2 hover:text-orange-500 transition text-zinc-600'
          onClick={() => setOpen(false)}
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
      </div>

      <div className='flex flex-col px-4 pt-2 pb-6 gap-y-6'>
        <PixelParameter title='Race' value={race.name} pixel={race.pixel} />
        <PixelParameter title='Body' value={body.name} pixel={body.pixel} />
        <PixelParameter title='Snout' value={snout.name} pixel={snout.pixel} />
        <PixelParameter
          title='Tail Length'
          value={tailLength.name}
          pixel={tailLength.pixel}
        />
        <PixelParameter
          title='Tail Shape'
          value={tailShape.name}
          pixel={tailShape.pixel}
        />
        <PixelParameter title='Magic' pixel={magicGlow} />
        <PixelParameter title='Wearables' pixel={wearables.rawPixel} />
        {wearables.items.map((item, i) => (
          <PixelParameter key={i} value={item.name} pixel={item.pixel} />
        ))}
      </div>
    </div>
  );
}

function PixelParameter({
  pixel,
  title,
  value,
}: {
  pixel: string;
  title?: string;
  value?: string;
}) {
  const none = pixel === "none";
  const hexColor = (none ? "" : "#") + pixel.toUpperCase();

  return (
    <div className='flex flex-col sm:flex-row gap-2'>
      {title && <p className='font-semibold w-24 shrink-0'>{title}</p>}
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
