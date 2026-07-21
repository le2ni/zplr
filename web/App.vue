<template>
  <div class="relative isolate min-h-screen overflow-hidden bg-white dark:bg-zinc-950">
    <svg
      class="absolute inset-0 -z-10 size-full stroke-zinc-200 mask-[radial-gradient(100%_100%_at_top_right,white,transparent)] dark:stroke-white/10"
      aria-hidden="true"
    >
      <defs>
        <pattern
          id="zplr-landing-grid"
          width="200"
          height="200"
          x="50%"
          y="-1"
          patternUnits="userSpaceOnUse"
        >
          <path d="M.5 200V.5H200" fill="none" />
        </pattern>
      </defs>
      <svg x="50%" y="-1" class="overflow-visible fill-zinc-50 dark:fill-zinc-900/40">
        <path
          d="M-200 0h201v201h-201Z M600 0h201v201h-201Z M-400 600h201v201h-201Z M200 800h201v201h-201Z"
          stroke-width="0"
        />
      </svg>
      <rect width="100%" height="100%" fill="url(#zplr-landing-grid)" stroke-width="0" />
    </svg>

    <div
      class="absolute top-10 left-[calc(50%-4rem)] -z-10 transform-gpu blur-3xl sm:left-[calc(50%-18rem)] lg:top-[calc(50%-30rem)] lg:left-48 xl:left-[calc(50%-24rem)]"
      aria-hidden="true"
    >
      <div
        class="aspect-1108/632 w-277 bg-linear-to-r from-zinc-400 to-zinc-900 opacity-20 dark:from-white dark:to-zinc-500 dark:opacity-10"
        style="clip-path: polygon(73.6% 51.7%,91.7% 11.8%,100% 46.4%,97.4% 82.2%,92.5% 84.9%,75.7% 64%,55.3% 47.5%,46.5% 49.4%,45% 62.9%,50.3% 87.2%,21.3% 64.1%,.1% 100%,5.4% 51.1%,21.4% 63.9%,58.9% .2%,73.6% 51.7%)"
      />
    </div>

    <main
      class="mx-auto grid min-h-dvh max-w-7xl items-center gap-12 px-6 py-10 sm:py-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(430px,1.1fr)] lg:gap-10 lg:px-8 lg:py-6 xl:gap-14 xl:py-8"
    >
      <section class="mx-auto max-w-2xl lg:mx-0">
        <img class="h-12 dark:invert sm:h-14 lg:h-12 xl:h-14" src="./assets/logo.svg" alt="ZPLr logo" />

        <div class="mt-10 flex flex-wrap items-center gap-3 lg:mt-8 xl:mt-10">
          <a
            href="https://github.com/le2ni/zplr"
            target="_blank"
            rel="noreferrer"
            class="inline-flex items-center rounded-full bg-zinc-50 px-3 py-1 text-sm/6 font-semibold text-zinc-600 ring-1 ring-zinc-600/20 ring-inset transition hover:bg-zinc-100 dark:bg-white/5 dark:text-zinc-300 dark:ring-white/10 dark:hover:bg-white/10"
          >
            <svg class="mr-2 size-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.21 11.39.6.11.79-.26.79-.58v-2.23c-3.34.72-4.03-1.42-4.03-1.42-.55-1.39-1.33-1.76-1.33-1.76-1.09-.74.08-.73.08-.73 1.21.09 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.49 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23A11.5 11.5 0 0 1 12 6.8c1.02.01 2.05.14 3.01.41 2.29-1.56 3.3-1.23 3.3-1.23.65 1.65.24 2.87.12 3.17.77.84 1.23 1.91 1.23 3.22 0 4.61-2.81 5.62-5.48 5.92.43.37.82 1.1.82 2.22v3.3c0 .32.19.69.8.57A12 12 0 0 0 12 0Z" />
            </svg>
            GitHub
          </a>
          <a
            href="https://www.npmjs.com/package/zplr"
            target="_blank"
            rel="noreferrer"
            class="inline-flex items-center gap-1 text-sm/6 font-medium text-zinc-600 transition hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
          >
            v{{ packageVersion }}
            <IconChevronRight class="size-5 text-zinc-400" aria-hidden="true" />
          </a>
        </div>

        <h1 class="mt-6 text-5xl font-extrabold tracking-tight text-zinc-950 sm:text-6xl lg:text-5xl xl:text-6xl dark:text-white">
          ZPLr
        </h1>
        <p class="mt-5 max-w-xl text-lg/8 font-medium text-zinc-500 sm:text-xl/8 lg:text-lg/7 xl:text-xl/8 dark:text-zinc-400">
          Parse, inspect, and render ZPL labels with deterministic black-and-white output in Node.js and the browser.
        </p>
        <p class="mt-3 max-w-lg text-sm/6 text-zinc-500 dark:text-zinc-500">
          A modern ZPL II 2025 renderer with packed rasters, real label dimensions, diagnostics, graphics, fonts, and common barcodes.
        </p>

        <div class="mt-6 flex flex-wrap items-center gap-4">
          <button
            type="button"
            class="inline-flex cursor-pointer items-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
            @click="editorOpen = true"
          >
            <IconTextBoxEdit class="mr-2 size-5" aria-hidden="true" />
            Open live playground
          </button>
          <a
            href="https://github.com/le2ni/zplr#readme"
            target="_blank"
            rel="noreferrer"
            class="inline-flex items-center rounded-lg px-3 py-2.5 text-sm font-semibold text-zinc-900 transition hover:bg-black/5 dark:text-white dark:hover:bg-white/5"
          >
            Get started
            <IconChevronRight class="ml-1 size-5 text-zinc-400" aria-hidden="true" />
          </a>
        </div>

        <dl class="mt-8 grid max-w-lg grid-cols-3 divide-x divide-zinc-200 dark:divide-white/10">
          <div class="pr-5">
            <dt class="text-xs text-zinc-500">Commands classified</dt>
            <dd class="mt-1 text-lg font-semibold text-zinc-950 dark:text-white">223</dd>
          </div>
          <div class="px-5">
            <dt class="text-xs text-zinc-500">Canonical raster</dt>
            <dd class="mt-1 text-lg font-semibold text-zinc-950 dark:text-white">1-bit</dd>
          </div>
          <div class="pl-5">
            <dt class="text-xs text-zinc-500">Runtime parity</dt>
            <dd class="mt-1 text-lg font-semibold text-zinc-950 dark:text-white">Exact</dd>
          </div>
        </dl>
      </section>

      <section class="mx-auto w-full max-w-2xl lg:mx-0">
        <button
          type="button"
          class="group block w-full cursor-pointer text-left"
          aria-label="Open the live ZPL playground"
          @click="editorOpen = true"
        >
          <div class="overflow-hidden rounded-[2rem] border border-zinc-200 bg-white shadow-2xl shadow-zinc-900/15 ring-1 ring-black/5 transition duration-300 group-hover:-translate-y-1 group-hover:shadow-zinc-900/20 dark:border-white/10 dark:bg-zinc-900 dark:shadow-black/40 dark:ring-white/5">
            <div class="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-white/10 sm:px-5">
              <div class="flex items-center gap-2" aria-hidden="true">
                <span class="size-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                <span class="size-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                <span class="size-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
              </div>
              <span class="font-mono text-xs text-zinc-400">zplr.zpl</span>
              <span class="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold tracking-wide text-emerald-700 uppercase dark:bg-emerald-400/10 dark:text-emerald-300">
                Live
              </span>
            </div>
            <div class="landing-preview-grid flex min-h-[420px] items-center justify-center p-6 sm:min-h-[520px] sm:p-8 lg:h-[clamp(360px,calc(100dvh-12rem),580px)] lg:min-h-0 lg:p-6">
              <span v-if="rendering" class="text-sm text-zinc-400">Rendering label…</span>
              <span v-else-if="renderFailure" class="max-w-sm text-center text-sm text-rose-600">
                {{ renderFailure }}
              </span>
              <img
                v-else-if="previewUrl"
                :src="previewUrl"
                alt="Rendered shipping label preview"
                class="max-h-[480px] max-w-full bg-white object-contain shadow-xl shadow-zinc-900/15 ring-1 ring-zinc-900/10 transition duration-300 group-hover:scale-[1.01] sm:max-h-[520px] lg:h-full lg:max-h-full lg:w-auto"
              />
            </div>
            <div class="flex items-center justify-between border-t border-zinc-200 px-4 py-3 text-xs text-zinc-500 dark:border-white/10 dark:text-zinc-400 sm:px-5">
              <span v-if="activeLabel">
                {{ activeLabel.width }} × {{ activeLabel.height }} dots · {{ activeLabel.printDensity }} dots/mm
              </span>
              <span v-else>Deterministic label preview</span>
              <span class="font-semibold text-zinc-700 transition group-hover:text-zinc-950 dark:text-zinc-300 dark:group-hover:text-white">
                Edit label →
              </span>
            </div>
          </div>
        </button>
      </section>
    </main>
  </div>

  <TransitionRoot as="template" :show="editorOpen">
    <Dialog class="relative z-50" @close="editorOpen = false">
      <TransitionChild
        as="template"
        enter="duration-200 ease-out"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="duration-150 ease-in"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-zinc-950/60 backdrop-blur-sm" />
      </TransitionChild>

      <div class="fixed inset-0 p-0 sm:p-3">
        <TransitionChild
          as="template"
          enter="duration-250 ease-out"
          enter-from="translate-y-4 opacity-0 sm:scale-[.98]"
          enter-to="translate-y-0 opacity-100 sm:scale-100"
          leave="duration-150 ease-in"
          leave-from="translate-y-0 opacity-100 sm:scale-100"
          leave-to="translate-y-4 opacity-0 sm:scale-[.98]"
        >
          <DialogPanel class="mx-auto flex h-full max-w-[1800px] flex-col overflow-hidden bg-white shadow-2xl sm:rounded-2xl dark:bg-zinc-950">
            <header class="flex h-16 shrink-0 items-center justify-between border-b border-zinc-200 px-4 sm:px-6 dark:border-white/10">
              <div class="flex min-w-0 items-center gap-3">
                <img class="size-8 dark:invert" src="./assets/logo.svg" alt="" />
                <div class="min-w-0">
                  <DialogTitle class="truncate text-sm font-semibold text-zinc-950 dark:text-white">
                    ZPLr live playground
                  </DialogTitle>
                  <p class="truncate text-xs text-zinc-500">Deterministic ZPL II 2025 preview</p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <a
                  href="https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands.html"
                  target="_blank"
                  rel="noreferrer"
                  class="hidden rounded-lg px-3 py-2 text-sm font-medium text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500 sm:block dark:hover:bg-white/5 dark:hover:text-white"
                >
                  Command reference ↗
                </a>
                <button
                  type="button"
                  class="rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500 dark:hover:bg-white/10 dark:hover:text-white"
                  @click="editorOpen = false"
                >
                  <span class="sr-only">Close playground</span>
                  <IconClose class="size-6" aria-hidden="true" />
                </button>
              </div>
            </header>

            <div class="shrink-0 border-b border-zinc-200 bg-zinc-50 px-4 py-3 sm:px-6 dark:border-white/10 dark:bg-zinc-900/60">
              <div class="flex flex-wrap items-end gap-3">
                <label class="control min-w-48 grow sm:grow-0">
                  <span>Sample label</span>
                  <select
                    v-model="selectedSample"
                    data-testid="sample-select"
                    @change="loadSample"
                  >
                    <option v-for="sample in samples" :key="sample.id" :value="sample.id">
                      {{ sample.name }}
                    </option>
                  </select>
                </label>
                <label class="control">
                  <span>Print density</span>
                  <select v-model.number="printDensity">
                    <option :value="6">6 dots/mm · 150 dpi</option>
                    <option :value="8">8 dots/mm · 203 dpi</option>
                    <option :value="12">12 dots/mm · 300 dpi</option>
                    <option :value="24">24 dots/mm · 600 dpi</option>
                  </select>
                </label>
                <label class="control">
                  <span>Label dimensions</span>
                  <select v-model="sizeMode">
                    <option value="source">Use ^PW / ^LL</option>
                    <option value="override">Override in dots</option>
                  </select>
                </label>
                <template v-if="sizeMode === 'override'">
                  <label class="control min-w-24">
                    <span>Width</span>
                    <input v-model.number="overrideWidth" min="1" max="32768" type="number" />
                  </label>
                  <label class="control min-w-24">
                    <span>Height</span>
                    <input v-model.number="overrideHeight" min="1" max="32768" type="number" />
                  </label>
                </template>
              </div>
            </div>

            <div class="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[minmax(0,1.15fr)_minmax(380px,.85fr)] lg:overflow-hidden">
              <section class="flex min-h-[680px] min-w-0 flex-col border-zinc-200 lg:min-h-0 lg:border-r dark:border-white/10">
                <div class="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-white/10">
                  <div>
                    <h2 class="text-sm font-semibold text-zinc-950 dark:text-white">ZPL source</h2>
                    <p class="mt-0.5 text-xs text-zinc-500">Click a preview field or diagnostic to find its command.</p>
                  </div>
                  <span class="rounded-full bg-zinc-100 px-2.5 py-1 font-mono text-[10px] font-semibold text-zinc-500 dark:bg-white/5 dark:text-zinc-400">
                    .ZPL
                  </span>
                </div>
                <div class="min-h-[420px] flex-1">
                  <MonacoEditor
                    v-model="source"
                    :cursor-position="editorCursor"
                    :highlight-range="highlightRange"
                    @update:cursor-position="editorCursor = $event"
                  />
                </div>

                <div class="max-h-[36%] min-h-40 shrink-0 overflow-hidden border-t border-zinc-200 dark:border-white/10">
                  <button
                    class="flex w-full items-center justify-between px-4 py-3 text-left"
                    type="button"
                    @click="diagnosticsOpen = !diagnosticsOpen"
                  >
                    <span class="text-sm font-semibold text-zinc-950 dark:text-white">Diagnostics</span>
                    <span class="flex items-center gap-2 text-xs text-zinc-500">
                      <span v-if="errorCount" class="text-rose-600 dark:text-rose-300">{{ errorCount }} errors</span>
                      <span v-if="warningCount" class="text-amber-600 dark:text-amber-300">{{ warningCount }} warnings</span>
                      <span v-if="!errorCount && !warningCount && infoCount" class="text-sky-600 dark:text-sky-300">{{ infoCount }} notes</span>
                      <span v-if="!errorCount && !warningCount && !infoCount" class="text-emerald-600 dark:text-emerald-300">No problems</span>
                      {{ diagnosticsOpen ? "▴" : "▾" }}
                    </span>
                  </button>
                  <div v-if="diagnosticsOpen" class="max-h-56 overflow-auto border-t border-zinc-200 dark:border-white/10">
                    <p v-if="!diagnostics.length" class="px-4 py-6 text-sm text-zinc-500">
                      This job has no diagnostics.
                    </p>
                    <button
                      v-for="(diagnostic, index) in diagnostics"
                      :key="diagnosticKey(diagnostic, index)"
                      class="flex w-full gap-3 border-b border-zinc-100 px-4 py-3 text-left transition last:border-0 hover:bg-zinc-50 dark:border-white/5 dark:hover:bg-white/5"
                      type="button"
                      @click="focusSpan(diagnostic.span)"
                    >
                      <span :class="severityClass(diagnostic.severity)" class="mt-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase">
                        {{ diagnostic.severity }}
                      </span>
                      <span class="min-w-0">
                        <span class="block font-mono text-xs text-zinc-500">
                          {{ diagnostic.code }}<template v-if="diagnostic.command"> · {{ diagnostic.command }}</template>
                        </span>
                        <span class="mt-0.5 block text-sm text-zinc-700 dark:text-zinc-200">{{ diagnostic.message }}</span>
                      </span>
                    </button>
                  </div>
                </div>
              </section>

              <aside class="min-w-0 overflow-y-auto bg-zinc-50 p-4 sm:p-5 dark:bg-zinc-900/50">
                <section class="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900">
                  <div class="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3 dark:border-white/10">
                    <div>
                      <h2 class="text-sm font-semibold text-zinc-950 dark:text-white">Label preview</h2>
                      <p v-if="activeLabel" class="mt-0.5 text-xs text-zinc-500">
                        {{ activeLabel.width }} × {{ activeLabel.height }} dots ·
                        {{ activeLabel.printDensity }} dots/mm ·
                        {{ activeLabel.raster.data.byteLength.toLocaleString() }} bytes
                      </p>
                      <p v-else class="mt-0.5 text-xs text-zinc-500">No renderable label</p>
                    </div>
                    <button
                      type="button"
                      class="rounded-lg bg-zinc-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                      :disabled="!activeLabel"
                      @click="downloadPng"
                    >
                      Download PNG
                    </button>
                  </div>

                  <div v-if="labels.length > 1" class="flex gap-1 overflow-auto border-b border-zinc-200 px-3 py-2 dark:border-white/10">
                    <button
                      v-for="(_, index) in labels"
                      :key="index"
                      type="button"
                      class="rounded-md px-3 py-1.5 text-xs transition"
                      :class="activeLabelIndex === index ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/5'"
                      @click="activeLabelIndex = index"
                    >
                      Label {{ index + 1 }}
                    </button>
                  </div>

                  <div class="landing-preview-grid flex min-h-[460px] items-center justify-center overflow-auto p-6">
                    <span v-if="rendering" class="text-sm text-zinc-400">Rendering packed dots…</span>
                    <div v-else-if="renderFailure" class="max-w-sm rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200">
                      {{ renderFailure }}
                    </div>
                    <img
                      v-else-if="previewUrl"
                      :src="previewUrl"
                      alt="Rendered ZPL label"
                      class="max-h-[600px] max-w-full cursor-crosshair bg-white shadow-xl shadow-zinc-900/15 ring-1 ring-zinc-900/10"
                      @click="selectRenderedField"
                    />
                    <p v-else class="text-sm text-zinc-500">Enter a complete label to preview it.</p>
                  </div>
                </section>

                <section class="mt-4 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-white/10 dark:bg-zinc-900">
                  <div class="flex items-center justify-between gap-3">
                    <div>
                      <h2 class="text-sm font-semibold text-zinc-950 dark:text-white">Command capabilities</h2>
                      <p class="mt-1 text-xs text-zinc-500">
                        {{ capabilityCounts.supported }} supported · {{ capabilityCounts.partial }} partial ·
                        {{ capabilityCounts.nonRendering }} non-rendering
                      </p>
                    </div>
                    <input
                      v-model.trim="capabilityQuery"
                      aria-label="Filter command capabilities"
                      class="w-28 rounded-lg border border-zinc-200 bg-white px-3 py-2 font-mono text-sm text-zinc-800 outline-none placeholder:text-zinc-400 focus:border-zinc-500 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-200"
                      placeholder="^BC"
                    />
                  </div>
                  <div class="mt-3 max-h-56 space-y-2 overflow-auto pr-1">
                    <a
                      v-for="capability in visibleCapabilities"
                      :key="capability.canonical"
                      :href="capability.reference"
                      target="_blank"
                      rel="noreferrer"
                      class="block rounded-lg border border-zinc-100 bg-zinc-50 p-3 transition hover:border-zinc-300 dark:border-white/5 dark:bg-zinc-950/70 dark:hover:border-white/15"
                    >
                      <div class="flex items-center justify-between gap-3">
                        <span class="font-mono text-sm font-semibold text-zinc-950 dark:text-white">{{ capability.canonical }}</span>
                        <span :class="capabilityClass(capability.status)" class="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase">
                          {{ capability.status }}
                        </span>
                      </div>
                      <p class="mt-1 text-xs text-zinc-700 dark:text-zinc-300">{{ capability.name }}</p>
                      <p v-if="capability.limitations?.length" class="mt-1 text-xs leading-5 text-zinc-500">
                        {{ capability.limitations.join(" ") }}
                      </p>
                    </a>
                  </div>
                </section>
              </aside>
            </div>
          </DialogPanel>
        </TransitionChild>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script setup lang="ts">
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  TransitionChild,
  TransitionRoot,
} from "@headlessui/vue";
import {
  IconChevronRight,
  IconClose,
  IconTextBoxEdit,
} from "@iconify-prerendered/vue-mdi";
import { computed, onBeforeUnmount, ref, watch } from "vue";
import packageJson from "../package.json";
import shippingSample from "../fixtures/zplr.zpl?raw";
import retailSample from "../fixtures/retail-upc-ean.zpl?raw";
import assetSample from "../fixtures/asset-matrix-pdf417.zpl?raw";
import storedSample from "../fixtures/stored-resources.zpl?raw";
import {
  commandCapabilities,
  renderZpl,
  type CommandCapabilityStatus,
  type PrintDensity,
  type RenderedLabel,
  type SourceSpan,
  type ZplDiagnostic,
} from "../src/index.web";
import type { HighlightRegion } from "../src/types/RenderContext";
import MonacoEditor from "./components/MonacoEditor.vue";

