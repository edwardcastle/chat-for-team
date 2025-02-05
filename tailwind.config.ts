import type { Config } from 'tailwindcss';

export default {
  content: [
    './components/**/*.{js,vue,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './plugins/**/*.{js,ts}',
    './app.vue',
    './error.vue'
  ],
  theme: {
    extend: {
      // screens: {
      //   xs: '580px', // mobile
      //   sm: '769px', // tablet-small
      //   md: '1023px', // tablet-big
      //   lg: '1280px', // desktop-small
      //   xl: '1440px', // desktop-big
      //   '2xl': '1600px' // hd
      // }
    }
  },
  plugins: []
} satisfies Config;
