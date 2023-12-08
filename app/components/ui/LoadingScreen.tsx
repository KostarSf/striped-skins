export function LoadingScreen() {
  return (
    <div className='w-full h-full grid place-items-center'>
      <svg
        className='animate-spin'
        xmlns='http://www.w3.org/2000/svg'
        width='200px'
        height='200px'
        viewBox='0 0 100 100'
        preserveAspectRatio='xMidYMid'
      >
        <circle
          cx='50'
          cy='50'
          r='32'
          strokeWidth='8'
          stroke='#ee6123'
          strokeDasharray='50.26548245743669 50.26548245743669'
          fill='none'
          strokeLinecap='round'
          transform='matrix(1,0,0,1,0,0)'
        ></circle>
      </svg>
    </div>
  );
}
