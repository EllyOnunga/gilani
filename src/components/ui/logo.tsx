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
      img: "h-7 w-7",
      text: "text-lg",
      container: "gap-2",
    },
    md: {
      img: "h-9 w-9",
      text: "text-xl sm:text-2xl",
      container: "gap-2.5",
    },
    lg: {
      img: "h-12 w-12",
      text: "text-3xl sm:text-4xl",
      container: "gap-3.5",
    },
  };

  const currentSize = sizeClasses[size];

  const logoContent = (
    <div className={`flex items-center ${currentSize.container} ${className}`}>
      {/* GilaniAI Logo — neural-network book icon from Canva */}
      <img
        src="/gilaniai_logo.png"
        alt="GilaniAI logo"
        className={`${currentSize.img} flex-shrink-0 rounded-lg object-contain`}
        width={size === "sm" ? 28 : size === "md" ? 36 : 48}
        height={size === "sm" ? 28 : size === "md" ? 36 : 48}
        aria-hidden="true"
      />

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
