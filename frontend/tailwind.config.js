/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#ECEFE9",
        surface: "#FFFFFF",
        ink: "#171E1B",
        muted: "#69716A",
        gold: "#C79A3D",
        "gold-dim": "#E4D3A6",
        cover: "#37437F",
        "cover-dim": "#5A659B",
        success: "#3F7D5C",
        danger: "#B5484A",
        line: "#DCDFD6",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        serif: ["var(--font-reading)", "serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        sm: "3px",
      },
    },
  },
  plugins: [],
};
