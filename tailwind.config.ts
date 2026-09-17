import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50: "#eef4ff",
          100: "#d9e6ff",
          500: "#1f4f9a",
          700: "#173766",
          900: "#0b1f3a"
        },
        logistics: {
          orange: "#f97316",
          amber: "#f59e0b",
          ink: "#102033"
        }
      },
      boxShadow: {
        soft: "0 18px 60px rgba(16, 32, 51, 0.10)"
      }
    }
  },
  plugins: []
};

export default config;
