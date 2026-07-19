import { useRef, useState, useCallback, type ReactNode } from "react";
import { RefreshCw } from "lucide-react";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  className?: string;
}

const PULL_THRESHOLD = 72; // px to pull before triggering
const MAX_PULL = 110; // max pull distance

export function PullToRefresh({ onRefresh, children, className = "" }: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startYRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const container = containerRef.current;
    if (!container) return;
    if (container.scrollTop > 0) return;
    startYRef.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (startYRef.current === null || refreshing) return;
      const container = containerRef.current;
      if (!container || container.scrollTop > 0) {
        startYRef.current = null;
        setPullDistance(0);
        return;
      }

      const delta = e.touches[0].clientY - startYRef.current;
      if (delta <= 0) {
        setPullDistance(0);
        return;
      }

      const pulled = Math.min(MAX_PULL, delta * 0.5);
      setPullDistance(pulled);
    },
    [refreshing],
  );

  const handleTouchEnd = useCallback(async () => {
    if (startYRef.current === null) return;
    startYRef.current = null;

    if (pullDistance >= PULL_THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPullDistance(PULL_THRESHOLD);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, refreshing, onRefresh]);

  const progress = Math.min(1, pullDistance / PULL_THRESHOLD);
  const showIndicator = pullDistance > 8 || refreshing;

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Pull indicator */}
      <div
        aria-hidden="true"
        style={{
          height: `${refreshing ? PULL_THRESHOLD : pullDistance}px`,
          transition: refreshing || pullDistance === 0 ? "height 0.25s ease" : "none",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {showIndicator && (
          <div
            style={{
              opacity: refreshing ? 1 : progress,
              transform: `scale(${0.5 + 0.5 * progress})`,
            }}
            className="transition-[opacity,transform] duration-150"
          >
            <RefreshCw
              className={`h-5 w-5 text-primary ${refreshing ? "animate-spin" : ""}`}
              style={!refreshing ? { transform: `rotate(${progress * 360}deg)` } : undefined}
            />
          </div>
        )}
      </div>

      {/* Scrollable content */}
      <div
        ref={containerRef}
        className="h-full overflow-y-auto"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}
