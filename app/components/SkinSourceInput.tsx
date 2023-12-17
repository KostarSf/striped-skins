import { FolderIcon, GlobeAltIcon } from "@heroicons/react/24/outline";
import { useEffect, useRef, useState } from "react";
import { IconButton } from "./IconButton";

type SkinSourceInputProps = {
  defaultFieldValue?: string | null;
  onInputChange?: (url: string | null) => void;
};

export function SkinSourceInput({
  defaultFieldValue,
  onInputChange = (url) => {},
}: SkinSourceInputProps) {
  const [skinInput, setSkinInput] = useState<"file" | "url">(
    defaultFieldValue ? "url" : "file"
  );

  const urlInputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState("");

  const setSkinInputHandle = (input: "file" | "url") => {
    return () => {
      setSkinInput(input);
      setFileName("");
    };
  };

  useEffect(() => {
    if (urlInputRef.current) {
      urlInputRef.current.value = defaultFieldValue || "";
    }
  }, [defaultFieldValue])

  const uploadLocalImageHandle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files && e.currentTarget.files[0];
    if (!file) return;

    setFileName(file.name);

    const url = URL.createObjectURL(file);
    onInputChange(url);
  };

  const clearSkinHandle = () => {
    setFileName("");
    onInputChange(null);

    if (urlInputRef.current) {
      urlInputRef.current.value = "";
    }
  };

  return (
    <form
      className='flex gap-2 flex-1'
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        onInputChange((formData.get("field") as string) ?? "");
      }}
    >
      <InputContainer
        active={skinInput === "file"}
        icon='folder'
        onButtonClick={setSkinInputHandle("file")}
      >
        <label
          className={
            "px-2 flex-1 cursor-pointer hover:text-orange-500 transition overflow-hidden whitespace-nowrap text-ellipsis w-0" +
            (fileName ? " text-zinc-800" : " text-zinc-400")
          }
        >
          {fileName || "choose skin locally..."}
          <input
            className='opacity-0 absolute pointer-events-none'
            type='file'
            accept='image/png'
            onChange={uploadLocalImageHandle}
          />
        </label>
        {fileName && <ClearButton onClick={clearSkinHandle} />}
      </InputContainer>

      <InputContainer
        active={skinInput === "url"}
        icon='globus'
        onButtonClick={setSkinInputHandle("url")}
      >
        <input
          className='flex-1 py-2 px-2 outline-none placeholder:text-zinc-400 min-w-0 w-0'
          ref={urlInputRef}
          type='text'
          name='field'
          placeholder='paste link to skin...'
          defaultValue={defaultFieldValue ?? ''}
        />
        {defaultFieldValue && <ClearButton onClick={clearSkinHandle} />}
      </InputContainer>
    </form>
  );
}

function ClearButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      className='px-2 py-2 hover:text-orange-500 text-zinc-400 transition'
      onClick={onClick}
      type="reset"
    >
      clear
    </button>
  );
}

function InputContainer({
  children,
  icon,
  active,
  onButtonClick,
}: {
  active: boolean;
  icon: "folder" | "globus";
  onButtonClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className={
        "flex items-center rounded-md ring-orange-500 bg-white focus-within:ring transition-all shadow-lg overflow-hidden pointer-events-auto" +
        (active ? " w-full" : " w-14 shrink-0")
      }
    >
      <IconButton
        icon={
          icon === "folder" ? (
            <FolderIcon className='h-6 w-6' />
          ) : (
            <GlobeAltIcon className='h-6 w-6' />
          )
        }
        onClick={onButtonClick}
        disabled={active}
        shadow={false}
      />
      {active && children}
    </div>
  );
}
