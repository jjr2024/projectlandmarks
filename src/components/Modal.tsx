"use client";

import { useEffect, useRef, useCallback } from "react";
import { useEscapeKey } from "@/hooks/useEscapeKey";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  /** Accessible label for the dialog (aria-label). */
  label?: string;
  children: React.ReactNode;
  /** Additional classes for the inner panel container. Defaults to max-w-sm. */
  panelClassName?: string;
}

/**
 * Accessible modal wrapper.
 * - Escape key dismisses the modal.
 * - Clicking the backdrop dismisses the modal.
 * - Focus is trapped inside while open; first focusable element is focused on open.
 * - Scroll on the body is locked while open.
 */
export function Modal({ open, onClose, label, children, panelClassName = "max-w-sm" }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Stable close callback so useEscapeKey dep array stays stable
  const handleClose = useCallback(() => onClose(), [onClose]);
  useEscapeKey(open, handleClose);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Focus first focusable element on open
  useEffect(() => {
    if (!open || !panelRef.current) return;
    const focusable = panelRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusable[0]?.focus();
  }, [open]);

  // Focus trap: cycle focus within the panel
  useEffect(() => {
    if (!open || !panelRef.current) return;
    const panel = panelRef.current;

    const trap = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };

    document.addEventListener("keydown", trap);
    return () => document.removeEventListener("keydown", trap);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-label={label}
      // Backdrop click dismisses
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div ref={panelRef} className={`bg-white rounded-xl shadow-xl w-full ${panelClassName} p-6`}>
        {children}
      </div>
    </div>
  );
}
