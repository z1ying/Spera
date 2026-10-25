/**
 * Spera's writing helper: a friendly line-art robot holding an open book and
 * a pen (original drawing). It blinks, its antenna sways and the pen writes.
 * All motion stops under prefers-reduced-motion.
 */
export default function WritingRobot({ className = "h-16 w-16" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 140" className={`writing-robot ${className}`} role="img" aria-label="Writing assistant">
      <g fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">
        {/* antenna */}
        <g className="wr-antenna">
          <path d="M60 30V16" />
          <circle cx="60" cy="11" r="6" fill="currentColor" />
        </g>
        {/* head + ears */}
        <rect x="26" y="30" width="68" height="52" rx="16" />
        <path d="M22 46v20M98 46v20" />
        {/* face */}
        <g className="wr-eyes" fill="currentColor" stroke="none">
          <circle cx="47" cy="52" r="5.5" />
          <circle cx="73" cy="52" r="5.5" />
        </g>
        <path d="M49 66q11 8 22 0" />
        {/* neck + shoulders */}
        <path d="M52 82v6h16v-6" />
        <path d="M30 104q30-16 60 0" />
        {/* open book */}
        <path d="M24 100q18-6 36 2q18-8 36-2v32q-18-6-36 2q-18-8-36-2z" fill="white" />
        <path d="M60 102v32" />
        {/* hands */}
        <circle cx="20" cy="118" r="8" fill="white" />
        <g className="wr-pen">
          <circle cx="100" cy="118" r="8" fill="white" />
          <path d="M104 110l10-28" />
          <path d="M111 78l5 2-2 7" />
        </g>
        {/* the line being written */}
        <path className="wr-line" d="M68 118h20" strokeWidth="4" />
      </g>
    </svg>
  );
}
