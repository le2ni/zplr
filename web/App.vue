<template>
  <Suspense v-if="isEditorRoute">
    <EditorWorkspace />
    <template #fallback>
      <div class="flex h-dvh items-center justify-center bg-white dark:bg-zinc-950">
        <div class="text-center">
          <img class="mx-auto h-9 dark:invert" src="./assets/logo.svg" alt="ZPLr" />
          <p class="mt-4 text-sm text-zinc-500" role="status">Opening the local editor…</p>
        </div>
      </div>
    </template>
  </Suspense>

  <div v-else class="relative isolate min-h-screen overflow-hidden bg-white dark:bg-zinc-950">
    <a href="#main-content" class="sr-only z-50 rounded bg-white px-4 py-2 text-zinc-950 shadow focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
      Skip to content
    </a>

    <svg class="absolute inset-0 -z-10 size-full stroke-zinc-200 mask-[radial-gradient(100%_100%_at_top_right,white,transparent)] dark:stroke-white/10" aria-hidden="true">
      <defs>
        <pattern id="zplr-landing-grid" width="200" height="200" x="50%" y="-1" patternUnits="userSpaceOnUse">
          <path d="M.5 200V.5H200" fill="none" />
        </pattern>
      </defs>
      <svg x="50%" y="-1" class="overflow-visible fill-zinc-50 dark:fill-zinc-900/40">
        <path d="M-200 0h201v201h-201Z M600 0h201v201h-201Z M-400 600h201v201h-201Z M200 800h201v201h-201Z" stroke-width="0" />
      </svg>
      <rect width="100%" height="100%" fill="url(#zplr-landing-grid)" stroke-width="0" />
    </svg>

    <div class="absolute top-10 left-[calc(50%-4rem)] -z-10 transform-gpu blur-3xl sm:left-[calc(50%-18rem)] lg:top-[calc(50%-30rem)] lg:left-48 xl:left-[calc(50%-24rem)]" aria-hidden="true">
      <div class="aspect-1108/632 w-277 bg-linear-to-r from-zinc-400 to-zinc-900 opacity-20 dark:from-white dark:to-zinc-500 dark:opacity-10" style="clip-path: polygon(73.6% 51.7%,91.7% 11.8%,100% 46.4%,97.4% 82.2%,92.5% 84.9%,75.7% 64%,55.3% 47.5%,46.5% 49.4%,45% 62.9%,50.3% 87.2%,21.3% 64.1%,.1% 100%,5.4% 51.1%,21.4% 63.9%,58.9% .2%,73.6% 51.7%)" />
    </div>

    <main id="main-content" class="mx-auto grid min-h-dvh max-w-7xl items-center gap-12 px-6 py-10 sm:py-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(430px,1.1fr)] lg:gap-10 lg:px-8 lg:py-6 xl:gap-14 xl:py-8">
      <section class="mx-auto max-w-2xl lg:mx-0">
        <img class="h-12 dark:invert sm:h-14 lg:h-12 xl:h-14" src="./assets/logo.svg" alt="ZPLr logo" />

        <div class="mt-10 flex flex-wrap items-center gap-3 lg:mt-8 xl:mt-10">
          <a href="https://github.com/le2ni/zplr" target="_blank" rel="noreferrer" class="inline-flex items-center rounded-full bg-zinc-50 px-3 py-1 text-sm/6 font-semibold text-zinc-600 ring-1 ring-zinc-600/20 ring-inset transition hover:bg-zinc-100 dark:bg-white/5 dark:text-zinc-300 dark:ring-white/10 dark:hover:bg-white/10">
            <svg class="mr-2 size-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.21 11.39.6.11.79-.26.79-.58v-2.23c-3.34.72-4.03-1.42-4.03-1.42-.55-1.39-1.33-1.76-1.33-1.76-1.09-.74.08-.73.08-.73 1.21.09 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.49 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23A11.5 11.5 0 0 1 12 6.8c1.02.01 2.05.14 3.01.41 2.29-1.56 3.3-1.23 3.3-1.23.65 1.65.24 2.87.12 3.17.77.84 1.23 1.91 1.23 3.22 0 4.61-2.81 5.62-5.48 5.92.43.37.82 1.1.82 2.22v3.3c0 .32.19.69.8.57A12 12 0 0 0 12 0Z" /></svg>
            GitHub
          </a>
          <a href="https://www.npmjs.com/package/zplr" target="_blank" rel="noreferrer" class="inline-flex items-center gap-1 text-sm/6 font-medium text-zinc-600 transition hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white">
            v{{ packageVersion }}
            <IconChevronRight class="size-5 text-zinc-400" aria-hidden="true" />
          </a>
        </div>

        <h1 class="mt-6 text-5xl font-extrabold tracking-tight text-zinc-950 sm:text-6xl lg:text-5xl xl:text-6xl dark:text-white">ZPLr</h1>
        <p class="mt-5 max-w-xl text-lg/8 font-medium text-zinc-500 sm:text-xl/8 lg:text-lg/7 xl:text-xl/8 dark:text-zinc-400">
          Parse, inspect, and render ZPL labels with deterministic black-and-white output in Node.js and the browser.
        </p>
        <p class="mt-3 max-w-lg text-sm/6 text-zinc-500 dark:text-zinc-500" data-testid="local-only-notice">
          A modern ZPL II 2025 renderer with packed rasters, real label dimensions, diagnostics, graphics, fonts, and common barcodes. Rendering is local-only. Label source and generated images never leave this browser.
        </p>

        <div class="mt-6 flex flex-wrap items-center gap-4">
          <a href="/editor" class="inline-flex items-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200">
            <IconTextBoxEdit class="mr-2 size-5" aria-hidden="true" />
            Open ZPL editor
          </a>
          <a href="https://github.com/le2ni/zplr#readme" target="_blank" rel="noreferrer" class="inline-flex items-center rounded-lg px-3 py-2.5 text-sm font-semibold text-zinc-900 transition hover:bg-black/5 dark:text-white dark:hover:bg-white/5">
            Get started
            <IconChevronRight class="ml-1 size-5 text-zinc-400" aria-hidden="true" />
          </a>
        </div>

        <dl class="mt-8 grid max-w-lg grid-cols-3 divide-x divide-zinc-200 dark:divide-white/10">
          <div class="pr-5"><dt class="text-xs text-zinc-500">ZPL commands</dt><dd class="mt-1 text-lg font-semibold text-zinc-950 dark:text-white">{{ commandCount || "…" }}</dd></div>
          <div class="px-5"><dt class="text-xs text-zinc-500">Canonical raster</dt><dd class="mt-1 text-lg font-semibold text-zinc-950 dark:text-white">1-bit</dd></div>
          <div class="pl-5"><dt class="text-xs text-zinc-500">Rendering</dt><dd class="mt-1 text-lg font-semibold text-zinc-950 dark:text-white">Local-only</dd></div>
        </dl>
      </section>

      <section class="mx-auto w-full max-w-2xl lg:mx-0">
        <a href="/editor" class="group block w-full text-left" aria-label="Open the ZPL editor">
          <div class="overflow-hidden rounded-[2rem] border border-zinc-200 bg-white shadow-2xl shadow-zinc-900/15 ring-1 ring-black/5 transition duration-300 group-hover:-translate-y-1 group-hover:shadow-zinc-900/20 dark:border-white/10 dark:bg-zinc-900 dark:shadow-black/40 dark:ring-white/5">
            <div class="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-white/10 sm:px-5">
              <div class="flex items-center gap-2" aria-hidden="true"><span class="size-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700"></span><span class="size-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700"></span><span class="size-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700"></span></div>
              <span class="font-mono text-xs text-zinc-600 dark:text-zinc-400">shipping-label.zpl</span>
              <span class="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold tracking-wide text-emerald-700 uppercase dark:bg-emerald-400/10 dark:text-emerald-300">Live</span>
            </div>
            <div class="landing-preview-grid flex min-h-[420px] items-center justify-center p-6 sm:min-h-[520px] sm:p-8 lg:h-[clamp(360px,calc(100dvh-12rem),580px)] lg:min-h-0 lg:p-6">
              <span v-if="rendering" class="text-sm text-zinc-400" role="status" aria-live="polite">Rendering label…</span>
              <span v-else-if="renderFailure" class="max-w-sm text-center text-sm text-rose-600">{{ renderFailure }}</span>
              <img v-else-if="previewUrl" :src="previewUrl" alt="Rendered shipping label preview" class="max-h-[480px] max-w-full bg-white object-contain shadow-xl shadow-zinc-900/15 ring-1 ring-zinc-900/10 transition duration-300 group-hover:scale-[1.01] sm:max-h-[520px] lg:h-full lg:max-h-full lg:w-auto" />
            </div>
            <div class="flex items-center justify-between border-t border-zinc-200 px-4 py-3 text-xs text-zinc-500 dark:border-white/10 dark:text-zinc-400 sm:px-5">
              <span v-if="labelMeta">{{ labelMeta.width }} × {{ labelMeta.height }} dots · {{ labelMeta.printDensity }} dots/mm</span>
              <span v-else>Deterministic label preview</span>
              <span class="font-semibold text-zinc-700 transition group-hover:text-zinc-950 dark:text-zinc-300 dark:group-hover:text-white">Open editor →</span>
            </div>
          </div>
        </a>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { defineAsyncComponent, onMounted, ref, shallowRef } from "vue";
