import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Tindie visual language
        navy: "#1F2D3D",          // dark header
        slate: "#3C4858",         // body text
        muted: "#8492A6",         // secondary text
        teal: { DEFAULT: "#38B2AC", dark: "#2C948F", light: "#E6F7F6" },
        link: "#33ACB7",
        cta: "#EE7752",           // Tindie orange Add to Cart
        tag: "#F5A623",
        panel: "#F7F8F9",
        line: "#E0E6ED",
        danger: "#E5533D",
        ok: "#13CE66",
      },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "Helvetica Neue", "Arial", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        card: "0 1px 3px rgba(31,45,61,0.08)",
      },
    },
  },
  plugins: [],
};
export default config;
