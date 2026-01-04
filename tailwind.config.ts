// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./app/**/*.{ts,tsx}",
        "./components/**/*.{ts,tsx}",
        "./lib/**/*.{ts,tsx}"
    ],
    theme: {
        extend: {
            borderRadius: {
                xl: "0.9rem",
                "2xl": "1.25rem"
            }
        }
    },
    plugins: []
};

export default config;