const samples = [
  { id: "shipping", name: "UTF-8 shipping label", source: shippingSample },
  { id: "retail", name: "Retail UPC / EAN", source: retailSample },
  { id: "asset", name: "Data Matrix / PDF417 asset", source: assetSample },
  { id: "stored", name: "Stored format and graphic", source: storedSample },
] as const;

const packageVersion = packageJson.version;
const selectedSample = ref<(typeof samples)[number]["id"]>("shipping");
const source = ref(shippingSample);
const printDensity = ref<PrintDensity>(8);
const sizeMode = ref<"source" | "override">("source");
const overrideWidth = ref(812);
const overrideHeight = ref(1218);
const labels = ref<RenderedLabel<HTMLCanvasElement>[]>([]);
const diagnostics = ref<ZplDiagnostic[]>([]);
const activeLabelIndex = ref(0);
const previewUrl = ref<string>();
const rendering = ref(false);
const renderFailure = ref<string>();
const editorOpen = ref(false);
const diagnosticsOpen = ref(true);
const editorCursor = ref(0);
const highlightRange = ref<SourceSpan>();
const capabilityQuery = ref("");
let renderTimer: number | undefined;
let renderSequence = 0;

const activeLabel = computed(() => labels.value[activeLabelIndex.value]);
const errorCount = computed(
  () => diagnostics.value.filter(({ severity }) => severity === "error").length
);
const warningCount = computed(
  () => diagnostics.value.filter(({ severity }) => severity === "warning").length
);
const infoCount = computed(
  () => diagnostics.value.filter(({ severity }) => severity === "info").length
);
const capabilityCounts = computed(() => ({
  supported: commandCapabilities.filter(({ status }) => status === "supported").length,
  partial: commandCapabilities.filter(({ status }) => status === "partial").length,
  nonRendering: commandCapabilities.filter(({ status }) => status === "non-rendering").length,
  unsupported: commandCapabilities.filter(({ status }) => status === "unsupported").length,
}));
const visibleCapabilities = computed(() => {
  const query = capabilityQuery.value.toUpperCase();
  const matches = query
    ? commandCapabilities.filter(
        (capability) =>
          capability.canonical.includes(query) ||
          capability.name.toUpperCase().includes(query)
      )
    : commandCapabilities.filter(({ status }) => status !== "unsupported");
  return matches.slice(0, 60);
});

