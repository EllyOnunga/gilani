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
      img: "h-10 w-32 sm:h-16 sm:w-48",
      text: "text-lg",
      container: "gap-2",
    },
    md: {
      img: "h-12 w-36 sm:h-20 sm:w-64",
      text: "text-xl sm:text-2xl",
      container: "gap-2.5",
    },
    lg: {
      img: "h-32 w-96",
      text: "text-3xl sm:text-4xl",
      container: "gap-3.5",
    },
  };

  const currentSize = sizeClasses[size];

  const logoContent = (
    <div className={`flex items-center ${currentSize.container} ${className}`}>
      {/* GilaniAI Logo — neural-network book icon from Canva */}
      <img
        src="/gilanilogo.png"
        alt="GilaniAI logo"
        className={`${currentSize.img} flex-shrink-0 object-contain`}
        aria-hidden="true"
      />
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
