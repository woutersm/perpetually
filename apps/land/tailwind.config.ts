/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/{**,.client,.server}/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: "Switzer, system-ui, sans-serif",
      },
      borderRadius: {
        "4xl": "2rem",
      },
    },
  },
  plugins: [
    // require("tailwindcss-animate"),
    // require("@tailwindcss/typography"),
    // require("@tailwindcss/forms"),
    // require("@headlessui/tailwindcss"),
  ],
};