function loadSample(): void {
  const sample = samples.find(({ id }) => id === selectedSample.value);
  if (sample) source.value = sample.source;
}

function focusSpan(span?: SourceSpan): void {
  if (!span) return;
  editorCursor.value = span.start;
  highlightRange.value = { ...span };
}

function diagnosticKey(diagnostic: ZplDiagnostic, index: number): string {
  return `${diagnostic.code}:${diagnostic.span?.start ?? ""}:${index}`;
}

function severityClass(severity: ZplDiagnostic["severity"]): string {
  if (severity === "error") {
    return "bg-rose-100 text-rose-700 dark:bg-rose-400/15 dark:text-rose-300";
  }
  if (severity === "warning") {
    return "bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300";
  }
  return "bg-sky-100 text-sky-700 dark:bg-sky-400/15 dark:text-sky-300";
}

function capabilityClass(status: CommandCapabilityStatus): string {
  if (status === "supported") {
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300";
  }
  if (status === "partial") {
    return "bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300";
  }
  if (status === "non-rendering") {
    return "bg-sky-100 text-sky-700 dark:bg-sky-400/15 dark:text-sky-300";
  }
  return "bg-zinc-100 text-zinc-500 dark:bg-white/5 dark:text-zinc-400";
}

function contains(region: HighlightRegion, x: number, y: number): boolean {
  if (region.type === "circle" && region.radius !== undefined) {
    return (x - region.x) ** 2 + (y - region.y) ** 2 <= region.radius ** 2;
  }
  if (region.width !== undefined && region.height !== undefined) {
    if (region.type === "ellipse") {
      const rx = region.width / 2;
      const ry = region.height / 2;
      return (
        ((x - region.x - rx) / rx) ** 2 +
          ((y - region.y - ry) / ry) ** 2 <=
        1
      );
    }
    return (
      x >= region.x &&
      x <= region.x + region.width &&
      y >= region.y &&
      y <= region.y + region.height
    );
  }
  return Math.hypot(x - region.x, y - region.y) <= 16;
}

