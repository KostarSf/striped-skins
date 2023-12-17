import { InformationCircleIcon } from "@heroicons/react/24/outline";
import type { PonySkin } from "@striped-skins/api";
import { WidgetBase } from "./WidgetBase";
import React from "react";

type PonyInfoWidgetProps = {
  skin: PonySkin | PonySkin[];
  defaultOpen?: boolean;
  canCollapse?: boolean;
};

export default function PonyInfoWidget({
  skin,
  defaultOpen,
  canCollapse = true,
}: PonyInfoWidgetProps) {
  const skins = Array.isArray(skin) ? skin : [skin];

  return (
    <WidgetBase
      title='Skin info'
      icon={<InformationCircleIcon className='w-6 h-6' />}
      defaultOpen={defaultOpen}
    >
      <PixelParameter title='Race' canCollapse={canCollapse}>
        {skins.map((skin, i) => (
          <PixelValue key={i} pixel={skin.race.pixel} value={skin.race.name} />
        ))}
      </PixelParameter>

      <PixelParameter title='Body' canCollapse={canCollapse}>
        {skins.map((skin, i) => (
          <PixelValue key={i} pixel={skin.body.pixel} value={skin.body.name} />
        ))}
      </PixelParameter>

      <PixelParameter title='Snout' canCollapse={canCollapse}>
        {skins.map((skin, i) => (
          <PixelValue
            key={i}
            pixel={skin.snout.pixel}
            value={skin.snout.name}
          />
        ))}
      </PixelParameter>

      <PixelParameter title='Tail Length' canCollapse={canCollapse}>
        {skins.map((skin, i) => (
          <PixelValue
            key={i}
            pixel={skin.tailLength.pixel}
            value={skin.tailLength.name}
          />
        ))}
      </PixelParameter>

      <PixelParameter title='Tail Shape' canCollapse={canCollapse}>
        {skins.map((skin, i) => (
          <PixelValue
            key={i}
            pixel={skin.tailShape.pixel}
            value={skin.tailShape.name}
          />
        ))}
      </PixelParameter>

      <PixelParameter title='Magic' canCollapse={canCollapse}>
        {skins.map((skin, i) => (
          <PixelValue key={i} pixel={skin.magicGlow} />
        ))}
      </PixelParameter>

      <PixelParameter title='Wearables' canCollapse={canCollapse}>
        {skins.map((skin, i) => (
          <PixelValue key={i} pixel={skin.wearables.rawPixel} />
        ))}
      </PixelParameter>

      {skins.some(skin => skin.wearables.items.length > 0) && (
        <div className='flex gap-2 justify-end'>
          {skins.map((skin, i) => (
            <div className='flex gap-8 flex-col min-w-[9rem]' key={i}>
              {skin.wearables.items.map((item, i) => (
                <PixelParameter key={i} canCollapse={canCollapse}>
                  <PixelValue pixel={item.pixel} value={item.name} />
                </PixelParameter>
              ))}
            </div>
          ))}
        </div>
      )}
    </WidgetBase>
  );
}

function PixelParameter({
  title,
  canCollapse,
  children,
}: {
  title?: string;
  canCollapse?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={"flex gap-2" + (canCollapse ? " flex-col sm:flex-row" : "")}
    >
      {title && (
        <p className='font-semibold w-24 sm:w-[clamp(6rem,calc(6rem+2.5vw),12rem)] shrink-0'>
          {title}
        </p>
      )}
      <div className='flex gap-2 items-start'>{children}</div>
    </div>
  );
}

function PixelValue({ pixel, value }: { pixel: string; value?: string }) {
  const none = pixel === "none";
  const hexColor = (none ? "" : "#") + pixel.toUpperCase();

  return (
    <div className='flex items-center gap-2 min-w-[9rem]'>
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
  );
}
