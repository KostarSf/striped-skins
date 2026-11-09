import { useTranslation } from "react-i18next";
import type { SkinDocument } from "@striped-skins/api";
import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
} from "@heroicons/react/24/outline";
import { IconButton } from "./ui";

export function MoveControls({ document: skin }: { document: SkinDocument }) {
  const { t } = useTranslation();
  return (
    <div className="inline-controls">
      {(
        [
          ["left", -1, 0, ArrowLeftIcon],
          ["up", 0, -1, ArrowUpIcon],
          ["down", 0, 1, ArrowDownIcon],
          ["right", 1, 0, ArrowRightIcon],
        ] as const
      ).map(([direction, dx, dy, Icon]) => (
        <IconButton
          key={direction}
          label={t(`move.${direction}`)}
          disabled={!!skin.moveBlockedReason}
          onClick={() => skin.movePixels(dx, dy)}
        >
          <Icon />
        </IconButton>
      ))}
    </div>
  );
}
