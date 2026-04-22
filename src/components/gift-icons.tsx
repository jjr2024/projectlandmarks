import React from "react";

interface GiftCategoryIconProps {
  category: string;
  className?: string;
  strokeWidth?: number;
}

/**
 * GiftCategoryIcon - renders SVG icons for gift categories
 * Icons are stroke-based, inherit currentColor, and use 24x24 viewBox
 */
export function GiftCategoryIcon({
  category,
  className = "w-6 h-6",
  strokeWidth = 1.5,
}: GiftCategoryIconProps) {
  const baseProps = {
    className,
    fill: "none",
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    viewBox: "0 0 24 24",
  };

  switch (category) {
    case "flowers":
      // Tulip / flower bud
      return (
        <svg {...baseProps}>
          <path d="M12 3v10m4-8c0 2.209-1.791 4-4 4s-4-1.791-4-4" />
          <path d="M8 13h8M7 17h10a2 2 0 012 2v2H5v-2a2 2 0 012-2z" />
        </svg>
      );

    case "wine":
      // Wine glass
      return (
        <svg {...baseProps}>
          <path d="M8 3h8v4c0 2.209-1.791 4-4 4s-4-1.791-4-4V3z" />
          <path d="M8 7h8M10 11v8m4-8v8M7 19h10" />
        </svg>
      );

    case "treats":
      // Wrapped candy / cupcake
      return (
        <svg {...baseProps}>
          <path d="M8 14l4-8 4 8v8H8v-8z" />
          <path d="M10 14h4M12 14v8" />
          <circle cx="12" cy="10" r="1" />
        </svg>
      );

    case "gift_card":
      // Card with ribbon/bow
      return (
        <svg {...baseProps}>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M3 10h18M12 4v16M3 7h4m10 0h4" />
          <circle cx="12" cy="7" r="1.5" />
        </svg>
      );

    case "experiences":
      // Ticket stub
      return (
        <svg {...baseProps}>
          <path d="M3 6h18v12H3V6z" />
          <path d="M7 6v12M17 6v12M3 12h18" />
          <circle cx="5" cy="9" r="1" />
          <path d="M6 9h10" />
        </svg>
      );

    case "donation":
      // Heart with plus
      return (
        <svg {...baseProps}>
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          <path d="M12 9v6M9 12h6" />
        </svg>
      );

    case "home":
      // House
      return (
        <svg {...baseProps}>
          <path d="M3 12l9-9 9 9v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-8z" />
          <path d="M9 21v-8h6v8M9 12h6" />
        </svg>
      );

    case "accessories":
      // Watch / handbag
      return (
        <svg {...baseProps}>
          <circle cx="12" cy="12" r="7" />
          <path d="M12 8v4l3 2" />
          <path d="M12 3v2m0 14v2" />
          <path d="M3 12h2m14 0h2" />
        </svg>
      );

    default:
      // Fallback: generic gift icon
      return (
        <svg {...baseProps}>
          <rect x="4" y="6" width="16" height="14" rx="2" />
          <path d="M12 3v9M8 9h8M5 9h14" />
        </svg>
      );
  }
}

/**
 * Icon catalog for easy reference
 */
const iconCatalog = [
  { value: "flowers", label: "Flowers" },
  { value: "wine", label: "Wine" },
  { value: "treats", label: "Treats" },
  { value: "gift_card", label: "Gift Card" },
  { value: "experiences", label: "Experience" },
  { value: "donation", label: "Donation" },
  { value: "home", label: "Home" },
  { value: "accessories", label: "Accessories" },
];

export default GiftCategoryIcon;
