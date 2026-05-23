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

    case "food_snacks":
      // Cupcake
      return (
        <svg {...baseProps}>
          <path d="M7 14h10l-1 8H8l-1-8z" />
          <path d="M7 14c0-3 2-5 5-5s5 2 5 5" />
          <path d="M12 9c0-2 1.5-3 1.5-5" />
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

    case "books":
      // Open book
      return (
        <svg {...baseProps}>
          <path d="M4 19.5A2.5 2.5 0 016.5 17H12" />
          <path d="M4 4.5A2.5 2.5 0 016.5 2H12v20H6.5A2.5 2.5 0 014 19.5v-15z" />
          <path d="M20 19.5A2.5 2.5 0 0017.5 17H12" />
          <path d="M20 4.5A2.5 2.5 0 0017.5 2H12v20h5.5A2.5 2.5 0 0020 19.5v-15z" />
        </svg>
      );

    case "electronics":
      // Laptop / screen
      return (
        <svg {...baseProps}>
          <rect x="3" y="4" width="18" height="12" rx="2" />
          <path d="M7 20h10M9 16v4M15 16v4" />
        </svg>
      );

    case "sports":
      // Dumbbell
      return (
        <svg {...baseProps}>
          <path d="M6 5v14M18 5v14M6 12h12" />
          <rect x="3" y="7" width="3" height="10" rx="1" />
          <rect x="18" y="7" width="3" height="10" rx="1" />
        </svg>
      );

    case "apparel":
      // T-shirt
      return (
        <svg {...baseProps}>
          <path d="M16 3h4l2 4-4 2v13H6V9L2 7l2-4h4" />
          <path d="M8 3a4 4 0 018 0" />
        </svg>
      );

    case "beauty":
      // Sparkle / skincare
      return (
        <svg {...baseProps}>
          <path d="M12 3v3m0 12v3M3 12h3m12 0h3" />
          <circle cx="12" cy="12" r="4" />
          <path d="M5.6 5.6l2.1 2.1m8.6 8.6l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
        </svg>
      );

    case "jewelry":
      // Diamond / gem
      return (
        <svg {...baseProps}>
          <path d="M6 3h12l4 6-10 13L2 9l4-6z" />
          <path d="M2 9h20M12 22L8 9l4-6 4 6-4 13" />
        </svg>
      );

    case "wellness":
      // Heart with pulse
      return (
        <svg {...baseProps}>
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          <path d="M4 12h4l2-3 2 6 2-3h6" />
        </svg>
      );

    case "games_toys":
      // Game controller
      return (
        <svg {...baseProps}>
          <rect x="2" y="6" width="20" height="12" rx="6" />
          <path d="M8 10v4M6 12h4" />
          <circle cx="16" cy="10" r="1" />
          <circle cx="18" cy="12" r="1" />
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
  { value: "food_snacks", label: "Food & Snacks" },
  { value: "home", label: "Home" },
  { value: "books", label: "Books" },
  { value: "electronics", label: "Electronics" },
  { value: "sports", label: "Sports" },
  { value: "apparel", label: "Apparel" },
  { value: "beauty", label: "Beauty" },
  { value: "jewelry", label: "Jewelry" },
  { value: "wellness", label: "Wellness" },
  { value: "games_toys", label: "Games & Toys" },
];

export default GiftCategoryIcon;
