    /** @type {import('tailwindcss').Config} */
    module.exports = {
      content: ["./App.{js,jsx,ts,tsx}", "./<custom directory>/**/*.{js,jsx,ts,tsx}"], // Replace <custom directory> with your actual directory
      presets: [require("nativewind/preset")],
      theme: {
        extend: {},
      },
      plugins: [],
    };