import { IconChevronRight, IconTextBoxEdit } from "@iconify-prerendered/vue-mdi";
import shippingSample from "../fixtures/zplr.zpl?raw";
import type { RenderedLabel } from "../src/index.web";

const EditorWorkspace = defineAsyncComponent(() => import("./components/EditorWorkspace.vue"));
const packageVersion = __ZPLR_VERSION__;
const normalizedPath = window.location.pathname.replace(/\/+$/, "") || "/";
const isEditorRoute = normalizedPath === "/editor";
document.title = isEditorRoute
  ? "ZPL Editor — ZPLr"
  : "ZPLr — local ZPL parser and renderer";
const previewUrl = ref<string>();
const rendering = ref(!isEditorRoute);
const renderFailure = ref<string>();
const labelMeta = shallowRef<RenderedLabel<HTMLCanvasElement>>();
const commandCount = ref(0);

onMounted(async () => {
  if (isEditorRoute) return;
  try {
    const { commandCapabilities, renderZpl } = await import("../src/index.web");
    commandCount.value = commandCapabilities.length;
    const result = await renderZpl(shippingSample, {
      printDensity: 8,
      limits: { maxPixels: 5_000_000, maxLabels: 1 },
    });
    labelMeta.value = result.labels[0];
    previewUrl.value = result.labels[0]?.canvas.toDataURL("image/png");
  } catch (error) {
    renderFailure.value = error instanceof Error ? error.message : "The label preview could not be rendered.";
  } finally {
    rendering.value = false;
  }
});
</script>

<style scoped>
.landing-preview-grid {
  background-color: rgb(244 244 245);
  background-image: linear-gradient(rgb(24 24 27 / 0.045) 1px, transparent 1px), linear-gradient(90deg, rgb(24 24 27 / 0.045) 1px, transparent 1px);
  background-size: 20px 20px;
}

@media (prefers-color-scheme: dark) {
  .landing-preview-grid {
    background-color: rgb(24 24 27);
    background-image: linear-gradient(rgb(255 255 255 / 0.035) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255 / 0.035) 1px, transparent 1px);
  }
}
</style>