function selectRenderedField(event: MouseEvent): void {
  const label = activeLabel.value;
  const image = event.currentTarget as HTMLImageElement;
  if (!label || !image) return;
  const bounds = image.getBoundingClientRect();
  const x = ((event.clientX - bounds.left) / bounds.width) * label.width;
  const y = ((event.clientY - bounds.top) / bounds.height) * label.height;
  const region = [...label.highlightRegions]
    .reverse()
    .find((candidate) => candidate.sourceSpan && contains(candidate, x, y));
  focusSpan(region?.sourceSpan);
}

async function updatePreview(): Promise<void> {
  const sequence = ++renderSequence;
  rendering.value = true;
  renderFailure.value = undefined;
  try {
    const options =
      sizeMode.value === "override"
        ? {
            printDensity: printDensity.value,
            width: Math.max(1, Math.trunc(overrideWidth.value)),
            height: Math.max(1, Math.trunc(overrideHeight.value)),
          }
        : { printDensity: printDensity.value };
    const result = await renderZpl(source.value, options);
    if (sequence !== renderSequence) return;
    labels.value = result.labels;
    diagnostics.value = result.diagnostics;
    activeLabelIndex.value = Math.min(
      activeLabelIndex.value,
      Math.max(0, result.labels.length - 1)
    );
    previewUrl.value = activeLabel.value?.canvas?.toDataURL("image/png");
  } catch (error) {
    if (sequence !== renderSequence) return;
    labels.value = [];
    diagnostics.value = [];
    previewUrl.value = undefined;
    renderFailure.value =
      error instanceof Error ? error.message : "The platform adapter failed.";
  } finally {
    if (sequence === renderSequence) rendering.value = false;
  }
}

