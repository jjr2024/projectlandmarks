import React from "react";

type EventType = "birthday" | "anniversary" | "custom";

interface EventTypeIconProps {
  type: EventType | string;
  className?: string;
  strokeWidth?: number;
  style?: React.CSSProperties;
}

/**
 * EventTypeIcon - renders SVG icons for the three event types
 * (birthday, anniversary, custom). Stroke-based, inherits currentColor,
 * 24x24 viewBox. Designed as a parallel to GiftCategoryIcon so emails and
 * UI can both render emoji-free event glyphs.
 */
export function EventTypeIcon({
  type,
  className = "w-6 h-6",
  strokeWidth = 1.5,
  style,
}: EventTypeIconProps) {
  const baseProps = {
    className,
    style,
    fill: "none",
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    viewBox: "0 0 24 24",
  };

  switch (type) {
    case "birthday":
      // Layered cake with candles
      return (
        <svg {...baseProps}>
          <path d="M5 21h14v-7H5v7z" />
          <path d="M7 14v-3a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v3" />
          <path d="M9 9V6m3 3V6m3 3V6" />
          <path d="M9 4l0 1m3-1l0 1m3-1l0 1" />
        </svg>
      );

    case "anniversary":
      // Simple solid-stroke heart
      return (
        <svg {...baseProps}>
          <path d="M12 20.5s-7-4.35-7-10.35a4 4 0 0 1 7-2.65 4 4 0 0 1 7 2.65c0 6-7 10.35-7 10.35z" />
        </svg>
      );

    case "custom":
    default:
      // Calendar
      return (
        <svg {...baseProps}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" />
        </svg>
      );
  }
}

export default EventTypeIcon;
