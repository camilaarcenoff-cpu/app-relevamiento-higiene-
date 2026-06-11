/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Identidad visual de la Campaña de Higiene Urbana GCBA
        navy: "#0B2A4A",
        turquesa: "#00B5C0",
        amarillo: "#FFD400",
      },
    },
  },
  plugins: [],
};
