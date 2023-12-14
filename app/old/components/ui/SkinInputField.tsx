import { useRef, useState } from "react";

type SkinInputFieldProps = {
  searchParamName?: "skin" | "second-skin";
  defaultFieldValue?: string;
  onImageChange?: (url: string) => void;
};

export function SkinInputField({
  searchParamName = "skin",
  defaultFieldValue = "",
  onImageChange = (url) => {},
}: SkinInputFieldProps) {
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

  const uploadLocalImageHandle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files && e.currentTarget.files[0];
    if (!file) return;

    setFileName(file.name);

    const url = URL.createObjectURL(file);
    onImageChange(url);
  };

  const clearSkinHandle = () => {
    setFileName("");
    onImageChange("");

    if (urlInputRef.current) urlInputRef.current.value = "";
  };

  return (
    <div className='flex gap-2'>
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
          name={searchParamName}
          placeholder='paste link to skin...'
          defaultValue={defaultFieldValue}
        />
        {defaultFieldValue && <ClearButton onClick={clearSkinHandle} />}
      </InputContainer>
    </div>
  );
}

function ClearButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      className='px-2 py-2 hover:text-orange-500 text-zinc-400 transition'
      onClick={onClick}
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
        "px-2 flex items-center rounded-md ring-orange-500 bg-white focus-within:ring transition-all shadow-lg overflow-hidden pointer-events-auto" +
        (active ? " w-full" : " w-14 shrink-0")
      }
    >
      <IconButton icon={icon} onClick={onButtonClick} disabled={active} />
      {active && children}
    </div>
  );
}

function IconButton({
  icon,
  onClick,
  disabled,
}: {
  onClick: () => void;
  icon: "folder" | "globus";
  disabled?: boolean;
}) {
  return (
    <button
      className={
        "px-2 py-2 text-zinc-600 transition shrink-0" +
        (disabled ? "" : " hover:text-orange-500 ")
      }
      type='button'
      onClick={onClick}
      disabled={disabled}
    >
      {icon === "folder" ? (
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
            d='M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z'
          />
        </svg>
      ) : (
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
            d='M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418'
          />
        </svg>
      )}
    </button>
  );
}
