/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}", "./utils/**/*.{js,ts,jsx,tsx}"],
  plugins: [require("daisyui")],
  darkTheme: "dark",
  darkMode: ["selector", "[data-theme='dark']"],
  daisyui: {
    themes: [
      {
        light: {
          primary: "#93BBFB",
          "primary-content": "#212638",
          secondary: "#DAE8FF",
          "secondary-content": "#212638",
          accent: "#93BBFB",
          "accent-content": "#212638",
          neutral: "#212638",
          "neutral-content": "#ffffff",
          "base-100": "#ffffff",
          "base-200": "#f4f8ff",
          "base-300": "#DAE8FF",
          "base-content": "#212638",
          info: "#93BBFB",
          success: "#34EEB6",
          warning: "#FFCF72",
          error: "#FF8863",
          "--rounded-btn": "9999rem",
          ".tooltip": { "--tooltip-tail": "6px" },
          ".link": { textUnderlineOffset: "2px" },
          ".link:hover": { opacity: "80%" },
        },
      },
      {
        dark: {
          primary: "#212638",
          "primary-content": "#F9FBFF",
          secondary: "#323f61",
          "secondary-content": "#F9FBFF",
          accent: "#4969A6",
          "accent-content": "#F9FBFF",
          neutral: "#F9FBFF",
          "neutral-content": "#385183",
          "base-100": "#385183",
          "base-200": "#2A3655",
          "base-300": "#212638",
          "base-content": "#F9FBFF",
          info: "#385183",
          success: "#34EEB6",
          warning: "#FFCF72",
          error: "#FF8863",
          "--rounded-btn": "9999rem",
          ".tooltip": { "--tooltip-tail": "6px", "--tooltip-color": "oklch(var(--p))" },
          ".link": { textUnderlineOffset: "2px" },
          ".link:hover": { opacity: "80%" },
        },
      },
      {
        "deep-ocean": {
          primary: "hsl(217, 70%, 45%)",
          "primary-focus": "hsl(217, 70%, 35%)",
          "primary-content": "hsl(222, 90%, 93%)",

          secondary: "hsl(188, 95%, 43%)",
          "secondary-focus": "hsl(188, 95%, 33%)",
          "secondary-content": "hsl(198, 100%, 12%)",

          accent: "hsl(283, 65%, 55%)",
          "accent-focus": "hsl(283, 65%, 45%)",
          "accent-content": "hsl(283, 100%, 92%)",

          neutral: "hsl(222, 16%, 14%)",
          "neutral-focus": "hsl(223, 17%, 10%)",
          "neutral-content": "hsl(220, 13%, 90%)",

          "base-100": "hsl(223, 18%, 7%)",
          "base-200": "hsl(222, 16%, 12%)",
          "base-300": "hsl(222, 14%, 16%)",
          "base-content": "hsl(220, 13%, 85%)",

          info: "hsl(217, 76%, 51%)",
          success: "hsl(188, 95%, 43%)",
          warning: "#FFCF72",
          error: "#FF8863",

          "--rounded-btn": "9999rem",
          ".tooltip": { "--tooltip-tail": "6px", "--tooltip-color": "oklch(var(--p))" },
          ".link": { textUnderlineOffset: "2px" },
          ".link:hover": { opacity: "80%" },
        },
      },
      {
        "midnight-purple": {
          primary: "hsl(262, 80%, 50%)",
          "primary-focus": "hsl(262, 80%, 40%)",
          "primary-content": "hsl(262, 100%, 93%)",

          secondary: "hsl(199, 89%, 48%)",
          "secondary-focus": "hsl(199, 89%, 38%)",
          "secondary-content": "hsl(199, 100%, 94%)",

          accent: "hsl(150, 80%, 44%)",
          "accent-focus": "hsl(150, 80%, 34%)",
          "accent-content": "hsl(150, 100%, 91%)",

          neutral: "hsl(260, 20%, 13%)",
          "neutral-focus": "hsl(260, 22%, 9%)",
          "neutral-content": "hsl(260, 16%, 88%)",

          "base-100": "hsl(261, 23%, 6%)",
          "base-200": "hsl(260, 20%, 11%)",
          "base-300": "hsl(260, 18%, 15%)",
          "base-content": "hsl(260, 16%, 83%)",

          info: "hsl(199, 89%, 48%)",
          success: "hsl(150, 80%, 44%)",
          warning: "#FFCF72",
          error: "#FF8863",

          "--rounded-btn": "9999rem",
          ".tooltip": { "--tooltip-tail": "6px", "--tooltip-color": "oklch(var(--p))" },
          ".link": { textUnderlineOffset: "2px" },
          ".link:hover": { opacity: "80%" },
        },
      },
      {
        carbon: {
          primary: "hsl(210, 100%, 56%)",
          "primary-focus": "hsl(210, 100%, 46%)",
          "primary-content": "hsl(210, 100%, 95%)",

          secondary: "hsl(152, 80%, 52%)",
          "secondary-focus": "hsl(152, 80%, 42%)",
          "secondary-content": "hsl(152, 100%, 95%)",

          accent: "hsl(355, 78%, 56%)",
          "accent-focus": "hsl(355, 78%, 46%)",
          "accent-content": "hsl(355, 100%, 93%)",

          neutral: "hsl(210, 12%, 16%)",
          "neutral-focus": "hsl(210, 14%, 10%)",
          "neutral-content": "hsl(210, 11%, 89%)",

          "base-100": "hsl(210, 15%, 6%)",
          "base-200": "hsl(210, 13%, 11%)",
          "base-300": "hsl(210, 11%, 15%)",
          "base-content": "hsl(210, 11%, 84%)",

          info: "hsl(210, 100%, 56%)",
          success: "hsl(152, 80%, 52%)",
          warning: "#FFCF72",
          error: "#FF8863",

          "--rounded-btn": "9999rem",
          ".tooltip": { "--tooltip-tail": "6px", "--tooltip-color": "oklch(var(--p))" },
          ".link": { textUnderlineOffset: "2px" },
          ".link:hover": { opacity: "80%" },
        },
      },
    ],
  },
  theme: {
    extend: {
      boxShadow: { center: "0 0 12px -2px rgb(0 0 0 / 0.05)" },
      animation: { "pulse-fast": "pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite" },
    },
  },
};
