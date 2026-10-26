import { SkinSourceInput } from "./SkinSourceInput";
import { useEditorContext } from "./EditorContext";
import PonyInfoWidget from "./PonyInfoWidget";
import { usePonyContext, useViewerPreferencesContext } from "./striped-viewer.client";
import { IconButton } from "./IconButton";
import { ScaleIcon } from "@heroicons/react/24/outline";
import { LoadingScreen } from "./LoadingScreen";
import OptionsWidget from "./OptionsWidget";
import { Link, useLocation } from "react-router";

function EditLink({ slot }: { slot: "first" | "second" }) {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  params.set("slot", slot);
  return (
    <Link
      className="pointer-events-auto rounded bg-orange-500 px-3 py-2 text-sm text-white shadow"
      to={`/editor?${params}`}
    >
      {slot === "second" ? "Редактировать второй" : "Редактировать"}
    </Link>
  );
}

function LoadErrors() {
  const errors = useViewerPreferencesContext((s) =>
    [s.defaultSkinError, s.firstSkinError, s.secondSkinError].filter(Boolean).join("; "),
  );
  return errors ? (
    <p role="alert" className="pointer-events-auto rounded bg-red-950 p-3 text-sm text-red-100">
      Не удалось открыть скин: {errors}
    </p>
  ) : null;
}
export function EditorInterface() {
  const { mode } = useViewerPreferencesContext((state) => state);

  return (
    <div className="absolute left-0 right-0 top-0 bottom-0 flex flex-col pointer-events-none pt-4 pb-9 px-4">
      <LoadErrors />
      {mode === "side-by-side" ? <SideBySideSkinInterface /> : <SingleSkinInterface />}
    </div>
  );
}

function SingleSkinInterface() {
  const { firstSkin, setFirstSkin } = useEditorContext();
  const { firstPony } = usePonyContext((state) => state);

  const { setMode, loadingFirstSkin, loadingDefaultSkin } = useViewerPreferencesContext(
    (state) => state,
  );

  const loadingSkin = loadingDefaultSkin || loadingFirstSkin;

  return (
    <>
      <div className="lg:max-w-screen-lg mx-auto w-full flex-1">
        <SkinSourceInput
          defaultFieldValue={firstSkin}
          onInputChange={setFirstSkin}
          loading={loadingFirstSkin}
        />

        <div className="mt-2 flex items-start gap-2 justify-between">
          <IconButton
            icon={<ScaleIcon className="w-6 h-6" />}
            onClick={() => setMode("side-by-side")}
            title="Comparison mode"
          />

          <OptionsWidget />
          <EditLink slot="first" />
        </div>
      </div>

      <div className="w-full py-2 lg:max-w-screen-lg mx-auto flex justify-end">
        <PonyInfoWidget skin={firstPony.skin} canCollapse={false} />
      </div>

      {loadingSkin && (
        <div className="absolute inset-0">
          <LoadingScreen />
        </div>
      )}
    </>
  );
}

function SideBySideSkinInterface() {
  const { firstSkin, secondSkin, setFirstSkin, setSecondSkin } = useEditorContext();
  const { firstPony, secondPony } = usePonyContext((state) => state);

  const { setMode, loadingFirstSkin, loadingSecondSkin } = useViewerPreferencesContext(
    (state) => state,
  );

  return (
    <>
      <div className="w-full flex-1">
        <div className="flex flex-col md:flex-row gap-x-4 gap-y-2 max-w-screen-2xl mx-auto">
          <SkinSourceInput
            defaultFieldValue={firstSkin}
            onInputChange={setFirstSkin}
            loading={loadingFirstSkin}
          />

          <SkinSourceInput
            defaultFieldValue={secondSkin}
            onInputChange={setSecondSkin}
            loading={loadingSecondSkin}
          />
        </div>

        <div className="mt-2 max-w-screen-2xl mx-auto flex gap-2 items-start justify-between">
          <IconButton
            icon={<ScaleIcon className="w-6 h-6" />}
            onClick={() => setMode("first-model")}
            title="Comparison mode"
          />

          <OptionsWidget />
          <EditLink slot="first" />
          <EditLink slot="second" />
        </div>
      </div>

      <div className="py-2 flex items-end justify-end max-w-screen-2xl mx-auto w-full">
        <PonyInfoWidget skin={[firstPony.skin, secondPony.skin]} />
      </div>
    </>
  );
}
