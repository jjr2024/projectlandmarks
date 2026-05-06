import { useEffect } from "react";

/**
 * Fires `onClose` when the Escape key is pressed, but only when `active` is true.
 * Safe to call unconditionally — the listener is added/removed based on `active`.
 */
export function useEscapeKey(active: boolean, onClose: () => void) {
  useEffect(() => {
    if (!active) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [active, onClose]);
}
