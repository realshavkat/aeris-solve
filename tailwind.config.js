/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./public/**/*.{js,ts,jsx,tsx}",
    "./aeris/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#1e40af",
        secondary: "#64748b",
        accent: "#fbbf24",
        neutral: "#f9fafb",
        "base-100": "#ffffff",
        "base-200": "#f3f4f6",
        "base-300": "#e5e7eb",
        "base-content": "#111827",
        info: "#3b82f6",
        success: "#4caf50",
        warning: "#ff9800",
        error: "#f44336",
      },
      borderRadius: {
        "4xl": "2rem",
      },
      button: {
        DEFAULT: {
          cursor: "pointer",
        },
      },
    },
  },
  plugins: [
    require("@tailwindcss/forms"),
    require("@tailwindcss/typography"),
    require("@tailwindcss/aspect-ratio"),
  ],
};
