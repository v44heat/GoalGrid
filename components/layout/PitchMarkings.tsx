/** Decorative half-pitch line drawing used behind the landing hero. */
export function PitchMarkings({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 300"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
      className={className}
    >
      <rect x="10" y="10" width="380" height="280" rx="2" />
      <line x1="10" y1="150" x2="390" y2="150" />
      <circle cx="200" cy="150" r="48" />
      <circle cx="200" cy="150" r="3" fill="currentColor" />
      <rect x="110" y="10" width="180" height="62" />
      <rect x="155" y="10" width="90" height="26" />
      <path d="M160 72 A48 48 0 0 0 240 72" />
      <rect x="110" y="228" width="180" height="62" />
      <rect x="155" y="264" width="90" height="26" />
      <path d="M160 228 A48 48 0 0 1 240 228" />
    </svg>
  );
}
