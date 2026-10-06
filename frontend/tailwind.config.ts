import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ["var(--font-inter)", "system-ui", "sans-serif"] },
      colors: {
        ink: "#111827",
        muted: "#6b7280",
        surface: "#f9fafb",
        line: "#e5e7eb",
        success: "#10b981",
        danger: "#ef4444",
      },
      boxShadow: {
        card: "0 1px 2px rgba(17,24,39,0.04), 0 8px 24px -8px rgba(17,24,39,0.08)",
        modal: "0 24px 64px -16px rgba(17,24,39,0.25)",
      },
      keyframes: {
        "fade-up": { from: { opacity: "0", transform: "translateY(6px)" }, to: { opacity: "1", transform: "none" } },
        pop: { "0%": { transform: "scale(0.6)", opacity: "0" }, "70%": { transform: "scale(1.06)" }, "100%": { transform: "scale(1)", opacity: "1" } },
        travel: { from: { transform: "translateX(-6rem)" }, to: { transform: "translateX(100%)" } },
      },
      animation: {
        "fade-up": "fade-up 280ms cubic-bezier(0.2, 0.8, 0.2, 1) both",
        pop: "pop 420ms cubic-bezier(0.2, 0.8, 0.2, 1) both",
        travel: "travel 2.8s cubic-bezier(0.65, 0, 0.35, 1) infinite",
      },
    },
  },
  plugins: [],
};

export default config;
