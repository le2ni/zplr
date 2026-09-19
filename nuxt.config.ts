import { createHash } from "node:crypto";
import { lstat, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import packageJson from "./package.json";
import {
  zplCommandGuides,
  zplCommandRoute,
} from "./web/zplDocumentation";

interface PrecacheEntry {
  url: string;
  revision: string | null;
  size: number;
}

// @vite-pwa/nuxt's default HTML rewrite drops the final path segment of
// nested prerendered pages (zpl-commands/caret-a.html becomes zpl-commands),
// so workbox aborts precache generation with conflicting entries and the
// service worker activates with an empty cache. Rewrite HTML files to the
// clean URLs the browser actually requests instead.
function createCleanUrlManifestTransform() {
  const appManifestFolder = "_nuxt/builds/";
  const buildIdJson =
    /(\/)?[0-9a-f]{8}\b-[0-9a-f]{4}\b-[0-9a-f]{4}\b-[0-9a-f]{4}\b-[0-9a-f]{12}\.json$/i;
  return async (entries: PrecacheEntry[]) => {
    for (const entry of entries) {
      if (!entry.url.endsWith(".html")) continue;
      const relative = entry.url.startsWith("/") ? entry.url.slice(1) : entry.url;
      if (relative === "index.html") {
        entry.url = "/";
        continue;
      }
      const parts = relative.split("/");
      const last = parts[parts.length - 1]!.replace(/\.html$/, "");
      if (last === "index") {
        entry.url = `${parts.slice(0, -1).join("/")}/`;
      } else {
        parts[parts.length - 1] = last;
        entry.url = parts.join("/");
      }
    }
    for (const entry of entries) {
      if (entry.url.startsWith(appManifestFolder) && buildIdJson.test(entry.url)) {
        entry.revision = null;
      }
    }
    const latest = `${appManifestFolder}latest.json`;
    const latestPath = resolve(
      fileURLToPath(new URL(".", import.meta.url)),
      ".output",
      "public",
      latest,
    );
    const stats = await lstat(latestPath).catch(() => undefined);
    if (stats?.isFile()) {
      const revision = createHash("md5")
        .update(await readFile(latestPath))
        .digest("hex");
      const latestEntry = entries.find((entry) => entry.url === latest);
      if (latestEntry) {
        latestEntry.revision = revision;
      } else {
        entries.push({ url: latest, revision, size: stats.size });
      }
    } else {
      return { manifest: entries.filter((entry) => entry.url !== latest), warnings: [] };
    }
    return { manifest: entries, warnings: [] };
  };
}

export default defineNuxtConfig({
  compatibilityDate: "2026-07-21",
  ssr: true,
  devtools: { enabled: false },
  modules: ["@vite-pwa/nuxt"],
  pwa: {
    registerType: "autoUpdate",
    experimental: {
      // Payload URLs carry the build id as a query parameter, which never
      // matches a precached entry. This routes them through the network while
      // online and falls back to the query-less precached payload offline.
      enableWorkboxPayloadQueryParams: true,
    },
    manifest: {
      id: "/editor",
      name: "ZPLr — Free Online ZPL Viewer & Editor",
      short_name: "ZPLr",
      description:
        "Parse, render, and design ZPL labels entirely in the browser. Works offline once installed.",
      start_url: "/editor",
      scope: "/",
      display: "standalone",
      background_color: "#18181b",
      theme_color: "#18181b",
      lang: "en",
      categories: ["developer", "productivity", "utilities"],
      icons: [
        { src: "/pwa/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/pwa/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
        { src: "/pwa/icon-192-maskable.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
        { src: "/pwa/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
    },
    workbox: {
      globPatterns: ["**/*.{js,css,html,svg,png,ico,webmanifest,json,ttf}"],
      maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      manifestTransforms: [createCleanUrlManifestTransform()],
      // Every real route is precached as a clean URL, so a navigation fallback
      // is not needed. Leaving it disabled keeps unknown URLs on the network
      // where the static host can answer with a real 404 page.
      navigateFallback: null,
    },
  },
  css: ["~/assets/css/main.css"],
  postcss: {
    plugins: {
      "@tailwindcss/postcss": {},
    },
  },
  alias: {
    "@": fileURLToPath(new URL("./src", import.meta.url)),
  },
  app: {
    head: {
      htmlAttrs: { lang: "en" },
      meta: [
        { charset: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { name: "color-scheme", content: "light dark" },
        { name: "theme-color", content: "#18181b" },
      ],
      link: [
        { rel: "icon", type: "image/png", sizes: "96x96", href: "/favicon-96x96.png" },
        { rel: "icon", type: "image/svg+xml", sizes: "any", href: "/favicon.svg" },
        { rel: "shortcut icon", href: "/favicon.ico" },
        { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
        { rel: "manifest", href: "/manifest.webmanifest" },
      ],
    },
  },
  runtimeConfig: {
    public: {
      siteUrl: "https://zplr.de",
      packageVersion: packageJson.version,
    },
  },
  nitro: {
    preset: "static",
    prerender: {
      routes: [
        "/",
        "/editor",
        "/zpl-commands",
        ...zplCommandGuides.map(zplCommandRoute),
        // useFetch needs a real static fallback when a page payload is missing
        // or stale. The deployed site has no server to answer API requests.
        "/api/zpl-documentation.json",
        ...zplCommandGuides.map(({ slug }) => `/api/zpl-documentation/${slug}.json`),
      ],
      autoSubfolderIndex: false,
      crawlLinks: false,
    },
  },
  typescript: {
    strict: true,
    typeCheck: false,
    includeWorkspace: false,
    tsConfig: {
      compilerOptions: {
        noUncheckedIndexedAccess: false,
        verbatimModuleSyntax: false,
      },
      include: [
        "../env.d.ts",
        "../src/types/**/*.d.ts",
      ],
      exclude: [
        "../src/**/*.test.ts",
        "../web/**/*.test.ts",
        "../tests/**/*",
        "../dist",
        "../.output",
      ],
    },
  },
  vite: {
    build: {
      chunkSizeWarningLimit: 2_000,
    },
  },
  hooks: {
    "build:manifest": (manifest) => {
      // The homepage viewer loads the renderer after user interaction. Leaving
      // this dynamic edge in the SSR manifest emits a 500+ kB prefetch hint and
      // competes with the landing page's critical requests.
      const homepage = Object.values(manifest).find(({ src }) => src === "pages/index.vue");
      if (!homepage?.dynamicImports) return;
      homepage.dynamicImports = homepage.dynamicImports.filter(
        (id) => manifest[id]?.name !== "index.web",
      );
    },
  },
});
