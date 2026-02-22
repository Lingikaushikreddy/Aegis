import type { Config } from "tailwindcss"

const config: Config = {
    content: [
        "./app/**/*.{ts,tsx}",
        "./components/**/*.{ts,tsx}",
        "./lib/**/*.{ts,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                aegis: {
                    bg: '#09090B',
                    surface: {
                        1: '#0F0F12',
                        2: '#18181B',
                        3: '#1F1F23',
                    },
                    accent: '#0EA5E9',
                    'accent-hover': '#38BDF8',
                    violet: '#8B5CF6',
                    success: '#22C55E',
                    warning: '#F59E0B',
                },
            },
            keyframes: {
                spotlight: {
                    "0%": { opacity: "0", transform: "translate(-72%, -62%) scale(0.5)" },
                    "100%": { opacity: "1", transform: "translate(-50%, -40%) scale(1)" },
                },
                "fade-in-up": {
                    "0%": { opacity: "0", transform: "translateY(24px)" },
                    "100%": { opacity: "1", transform: "translateY(0)" },
                },
                "fade-in": {
                    "0%": { opacity: "0" },
                    "100%": { opacity: "1" },
                },
                "gradient-shift": {
                    "0%, 100%": { backgroundPosition: "0% 50%" },
                    "50%": { backgroundPosition: "100% 50%" },
                },
                "pulse-glow": {
                    "0%, 100%": { opacity: "0.4" },
                    "50%": { opacity: "0.8" },
                },
            },
            animation: {
                spotlight: "spotlight 2s ease .75s 1 forwards",
                "fade-in-up": "fade-in-up 0.6s cubic-bezier(0.25, 0.1, 0.25, 1) forwards",
                "fade-in": "fade-in 0.6s ease forwards",
                "gradient-shift": "gradient-shift 3s ease infinite",
                "pulse-glow": "pulse-glow 3s ease-in-out infinite",
            },
        },
    },
    plugins: [],
}
export default config
