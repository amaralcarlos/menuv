export function MenuvLogo({ size }: { size?: number }) {
  const props = size
    ? { width: size, height: size }
    : { width: '100%', height: '100%' }

  return (
    <svg {...props} viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="mv_cloud" x1="4" y1="8" x2="32" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00e87a" />
          <stop offset="100%" stopColor="#00c8b4" />
        </linearGradient>
        <linearGradient id="mv_cloche" x1="10" y1="16" x2="26" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00ff8a" />
          <stop offset="100%" stopColor="#00c8b4" />
        </linearGradient>
      </defs>
      <path
        d="M27 14.5a6 6 0 00-11.6-2.1A5 5 0 009 17.5a5 5 0 005 5h13a4 4 0 000-8z"
        stroke="url(#mv_cloud)" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"
      />
      <rect x="9" y="25" width="18" height="2.5" rx="1.25" fill="url(#mv_cloche)" opacity=".9" />
      <path d="M13 25c0-3.3 2.2-6 5-6s5 2.7 5 6" stroke="url(#mv_cloche)" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <circle cx="18" cy="19" r="1" fill="#00e87a" />
    </svg>
  )
}
