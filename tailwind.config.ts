import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fef6f2",
          100: "#fde9e0",
          200: "#fbd4c1",
          300: "#f7b293",
          400: "#f08a5e",
          500: "#e8703d",
          600: "#d05a32",  // Primary — matches prototype brand-600
          700: "#ad4628",
          800: "#8c3b25",
          900: "#733422",
          950: "#3e180f",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
