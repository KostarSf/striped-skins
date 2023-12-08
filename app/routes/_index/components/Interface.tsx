import { SkinInputForm } from "~/components/ui/SkinInputForm";
import { APP_VERSION } from "~/constants";

export function Interface() {
  return (
    <>
      <div className='absolute left-0 top-0 right-0 p-4'>
        <div className="max-w-screen-md mx-auto">
          <SkinInputForm />
        </div>
      </div>

      <div className='absolute left-0 bottom-0 right-0 p-4'>
        <p className='text-xs/none text-zinc-300 font-mono'>
          {`v${APP_VERSION}`}
        </p>
      </div>
    </>
  );
}
