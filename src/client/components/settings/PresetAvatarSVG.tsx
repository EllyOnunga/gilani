export function PresetAvatarSVG({ preset }: { preset: string }) {
  switch (preset) {
    case "socrates":
      return (
        <svg
          viewBox="0 0 32 32"
          className="h-full w-full bg-gradient-to-br from-amber-500 to-amber-700 p-2 text-white"
        >
          <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" strokeWidth="1" />
          <path
            d="M12 24h8M16 24V14M13 14h6M11 11h10v3H11z"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "curie":
      return (
        <svg
          viewBox="0 0 32 32"
          className="h-full w-full bg-gradient-to-br from-emerald-500 to-emerald-700 p-2 text-white"
        >
          <path
            d="M11 23h10M13 23v-7a3 3 0 0 1-1-2.5v-3.5h8v3.5a3 3 0 0 1-1 2.5v7"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="16" cy="7" r="1" fill="currentColor" />
          <circle cx="12" cy="15" r="1.2" fill="currentColor" />
          <circle cx="20" cy="17" r="0.8" fill="currentColor" />
        </svg>
      );
    case "galileo":
      return (
        <svg
          viewBox="0 0 32 32"
          className="h-full w-full bg-gradient-to-br from-blue-500 to-blue-700 p-2 text-white"
        >
          <circle cx="16" cy="16" r="12" fill="none" stroke="currentColor" strokeWidth="1" />
          <path
            d="M16 4v24M4 16h24M16 4c-4 0-8 5.373-8 12s4 12 8 12 8-5.373 8-12S20 4 16 4z"
            stroke="currentColor"
            strokeWidth="1"
            fill="none"
          />
        </svg>
      );
    case "lovelace":
      return (
        <svg
          viewBox="0 0 32 32"
          className="h-full w-full bg-gradient-to-br from-purple-500 to-purple-700 p-2 text-white"
        >
          <rect
            x="8"
            y="8"
            width="16"
            height="16"
            rx="2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M12 12h8M12 16h8M12 20h4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );
    case "hypatia":
      return (
        <svg
          viewBox="0 0 32 32"
          className="h-full w-full bg-gradient-to-br from-rose-500 to-rose-700 p-2 text-white"
        >
          <path
            d="M16 6L6 26h20L16 6z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <circle cx="16" cy="18" r="4" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
    case "einstein":
      return (
        <svg
          viewBox="0 0 32 32"
          className="h-full w-full bg-gradient-to-br from-slate-500 to-slate-700 p-2 text-white"
        >
          <path
            d="M8 22c0-4 4-6 8-6s8 2 8 6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle cx="16" cy="10" r="4" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M12 10c-2-2-4 0-4 0s0-3 2-4M20 10c2-2 4 0 4 0s0-3-2-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );
    default:
      return null;
  }
}
