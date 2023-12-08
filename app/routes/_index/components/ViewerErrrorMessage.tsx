export function ViewerErrorMessage() {
  return (
    <div className='absolute inset-0 flex flex-col items-center justify-center p-4'>
      <p className='text-3xl text-white font-bold uppercase text-center'>
        Не удалось загрузить скин
      </p>
      <p className='text-zinc-300 mt-4 text-center'>
        Вероятно, указана неверная ссылка
      </p>
    </div>
  );
}
