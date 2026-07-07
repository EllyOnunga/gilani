import { useEffect, useRef } from "react";

/**
 * Intercepts the browser / Android hardware back button while `isOpen` is true.
 * When the back button is pressed, calls `onBack` (to close the drawer/modal)
 * instead of navigating back in history.
 *
 * Works by pushing a fake history entry on open and listening for the popstate
 * event. The fake entry is cleaned up on close.
 */
export function useBackButton(isOpen: boolean, onBack: () => void) {
  const pushed = useRef(false);

  useEffect(() => {
    if (isOpen) {
      // Push a dummy entry so the back button "lands" here first
      history.pushState({ __backButton: true }, "");
      pushed.current = true;

      const handlePopState = (e: PopStateEvent) => {
        // The user pressed back — close the overlay
        onBack();
        pushed.current = false;
      };

      window.addEventListener("popstate", handlePopState);
      return () => {
        window.removeEventListener("popstate", handlePopState);
      };
    } else {
      // If the overlay was closed programmatically (not via back button),
      // remove the dummy history entry so the real back button still works.
      if (pushed.current) {
        pushed.current = false;
        history.back();
      }
    }
  }, [isOpen, onBack]);
}
