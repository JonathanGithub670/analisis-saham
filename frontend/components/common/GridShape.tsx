export default function GridShape() {
  return (
    <>
      <div className="absolute right-0 top-0 -z-1 w-full max-w-[250px] xl:max-w-[450px] opacity-40">
        <svg
          width="540"
          height="254"
          viewBox="0 0 540 254"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g opacity="0.4" stroke="#465FFF" strokeWidth="0.5">
            {Array.from({ length: 10 }).map((_, i) => (
              <line key={`h-${i}`} x1="0" y1={i * 28} x2="540" y2={i * 28} />
            ))}
            {Array.from({ length: 20 }).map((_, i) => (
              <line key={`v-${i}`} x1={i * 28} y1="0" x2={i * 28} y2="254" />
            ))}
          </g>
        </svg>
      </div>
      <div className="absolute bottom-0 left-0 -z-1 w-full max-w-[250px] rotate-180 xl:max-w-[450px] opacity-40">
        <svg
          width="540"
          height="254"
          viewBox="0 0 540 254"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g opacity="0.4" stroke="#465FFF" strokeWidth="0.5">
            {Array.from({ length: 10 }).map((_, i) => (
              <line key={`h-${i}`} x1="0" y1={i * 28} x2="540" y2={i * 28} />
            ))}
            {Array.from({ length: 20 }).map((_, i) => (
              <line key={`v-${i}`} x1={i * 28} y1="0" x2={i * 28} y2="254" />
            ))}
          </g>
        </svg>
      </div>
    </>
  );
}
