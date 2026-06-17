/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg:      '#0d0f14',
        bg2:     '#141720',
        bg3:     '#1c2030',
        bg4:     '#242840',
        border:  '#2a2f45',
        green:   '#00d47e',
        blue:    '#4d8fff',
        yellow:  '#f5c842',
        red:     '#ff5757',
        purple:  '#a78bfa',
        teal:    '#2dd4bf',
      },
    },
  },
  plugins: [],
}
