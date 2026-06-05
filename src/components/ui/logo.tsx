import { Link } from "@tanstack/react-router";

interface LogoProps {
  className?: string;
  iconOnly?: boolean;
  size?: "sm" | "md" | "lg";
  to?: string;
  onClick?: () => void;
}

export function Logo({
  className = "",
  iconOnly = false,
  size = "md",
  to = "/",
  onClick,
}: LogoProps) {
  const sizeClasses = {
    sm: {
      svg: "h-5 w-5",
      text: "text-lg",
      container: "gap-2",
    },
    md: {
      svg: "h-7 w-7",
      text: "text-xl sm:text-2xl",
      container: "gap-2.5",
    },
    lg: {
      svg: "h-10 w-10",
      text: "text-3xl sm:text-4xl",
      container: "gap-3.5",
    },
  };

  const currentSize = sizeClasses[size];

  const logoContent = (
    <div className={`flex items-center ${currentSize.container} ${className}`}>
      {/* SVG Icon Emblem */}
      <svg
        className={`${currentSize.svg} flex-shrink-0`}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="logo-flame" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(22, 75%, 48%)" />
            <stop offset="60%" stopColor="hsl(30, 85%, 52%)" />
            <stop offset="100%" stopColor="hsl(45, 95%, 60%)" />
          </linearGradient>
          <linearGradient id="logo-gold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FBBF24" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>
        </defs>

        {/* Book Outline / Pages */}
        {/* Left page */}
        <path
          d="M 10 75 Q 30 65 50 80 Q 50 25 50 15 Q 30 0 10 10 Z"
          fill="currentColor"
          className="text-zinc-300 dark:text-zinc-600"
        />
        {/* Right page */}
        <path
          d="M 90 75 Q 70 65 50 80 Q 50 25 50 15 Q 70 0 90 10 Z"
          fill="currentColor"
          className="text-zinc-400 dark:text-zinc-500"
        />

        {/* Book spine */}
        <path
          d="M 48 15 L 52 15 L 52 80 L 48 80 Z"
          fill="currentColor"
          className="text-zinc-800 dark:text-zinc-900"
        />

        {/* Socratic Hearth Flame rising from the book */}
        <path
          d="M 50 10 C 32 30 35 50 50 62 C 65 50 68 30 50 10 Z"
          fill="url(#logo-flame)"
          opacity="0.95"
        />

        {/* Inner flame */}
        <path
          d="M 50 22 C 38 38 41 50 50 58 C 59 50 62 38 50 22 Z"
          fill="url(#logo-gold)"
        />

        {/* Accent Sparkle */}
        <path
          d="M 80 20 L 82 22 L 80 24 L 78 22 Z"
          fill="url(#logo-gold)"
        />
      </svg>

      {/* Brand Text */}
      {!iconOnly && (
        <span
          className={`font-serif font-black italic tracking-tight text-primary ${currentSize.text}`}
        >
          GilaniAI
        </span>
      )}
    </div>
  );

  return (
    <Link
      to={to as any}
      onClick={onClick}
      className="hover:opacity-90 transition-opacity block select-none"
    >
      {logoContent}
    </Link>
  );
}
