/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{vue,js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'app-bg': '#1a1a1a',
                'panel-bg': '#242424',
                'control-bg': '#333333',
                'border': '#444444',
                'text': '#ffffff',
                'text-secondary': '#888888',
                'accent': '#42b883'
            }
        },
    },
    plugins: [],
}