function schedulePreview(): void {
  if (renderTimer !== undefined) window.clearTimeout(renderTimer);
  renderTimer = window.setTimeout(() => void updatePreview(), 120);
}

async function downloadPng(): Promise<void> {
  const canvas = activeLabel.value?.canvas;
  if (!canvas) return;
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png")
  );
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `zplr-label-${activeLabelIndex.value + 1}.png`;
  link.click();
  URL.revokeObjectURL(url);
}

watch(
  [source, printDensity, sizeMode, overrideWidth, overrideHeight],
  schedulePreview,
  { immediate: true }
);
watch(activeLabelIndex, () => {
  previewUrl.value = activeLabel.value?.canvas?.toDataURL("image/png");
});
onBeforeUnmount(() => {
  if (renderTimer !== undefined) window.clearTimeout(renderTimer);
});
</script>

<style scoped>
.control {
  display: flex;
  min-width: 9rem;
  flex-direction: column;
  gap: 0.35rem;
  color: rgb(113 113 122);
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.control select,
.control input {
  border: 1px solid rgb(228 228 231);
  border-radius: 0.5rem;
  background: white;
  color: rgb(39 39 42);
  font-size: 0.8rem;
  font-weight: 500;
  letter-spacing: 0;
  outline: none;
  padding: 0.55rem 0.7rem;
  text-transform: none;
}

.control select:focus,
.control input:focus {
  border-color: rgb(113 113 122);
  box-shadow: 0 0 0 3px rgb(161 161 170 / 0.15);
}

.landing-preview-grid {
  background-color: rgb(244 244 245);
  background-image:
    linear-gradient(rgb(24 24 27 / 0.045) 1px, transparent 1px),
    linear-gradient(90deg, rgb(24 24 27 / 0.045) 1px, transparent 1px);
  background-size: 20px 20px;
}

@media (prefers-color-scheme: dark) {
  .control {
    color: rgb(161 161 170);
  }

  .control select,
  .control input {
    border-color: rgb(255 255 255 / 0.1);
    background: rgb(9 9 11);
    color: rgb(228 228 231);
  }

  .control select:focus,
  .control input:focus {
    border-color: rgb(161 161 170);
  }

  .landing-preview-grid {
    background-color: rgb(24 24 27);
    background-image:
      linear-gradient(rgb(255 255 255 / 0.035) 1px, transparent 1px),
      linear-gradient(90deg, rgb(255 255 255 / 0.035) 1px, transparent 1px);
  }
}
</style>
