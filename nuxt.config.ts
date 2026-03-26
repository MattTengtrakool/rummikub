import svgLoader from "vite-svg-loader";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  ssr: false,
  devtools: { enabled: false },

  app: {
    head: {
      charset: "utf-8",
      viewport: "width=device-width, initial-scale=1.0, interactive-widget=resizes-content",
      htmlAttrs: { lang: "en" },
      title: "Rummikub — Play Online with Friends",
      meta: [
        { name: "description", content: "Play Rummikub online with friends in real time. Create a room, share the code, and start playing the classic tile-matching game — no sign-up required." },
        { name: "robots", content: "index, follow" },

        { property: "og:type", content: "website" },
        { property: "og:site_name", content: "Rummikub" },
        { property: "og:title", content: "Rummikub — Play Online with Friends" },
        { property: "og:description", content: "Play Rummikub online with friends in real time. Create a room, share the code, and start playing — no sign-up required." },
        { property: "og:image", content: "/android-chrome-512x512.png" },

        { name: "twitter:card", content: "summary" },
        { name: "twitter:title", content: "Rummikub — Play Online with Friends" },
        { name: "twitter:description", content: "Play Rummikub online with friends in real time. Create a room, share the code, and start playing — no sign-up required." },
        { name: "twitter:image", content: "/android-chrome-512x512.png" },
      ],
    },
  },

  vite: {
    plugins: [
      svgLoader({
        defaultImport: "component",
        svgoConfig: {
          multipass: true,
          plugins: [
            {
              name: "preset-default",
              params: {
                overrides: {
                  // @see https://github.com/svg/svgo/issues/1128
                  removeViewBox: false
                }
              }
            }
          ]
        }
      })
    ],
    optimizeDeps: {
      include: ["jsdoc-type-pratt-parser"]
    }
  },
  modules: [
    "@nuxt/test-utils/module",
    "@nuxtjs/storybook",
    "@nuxtjs/i18n",
    "@nuxt/ui"
  ],
  compatibilityDate: "2024-08-24",
  nitro: {
    experimental: {
      websocket: true
    }
  },
  typescript: {
    typeCheck: true,
    tsConfig: {
      compilerOptions: {
        paths: {
          "@": ["."],
          "@/*": ["./*"]
        }
      }
    }
  },

  i18n: {
    locales: [
      {
        code: "en",
        file: "en.ts"
      }
    ],
    lazy: true,
    langDir: "lang",
    defaultLocale: "en",
    strategy: "no_prefix",
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: "rummikub.lang",
      alwaysRedirect: true
    },
    compilation: {
      strictMessage: false,
      escapeHtml: false
    }
  },

  colorMode: {
    preference: "light"
  }
});
