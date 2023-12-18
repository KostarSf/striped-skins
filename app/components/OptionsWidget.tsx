import { Cog6ToothIcon } from "@heroicons/react/24/outline";
import { WidgetBase } from "./WidgetBase";
import { useViewerPreferencesContext } from "./striped-viewer.client";
import { useId } from "react";

export default function OptionsWidget() {
  const { userOptions, setUserOptions } = useViewerPreferencesContext(
    (state) => state
  );

  const toggleOptionHandle = (option: keyof typeof userOptions) => {
    return (value: boolean) => {
      setUserOptions({ [option]: value });
      localStorage.setItem(`viewer.options.${option}`, value ? "on" : "");
    };
  };

  return (
    <WidgetBase title='Options' icon={<Cog6ToothIcon className='w-6 h-6' />}>
      <Option
        title='Antialiasing'
        value={userOptions.antialiasing}
        onChange={toggleOptionHandle("antialiasing")}
      />

      <Option
        title='Smooth Camera'
        value={userOptions.smoothCamera}
        onChange={toggleOptionHandle("smoothCamera")}
      />

      <Option
        title='Animations'
        value={userOptions.animations}
        onChange={toggleOptionHandle("animations")}
      />
    </WidgetBase>
  );
}

type OptionProps = {
  title: string;
  value: boolean;
  onChange: (value: boolean) => void;
};

function Option({ title, value, onChange }: OptionProps) {
  const id = useId();

  return (
    <div className='flex gap-2 justify-between items-center'>
      <label htmlFor={id}>{title}</label>

      <input
        className='mx-1'
        id={id}
        type='checkbox'
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
      />
    </div>
  );
}
