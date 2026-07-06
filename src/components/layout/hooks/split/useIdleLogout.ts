import { useEffect } from "react";
import { toast } from "sonner";

const TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export function useIdleLogout(signOut: () => Promise<void>) {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        try {
          await signOut();
          toast.error("You were signed out due to inactivity.");
        } catch {}
      }, TIMEOUT_MS);
    };
    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "visibilitychange"];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
