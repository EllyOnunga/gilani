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
      img: "h-8 w-auto",
      text: "text-lg",
      container: "gap-2",
    },
    md: {
      img: "h-10 w-auto sm:h-12",
      text: "text-xl sm:text-2xl",
      container: "gap-2.5",
    },
    lg: {
      img: "h-14 w-auto sm:h-16",
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
