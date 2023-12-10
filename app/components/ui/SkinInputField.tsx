import { useState } from "react";

type SkinInputFieldProps = {
  searchParamName?: "skin" | "second-skin";
  defaultFieldValue?: string;
};

export function SkinInputField({
  searchParamName = "skin",
  defaultFieldValue = "",
}: SkinInputFieldProps) {
  const [skinInput, /* setSkinInput */] = useState<"file" | "url">(
    // skinUrl ? "url" : "file"
    "url"
  );

  const changeSkinInputHandle = () => {
    // setSkinInput((input) => (input === "file" ? "url" : "file"));
  };

  return (
    <div className='px-2 flex items-center rounded-md ring-orange-500 bg-white focus-within:ring transition shadow-lg overflow-hidden pointer-events-auto'>
      <button
        className='px-2 py-2 text-zinc-600 hover:text-orange-500 transition shrink-0'
        type='button'
        onClick={changeSkinInputHandle}
      >
        {skinInput === "file" ? (
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

      {skinInput === "url" ? (
        <input
          className='flex-1 py-2 px-2 outline-none placeholder:text-zinc-400'
          type='text'
          name={searchParamName}
          placeholder='paste link to skin here...'
          defaultValue={defaultFieldValue}
        />
      ) : (
        <input
          className='text-zinc-800 px-2 flex-1'
          type='file'
          accept='image/png'
        />
      )}
    </div>
  );
}
