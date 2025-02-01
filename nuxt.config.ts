// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  imports: {
    autoImport: true
  },
  devtools: {enabled: false},
  modules: [
    '@nuxtjs/supabase',
    '@nuxtjs/tailwindcss'
  ],
  supabase: {
    url: process.env.VITE_SUPABASE_URL,
    key: process.env.VITE_SUPABASE_ANON_KEY,
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      exclude: ['/*'],
    }
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
  nitro: {
    devProxy: {
      '/_nuxt': {
        target: 'http://localhost:3000/_nuxt',
        ws: true
      }
    }
  }
})