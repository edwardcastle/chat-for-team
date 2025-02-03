// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  css: [
    '~/assets/css/main.css'
  ],
  imports: {
    autoImport: true
  },
  devtools: {enabled: false},
  modules: [
    '@nuxtjs/supabase',
    '@nuxtjs/tailwindcss'
  ],
  build: {
    transpile: ['@heroicons/vue']
  },
  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  },
  supabase: {
    url: process.env.VITE_SUPABASE_URL,
    key: process.env.VITE_SUPABASE_ANON_KEY,
    cookieOptions: {
      maxAge: 60 * 60 * 8,
      sameSite: 'lax',
      secure: true
    },
    // redirectOptions: {
    //   login: '/login',
    //   callback: '/confirm',
    //   exclude: ['/*'],
    // },
    redirect: false
  },
  vite: {
    server: {
      hmr: {
        clientPort: 3000,
        port: 3000,
        protocol: 'ws',
        host: 'localhost'
      },
      watch: {
        usePolling: true
      }
    }
  },
  devServer: {
    host: '0.0.0.0',
    port: 3000
  },
  app: {
    layoutTransition: { name: 'layout', mode: 'out-in' }
  },
  nitro: {
    devProxy: {
      '/_nuxt': {
        target: 'http://localhost:3000/_nuxt',
        ws: true
      }
    }
  }
})