import type { Config } from "tailwindcss";

/**
 * Tailwind config — ánh xạ trực tiếp design tokens từ dign.md (design system "Lumina Learning").
 * Mọi màu/font/spacing/bo góc dùng trong dự án PHẢI lấy từ đây để khớp thiết kế.
 */
const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#f8f9ff",
        "on-background": "#0b1c30",

        surface: {
          DEFAULT: "#f8f9ff",
          dim: "#cbdbf5",
          bright: "#f8f9ff",
          "container-lowest": "#ffffff",
          "container-low": "#eff4ff",
          container: "#e5eeff",
          "container-high": "#dce9ff",
          "container-highest": "#d3e4fe",
          variant: "#d3e4fe",
          tint: "#6d3bd7",
          inverse: "#213145",
        },
        "on-surface": "#0b1c30",
        "on-surface-variant": "#494454",
        "inverse-on-surface": "#eaf1ff",

        outline: {
          DEFAULT: "#7b7486",
          variant: "#cbc3d7",
        },

        // Primary — Vivid Violet (màu thương hiệu chính)
        primary: {
          DEFAULT: "#6b38d4",
          container: "#8455ef",
          fixed: "#e9ddff",
          "fixed-dim": "#d0bcff",
          inverse: "#d0bcff",
        },
        "on-primary": "#ffffff",
        "on-primary-container": "#fffbff",
        "on-primary-fixed": "#23005c",
        "on-primary-fixed-variant": "#5516be",

        // Secondary — Magenta (gamification / điểm nhấn)
        secondary: {
          DEFAULT: "#b4136d",
          container: "#fd56a7",
          fixed: "#ffd9e4",
          "fixed-dim": "#ffb0cd",
        },
        "on-secondary": "#ffffff",
        "on-secondary-container": "#600037",
        "on-secondary-fixed": "#3e0022",
        "on-secondary-fixed-variant": "#8c0053",

        // Tertiary — Cyan (trạng thái thông tin)
        tertiary: {
          DEFAULT: "#006577",
          container: "#008096",
          fixed: "#acedff",
          "fixed-dim": "#4cd7f6",
        },
        "on-tertiary": "#ffffff",
        "on-tertiary-container": "#f9fdff",
        "on-tertiary-fixed": "#001f26",
        "on-tertiary-fixed-variant": "#004e5c",

        // Error
        error: {
          DEFAULT: "#ba1a1a",
          container: "#ffdad6",
        },
        "on-error": "#ffffff",
        "on-error-container": "#93000a",
      },

      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        display: ["var(--font-jakarta)", "Plus Jakarta Sans", "system-ui", "sans-serif"],
      },

      fontSize: {
        "display-lg": ["32px", { lineHeight: "40px", letterSpacing: "-0.02em", fontWeight: "700" }],
        "headline-md": ["24px", { lineHeight: "32px", letterSpacing: "-0.01em", fontWeight: "700" }],
        "headline-sm": ["20px", { lineHeight: "28px", fontWeight: "600" }],
        "body-lg": ["16px", { lineHeight: "26px", fontWeight: "400" }],
        "body-md": ["14px", { lineHeight: "20px", fontWeight: "400" }],
        "label-md": ["12px", { lineHeight: "16px", letterSpacing: "0.05em", fontWeight: "600" }],
        "label-sm": ["11px", { lineHeight: "14px", fontWeight: "500" }],
      },

      borderRadius: {
        sm: "0.25rem",
        DEFAULT: "0.5rem",
        md: "0.75rem",
        lg: "1rem",
        xl: "1.5rem",
        full: "9999px",
      },

      spacing: {
        xs: "4px",
        sm: "8px",
        md: "16px",
        lg: "24px",
        xl: "32px",
        gutter: "16px",
        "margin-mobile": "20px",
      },

      boxShadow: {
        // Elevation theo dign.md
        card: "0 4px 20px rgba(0, 0, 0, 0.04)",
        "card-hover": "0 8px 28px rgba(107, 56, 212, 0.12)",
        popover: "0 8px 30px rgba(11, 28, 48, 0.08)",
      },

      backdropBlur: {
        glass: "20px",
      },

      backgroundImage: {
        // Gradient "Premium" — Violet → Magenta
        premium: "linear-gradient(135deg, #6b38d4 0%, #b4136d 100%)",
        "premium-soft": "linear-gradient(135deg, #8455ef 0%, #fd56a7 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
