/**
 * Daysight logo — gift box on rounded orange square.
 * Inline SVG so it works in both server and client components
 * without needing next/image or a public path.
 */
export function DaysightLogo({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 80 80"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
      <rect width="80" height="80" rx="18" fill="#d05a32" />
      <clipPath id="bg">
        <rect width="80" height="80" rx="18" />
      </clipPath>
      <rect y="0" width="80" height="35" fill="#b84a28" clipPath="url(#bg)" />
      <rect x="18" y="22" width="20" height="11" rx="3" fill="#fff" />
      <rect x="42" y="22" width="20" height="11" rx="3" fill="#fff" />
      <rect x="21" y="36" width="17" height="22" rx="3" fill="#fff" />
      <rect x="42" y="36" width="17" height="22" rx="3" fill="#fff" />
    </svg>
  );
}
