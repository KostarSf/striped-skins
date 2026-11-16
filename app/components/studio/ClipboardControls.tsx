import { useTranslation } from "react-i18next";
import {
  ClipboardDocumentIcon,
  DocumentDuplicateIcon,
  ScissorsIcon,
} from "@heroicons/react/24/outline";
import { IconButton } from "./ui";
import type { SelectionClipboardActions } from "./useSelectionClipboard";

export function ClipboardControls({ actions }: { actions: SelectionClipboardActions }) {
  const { t } = useTranslation();
  return (
    <fieldset className="inline-controls clipboard-controls">
      <legend className="sr-only">{t("clipboard.label")}</legend>
      <IconButton
        label={t("clipboard.cut")}
        title={t("clipboard.cutShortcut")}
        disabled={!actions.canCut}
        onClick={actions.cut}
      >
        <ScissorsIcon />
      </IconButton>
      <IconButton
        label={t("clipboard.copy")}
        title={t("clipboard.copyShortcut")}
        disabled={!actions.canCopy}
        onClick={actions.copy}
      >
        <DocumentDuplicateIcon />
      </IconButton>
      <IconButton
        label={t("clipboard.paste")}
        title={t("clipboard.pasteShortcut")}
        disabled={!actions.canPaste}
        onClick={actions.paste}
      >
        <ClipboardDocumentIcon />
      </IconButton>
    </fieldset>
  );
}
