<template>
  <div class="landing min-h-screen overflow-hidden bg-white text-zinc-950 dark:bg-zinc-950 dark:text-white">
    <a
      href="#main-content"
      class="sr-only z-50 rounded-md bg-white px-4 py-2 text-zinc-950 shadow-lg focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
    >
      Skip to content
    </a>

    <header class="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/90 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/90">
      <nav class="mx-auto flex h-16 max-w-7xl items-center gap-6 px-6 lg:px-8" aria-label="Primary navigation">
        <NuxtLink to="/" class="flex shrink-0 items-center gap-2.5" aria-label="ZPLr home">
          <img :src="logoUrl" class="h-8 w-auto dark:invert" alt="" />
          <span class="text-sm font-extrabold tracking-tight">ZPLr</span>
        </NuxtLink>
        <div class="ml-auto flex items-center gap-2">
          <a
            href="https://github.com/le2ni/zplr"
            target="_blank"
            rel="noreferrer"
            class="hidden h-9 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-950 sm:inline-flex dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white"
          >
            <IconGithub class="size-4" aria-hidden="true" />
            GitHub
          </a>
          <NuxtLink
            to="/editor"
            class="inline-flex h-9 items-center rounded-lg bg-zinc-950 px-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            Open Editor
            <IconArrowRight class="ml-1.5 size-4" aria-hidden="true" />
          </NuxtLink>
        </div>
      </nav>
    </header>

    <main id="main-content">
      <section class="landing-grid relative isolate border-b border-zinc-200 dark:border-white/10">
        <div class="landing-glow absolute inset-x-0 top-0 -z-10 h-[620px]" aria-hidden="true"></div>
        <div class="mx-auto max-w-7xl px-6 pt-20 pb-16 lg:px-8 lg:pt-28 lg:pb-24">
          <div class="mx-auto max-w-4xl text-center">
            <div class="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white/80 px-3 py-1 text-xs font-semibold text-zinc-600 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-zinc-300">
              <span class="size-1.5 rounded-full bg-emerald-500" aria-hidden="true"></span>
              Free · open source · local-only
            </div>
            <h1 class="mt-7 text-balance text-5xl font-black tracking-[-0.045em] text-zinc-950 sm:text-6xl lg:text-7xl dark:text-white">
              Free Online ZPL Editor, Viewer &amp; Visual Designer
            </h1>
            <p class="mx-auto mt-7 max-w-3xl text-pretty text-lg/8 text-zinc-600 sm:text-xl/9 dark:text-zinc-400">
              Write Zebra Programming Language, inspect diagnostics, and see every label update in a visual ZPL viewer. Design with code or drag-and-drop tools—your label data stays in your browser.
            </p>
            <div class="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <NuxtLink
                to="/editor"
                aria-label="Open the free ZPL editor"
                class="inline-flex h-12 w-full items-center justify-center rounded-xl bg-zinc-950 px-5 text-sm font-bold text-white shadow-xl shadow-zinc-950/15 transition hover:-translate-y-0.5 hover:bg-zinc-700 sm:w-auto dark:bg-white dark:text-zinc-950 dark:shadow-black/30 dark:hover:bg-zinc-200"
              >
                <IconVectorSquareEdit class="mr-2 size-5" aria-hidden="true" />
                Open the free ZPL editor
              </NuxtLink>
              <a
                href="#library"
                class="inline-flex h-12 w-full items-center justify-center rounded-xl border border-zinc-300 bg-white px-5 text-sm font-bold text-zinc-900 transition hover:-translate-y-0.5 hover:border-zinc-400 hover:bg-zinc-50 sm:w-auto dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
              >
                <IconCodeTags class="mr-2 size-5" aria-hidden="true" />
                Use the ZPLr library
              </a>
            </div>
            <p class="mt-4 text-xs text-zinc-500">
              No sign-up. No label uploads. MIT licensed.
            </p>
          </div>

          <figure class="mx-auto mt-14 max-w-6xl">
            <NuxtLink
              to="/editor"
              class="group block overflow-hidden rounded-2xl border border-zinc-300 bg-zinc-100 shadow-2xl shadow-zinc-950/20 ring-1 ring-black/5 transition duration-300 hover:-translate-y-1 dark:border-white/15 dark:bg-zinc-900 dark:shadow-black/50 dark:ring-white/5"
            >
              <div class="flex h-10 items-center justify-between border-b border-zinc-200 bg-white px-4 dark:border-white/10 dark:bg-zinc-900">
                <div class="flex items-center gap-1.5" aria-hidden="true">
                  <span class="size-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700"></span>
                  <span class="size-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700"></span>
                  <span class="size-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700"></span>
                </div>
                <span class="font-mono text-[11px] text-zinc-500">zplr.de/editor</span>
                <span class="flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-emerald-700 uppercase dark:text-emerald-300">
                  <span class="size-1.5 rounded-full bg-emerald-500"></span>
                  Local
                </span>
              </div>
              <picture class="block">
                <source media="(prefers-color-scheme: dark)" :srcset="screenshots.overviewDark" />
                <img
                  :src="screenshots.overview"
                  width="1440"
                  height="900"
                  fetchpriority="high"
                  alt="ZPLr online ZPL editor showing ZPL code beside a rendered shipping label preview"
                  class="aspect-8/5 w-full bg-zinc-100 object-cover object-top dark:bg-zinc-900"
                />
              </picture>
            </NuxtLink>
            <figcaption class="mt-4 text-center text-sm text-zinc-500">
              One workspace for ZPL source, live output, diagnostics, and visual editing.
            </figcaption>
          </figure>

          <dl class="mx-auto mt-14 grid max-w-4xl grid-cols-1 divide-y divide-zinc-200 border-y border-zinc-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0 dark:divide-white/10 dark:border-white/10">
            <div class="px-6 py-5 text-center">
              <dt class="text-xs font-semibold tracking-wider text-zinc-500 uppercase">Language coverage</dt>
              <dd class="mt-1 text-xl font-black">200+ commands recognized</dd>
            </div>
            <div class="px-6 py-5 text-center">
              <dt class="text-xs font-semibold tracking-wider text-zinc-500 uppercase">Runtime</dt>
              <dd class="mt-1 text-xl font-black">Node.js + browser</dd>
            </div>
            <div class="px-6 py-5 text-center">
              <dt class="text-xs font-semibold tracking-wider text-zinc-500 uppercase">Processing</dt>
              <dd class="mt-1 text-xl font-black">100% local</dd>
            </div>
          </dl>
        </div>
      </section>

      <section id="features" class="scroll-mt-24 border-b border-zinc-200 py-20 sm:py-28 dark:border-white/10">
        <div class="mx-auto max-w-7xl px-6 lg:px-8">
          <div class="max-w-3xl">
            <p class="landing-eyebrow">Editor, viewer, and designer</p>
            <h2 class="landing-section-title">Three ways to work with one ZPL label</h2>
            <p class="landing-section-copy">
              Start in source code, inspect the rendered result, or select fields directly on the label. Every view stays synchronized so you can move quickly without losing control of the underlying ZPL.
            </p>
          </div>
          <div class="mt-12 grid gap-px overflow-hidden rounded border border-zinc-200 bg-zinc-200 md:grid-cols-3 dark:border-white/10 dark:bg-white/10">
            <article v-for="feature in primaryFeatures" :key="feature.title" class="bg-white p-7 sm:p-8 dark:bg-zinc-950">
              <component :is="feature.icon" class="size-6 text-zinc-950 dark:text-white" aria-hidden="true" />
              <h3 class="mt-5 text-lg font-bold">{{ feature.title }}</h3>
              <p class="mt-3 text-sm/7 text-zinc-600 dark:text-zinc-400">{{ feature.description }}</p>
              <ul class="mt-5 space-y-2.5 text-sm text-zinc-700 dark:text-zinc-300">
                <li v-for="item in feature.items" :key="item" class="flex gap-2">
                  <IconCheckCircleOutline class="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                  <span>{{ item }}</span>
                </li>
              </ul>
            </article>
          </div>
        </div>
      </section>

      <section class="border-b border-zinc-200 bg-zinc-50 py-20 sm:py-28 dark:border-white/10 dark:bg-zinc-900/30">
        <div class="mx-auto grid max-w-7xl items-center gap-12 px-6 lg:grid-cols-[0.82fr_1.18fr] lg:gap-16 lg:px-8">
          <div>
            <p class="landing-eyebrow">Live ZPL preview</p>
            <h2 class="landing-section-title">Write code. See the label—not a guess.</h2>
            <p class="landing-section-copy">
              The online ZPL viewer renders a deterministic one-bit raster locally as you type. Source-linked diagnostics, command documentation, formatting, and safety limits help you find problems before a label reaches a print workflow.
            </p>
            <ul class="mt-7 grid gap-4 text-sm/6 text-zinc-700 sm:grid-cols-2 lg:grid-cols-1 dark:text-zinc-300">
              <li v-for="item in previewFeatures" :key="item" class="flex gap-3">
                <IconCheckCircleOutline class="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                <span>{{ item }}</span>
              </li>
            </ul>
            <NuxtLink to="/editor" class="landing-text-link mt-8">
              Preview ZPL online
              <IconArrowRight class="size-4" aria-hidden="true" />
            </NuxtLink>
          </div>
          <figure class="overflow-hidden rounded border border-zinc-200 bg-white shadow-xl shadow-zinc-950/10 dark:border-white/10 dark:bg-zinc-900 dark:shadow-black/30">
            <picture class="block">
              <source media="(prefers-color-scheme: dark)" :srcset="screenshots.overviewDark" />
              <img
                :src="screenshots.overview"
                width="1440"
                height="900"
                loading="lazy"
                alt="Online ZPL viewer with source code, diagnostics, and a live label preview"
                class="aspect-8/5 w-full object-cover object-top"
              />
            </picture>
          </figure>
        </div>
      </section>

      <section id="designer" class="scroll-mt-24 border-b border-zinc-200 py-20 sm:py-28 dark:border-white/10">
        <div class="mx-auto grid max-w-7xl items-center gap-12 px-6 lg:grid-cols-[1.18fr_0.82fr] lg:gap-16 lg:px-8">
          <figure class="order-2 overflow-hidden rounded border border-zinc-200 bg-white shadow-xl shadow-zinc-950/10 lg:order-1 dark:border-white/10 dark:bg-zinc-900 dark:shadow-black/30">
            <picture class="block">
              <source media="(prefers-color-scheme: dark)" :srcset="screenshots.designerDark" />
              <img
                :src="screenshots.designer"
                width="1440"
                height="900"
                loading="lazy"
                alt="Visual ZPL label designer with a drag-and-drop canvas, layers, guides, and field properties"
                class="aspect-8/5 w-full object-cover object-top"
              />
            </picture>
          </figure>
          <div class="order-1 lg:order-2">
            <p class="landing-eyebrow">Visual ZPL designer</p>
            <h2 class="landing-section-title">Design on the label while keeping real ZPL underneath</h2>
            <p class="landing-section-copy">
              Drag, resize, align, distribute, lock, hide, and reorder supported fields on a WYSIWYG canvas. Rulers, snapping, manual guides, layers, and property controls make precise label layout faster.
            </p>
            <div class="mt-8 grid grid-cols-2 gap-3">
              <div v-for="item in designerFeatures" :key="item" class="rounded-lg border border-zinc-200 px-3 py-3 text-sm font-medium text-zinc-700 dark:border-white/10 dark:text-zinc-300">
                {{ item }}
              </div>
            </div>
            <NuxtLink to="/editor" class="landing-text-link mt-8">
              Start designing a ZPL label
              <IconArrowRight class="size-4" aria-hidden="true" />
            </NuxtLink>
          </div>
        </div>
      </section>

      <section class="border-b border-zinc-200 bg-zinc-950 py-20 text-white sm:py-28 dark:border-white/10">
        <div class="mx-auto grid max-w-7xl items-center gap-12 px-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16 lg:px-8">
          <div>
            <p class="text-xs font-bold tracking-[0.16em] text-zinc-400 uppercase">Variable data and assets</p>
            <h2 class="mt-3 text-3xl font-black tracking-tight sm:text-4xl">One design, every record</h2>
            <p class="mt-5 text-base/8 text-zinc-400">
              Import CSV or JSON, bind columns to <code class="landing-inline-code-dark">^FN</code> fields, preview each record, and turn ZPL into PNG batches. Images and fonts are managed in the same local workspace.
            </p>
            <div class="mt-8 grid gap-5 sm:grid-cols-2">
              <div v-for="feature in dataFeatures" :key="feature.title">
                <component :is="feature.icon" class="size-5 text-white" aria-hidden="true" />
                <h3 class="mt-3 text-sm font-bold">{{ feature.title }}</h3>
                <p class="mt-1.5 text-sm/6 text-zinc-400">{{ feature.description }}</p>
              </div>
            </div>
          </div>
          <figure class="overflow-hidden rounded border border-white/15 bg-zinc-900 shadow-2xl shadow-black/40">
            <picture class="block">
              <source media="(prefers-color-scheme: dark)" :srcset="screenshots.variableDataDark" />
              <img
                :src="screenshots.variableData"
                width="1440"
                height="900"
                loading="lazy"
                alt="ZPL variable data manager previewing records imported from CSV or JSON for batch label export"
                class="aspect-8/5 w-full object-cover object-top"
              />
            </picture>
          </figure>
        </div>
      </section>

      <section class="border-b border-zinc-200 py-20 sm:py-24 dark:border-white/10">
        <div class="mx-auto max-w-5xl px-6 text-center lg:px-8">
          <div class="mx-auto flex size-12 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 dark:border-white/10 dark:bg-white/5">
            <IconCloudOffOutline class="size-6" aria-hidden="true" />
          </div>
          <p class="landing-eyebrow mt-6">Private by architecture</p>
          <h2 class="landing-section-title mx-auto max-w-3xl">Your ZPL never needs to leave the browser</h2>
          <p class="landing-section-copy mx-auto max-w-3xl" data-testid="local-only-notice">
            ZPLr parses, renders, and edits labels on your device. Your ZPL and imported data never leave this browser for processing. There is no account, upload API, or server-side label processing.
          </p>
          <div class="mx-auto mt-10 grid max-w-3xl gap-px overflow-hidden rounded-xl border border-zinc-200 bg-zinc-200 text-left sm:grid-cols-3 dark:border-white/10 dark:bg-white/10">
            <div v-for="item in privacyPoints" :key="item.title" class="bg-white p-5 dark:bg-zinc-950">
              <h3 class="text-sm font-bold">{{ item.title }}</h3>
              <p class="mt-2 text-xs/5 text-zinc-500">{{ item.description }}</p>
            </div>
          </div>
        </div>
      </section>

      <section id="library" class="landing-code-grid scroll-mt-24 border-b border-zinc-800 bg-zinc-950 py-20 text-white sm:py-28">
        <div class="mx-auto max-w-7xl px-6 lg:px-8">
          <div class="grid gap-12 lg:grid-cols-[0.82fr_1.18fr] lg:gap-16">
            <div>
              <p class="text-xs font-bold tracking-[0.16em] text-zinc-400 uppercase">JavaScript and TypeScript ZPL library</p>
              <h2 class="mt-3 text-3xl font-black tracking-tight sm:text-4xl">One ZPL engine, two runtimes</h2>
              <p class="mt-5 text-base/8 text-zinc-400">
                Use ZPLr as a Node.js ZPL renderer in backend jobs or as a browser library for local previews. Both entries share the parser, diagnostics, command capabilities, and deterministic raster model.
              </p>
              <ul class="mt-8 space-y-3 text-sm text-zinc-300">
                <li v-for="item in libraryFeatures" :key="item" class="flex gap-3">
                  <IconCheckCircleOutline class="mt-0.5 size-5 shrink-0 text-emerald-400" aria-hidden="true" />
                  <span>{{ item }}</span>
                </li>
              </ul>
              <div class="mt-9 flex flex-wrap gap-3">
                <a
                  href="https://www.npmjs.com/package/zplr"
                  target="_blank"
                  rel="noreferrer"
                  class="inline-flex h-10 items-center rounded-lg bg-white px-4 text-sm font-bold text-zinc-950 transition hover:bg-zinc-200"
                >
                  npm install zplr
                  <IconOpenInNew class="ml-2 size-4" aria-hidden="true" />
                </a>
                <a
                  href="https://github.com/le2ni/zplr/blob/main/USAGE.md"
                  target="_blank"
                  rel="noreferrer"
                  class="inline-flex h-10 items-center rounded-lg border border-white/15 px-4 text-sm font-bold transition hover:bg-white/10"
                >
                  Read usage guide
                </a>
              </div>
            </div>

            <div class="space-y-4">
              <article class="overflow-hidden rounded-xl border border-white/10 bg-black/30">
                <header class="flex items-center justify-between border-b border-white/10 px-4 py-3">
                  <span class="flex items-center gap-2 text-xs font-bold"><IconPackageVariantClosed class="size-4" aria-hidden="true" /> Node.js</span>
                  <span class="flex items-center gap-3">
                    <code class="text-[11px] text-zinc-400">zplr · zplr/node</code>
                    <button
                      type="button"
                      class="snippet-copy-button"
                      :aria-label="copiedSnippet === 'node' ? 'Node.js example copied' : 'Copy Node.js example'"
                      @click="copySnippet('node', nodeExample)"
                    >
                      <IconCheckCircleOutline v-if="copiedSnippet === 'node'" class="size-3.5 text-emerald-300" aria-hidden="true" />
                      <IconContentCopy v-else class="size-3.5" aria-hidden="true" />
                      <span aria-live="polite">{{ copiedSnippet === "node" ? "Copied" : "Copy" }}</span>
                    </button>
                  </span>
                </header>
                <pre class="overflow-x-auto p-5 text-[13px]/6 text-zinc-300"><code><span
                  v-for="(token, index) in highlightedNodeExample"
                  :key="index"
                  :class="`syntax-${token.kind}`"
                >{{ token.value }}</span></code></pre>
              </article>
              <article class="overflow-hidden rounded-xl border border-white/10 bg-black/30">
                <header class="flex items-center justify-between border-b border-white/10 px-4 py-3">
                  <span class="flex items-center gap-2 text-xs font-bold"><IconEyeOutline class="size-4" aria-hidden="true" /> Browser</span>
                  <span class="flex items-center gap-3">
                    <code class="text-[11px] text-zinc-400">zplr/web</code>
                    <button
                      type="button"
                      class="snippet-copy-button"
                      :aria-label="copiedSnippet === 'browser' ? 'Browser example copied' : 'Copy browser example'"
                      @click="copySnippet('browser', browserExample)"
                    >
                      <IconCheckCircleOutline v-if="copiedSnippet === 'browser'" class="size-3.5 text-emerald-300" aria-hidden="true" />
                      <IconContentCopy v-else class="size-3.5" aria-hidden="true" />
                      <span aria-live="polite">{{ copiedSnippet === "browser" ? "Copied" : "Copy" }}</span>
                    </button>
                  </span>
                </header>
                <pre class="overflow-x-auto p-5 text-[13px]/6 text-zinc-300"><code><span
                  v-for="(token, index) in highlightedBrowserExample"
                  :key="index"
                  :class="`syntax-${token.kind}`"
                >{{ token.value }}</span></code></pre>
              </article>
            </div>
          </div>

          <div class="mt-14 grid gap-3 border-t border-white/10 pt-8 sm:grid-cols-3">
            <a
              v-for="link in libraryLinks"
              :key="link.title"
              :href="link.href"
              target="_blank"
              rel="noreferrer"
              class="group flex items-center justify-between rounded-lg border border-white/10 px-4 py-4 transition hover:bg-white/5"
            >
              <span>
                <strong class="block text-sm">{{ link.title }}</strong>
                <span class="mt-1 block text-xs text-zinc-400">{{ link.description }}</span>
              </span>
              <IconArrowRight class="size-4 text-zinc-400 transition group-hover:translate-x-0.5 group-hover:text-white" aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>

      <section class="border-b border-zinc-200 py-20 sm:py-28 dark:border-white/10">
        <div class="mx-auto max-w-7xl px-6 lg:px-8">
          <div class="mx-auto max-w-3xl text-center">
            <p class="landing-eyebrow">Built for real label work</p>
            <h2 class="landing-section-title">From a first preview to an automated label pipeline</h2>
          </div>
          <div class="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <article v-for="useCase in useCases" :key="useCase.title" class="border-t-2 border-zinc-950 pt-5 dark:border-white">
              <span class="font-mono text-xs text-zinc-600 dark:text-zinc-400">{{ useCase.number }}</span>
              <h3 class="mt-4 text-base font-bold">{{ useCase.title }}</h3>
              <p class="mt-2 text-sm/6 text-zinc-600 dark:text-zinc-400">{{ useCase.description }}</p>
            </article>
          </div>
        </div>
      </section>

      <section id="faq" class="scroll-mt-24 bg-zinc-50 py-20 sm:py-28 dark:bg-zinc-900/30">
        <div class="mx-auto grid max-w-6xl gap-12 px-6 lg:grid-cols-[0.7fr_1.3fr] lg:gap-16 lg:px-8">
          <div>
            <p class="landing-eyebrow">Frequently asked questions</p>
            <h2 class="landing-section-title">About the ZPL editor and library</h2>
            <p class="landing-section-copy">
              Need implementation details? The project documentation covers command support, diagnostics, limits, and runtime APIs.
            </p>
          </div>
          <div class="divide-y divide-zinc-200 border-y border-zinc-200 dark:divide-white/10 dark:border-white/10">
            <details v-for="(faq, index) in faqs" :key="faq.question" class="group py-5" :open="index === 0">
              <summary class="flex cursor-pointer list-none items-start justify-between gap-5 text-left font-bold">
                <span>{{ faq.question }}</span>
                <span class="mt-0.5 text-xl leading-none text-zinc-400 transition group-open:rotate-45" aria-hidden="true">+</span>
              </summary>
              <p class="max-w-3xl pt-3 text-sm/7 text-zinc-600 dark:text-zinc-400">{{ faq.answer }}</p>
            </details>
          </div>
        </div>
      </section>

      <section class="border-y border-zinc-200 bg-white py-20 dark:border-white/10 dark:bg-zinc-950">
        <div class="mx-auto max-w-4xl px-6 text-center">
          <img :src="logoUrl" class="mx-auto h-12 dark:invert" alt="" />
          <h2 class="mt-7 text-3xl font-black tracking-tight sm:text-5xl">Your next ZPL label can start here</h2>
          <p class="mx-auto mt-5 max-w-2xl text-base/7 text-zinc-600 dark:text-zinc-400">
            Open the editor with a working shipping-label example, then change the code, move fields visually, or connect variable data.
          </p>
          <NuxtLink
            to="/editor"
            class="mt-8 inline-flex h-12 items-center rounded-xl bg-zinc-950 px-5 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-zinc-700 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            Open the free ZPL editor
            <IconArrowRight class="ml-2 size-5" aria-hidden="true" />
          </NuxtLink>
        </div>
      </section>
    </main>

    <footer class="bg-zinc-950 py-12 text-zinc-400">
      <div class="mx-auto max-w-7xl px-6 lg:px-8">
        <div class="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div class="flex items-center gap-2.5 text-white">
              <img :src="logoUrl" class="h-8 invert" alt="" />
              <span class="text-sm font-extrabold">ZPLr</span>
              <span class="text-xs text-zinc-400">v{{ config.public.packageVersion }}</span>
            </div>
            <p class="mt-3 max-w-sm text-xs/5">An independent, open-source ZPL parser, renderer, editor, viewer, and visual designer.</p>
          </div>
          <nav class="flex flex-wrap gap-x-6 gap-y-3 text-sm" aria-label="Footer navigation">
            <NuxtLink to="/editor" class="hover:text-white">Editor</NuxtLink>
            <a href="https://www.npmjs.com/package/zplr" target="_blank" rel="noreferrer" class="hover:text-white">npm</a>
            <a href="https://github.com/le2ni/zplr" target="_blank" rel="noreferrer" class="hover:text-white">GitHub</a>
            <a href="https://github.com/le2ni/zplr/blob/main/docs/COMMAND_SUPPORT.md" target="_blank" rel="noreferrer" class="hover:text-white">Command support</a>
            <a href="https://github.com/le2ni/zplr/blob/main/LICENSE" target="_blank" rel="noreferrer" class="hover:text-white">MIT license</a>
          </nav>
        </div>
        <div class="mt-10 border-t border-white/10 pt-6 text-[11px]/5 text-zinc-400">
          <p>ZPL, ZPL II, Zebra, and Zebra Programming Language are trademarks or registered trademarks of Zebra Technologies Corp.</p>
          <p>ZPLr is independent and is not affiliated with, sponsored by, endorsed by, or certified by Zebra Technologies Corp.</p>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import {
  IconArrowRight,
  IconCheckCircleOutline,
  IconCloudOffOutline,
  IconCodeTags,
  IconContentCopy,
  IconDatabaseOutline,
  IconEyeOutline,
  IconFileDocumentOutline,
  IconGithub,
  IconImageOutline,
  IconOpenInNew,
  IconPackageVariantClosed,
  IconVectorSquareEdit,
} from "@iconify-prerendered/vue-mdi";
import logoUrl from "../../web/assets/logo.svg";

const config = useRuntimeConfig();
const canonical = `${config.public.siteUrl}/`;
const title = "Free Online ZPL Editor, Viewer & Visual Designer | ZPLr";
const description = "Edit, preview, and visually design ZPL labels locally in your browser. Use ZPLr as a free online editor or a TypeScript renderer for Node.js and the web.";
const socialImage = `${config.public.siteUrl}/screenshots/zpl-editor-social.png`;
const screenshots = {
  overview: "/screenshots/zpl-editor-overview.png",
  overviewDark: "/screenshots/zpl-editor-overview-dark.png",
  designer: "/screenshots/zpl-visual-designer.png",
  designerDark: "/screenshots/zpl-visual-designer-dark.png",
  variableData: "/screenshots/zpl-variable-data.png",
  variableDataDark: "/screenshots/zpl-variable-data-dark.png",
};

const primaryFeatures = [
  {
    icon: IconCodeTags,
    title: "ZPL editor",
    description: "Edit ZPL with a language-aware Monaco workspace built for label source.",
    items: ["Syntax highlighting and formatting", "Parameter-aware command help", "Source-linked diagnostics"],
  },
  {
    icon: IconEyeOutline,
    title: "ZPL viewer",
    description: "Render a live black-and-white label preview without sending code to an external API.",
    items: ["True label dimensions", "Barcode and QR rendering", "PNG export"],
  },
  {
    icon: IconVectorSquareEdit,
    title: "ZPL designer",
    description: "Work directly on supported fields while keeping the underlying ZPL synchronized.",
    items: ["Drag, resize, and align", "Layers, guides, and properties", "Code and canvas selection sync"],
  },
];

const previewFeatures = [
  "Live browser rendering with configurable print density",
  "ZPL validator diagnostics linked back to source",
  "Command catalog with parameter guidance",
  "Multiple labels, files, and workspace ZIPs",
];

const designerFeatures = [
  "Drag and resize",
  "Snap and guides",
  "Align and distribute",
  "Layers and properties",
  "Lock and hide fields",
  "Keyboard editing",
];

const dataFeatures = [
  {
    icon: IconDatabaseOutline,
    title: "CSV and JSON records",
    description: "Import structured data and map columns to numbered ZPL fields.",
  },
  {
    icon: IconImageOutline,
    title: "Images and fonts",
    description: "Import workspace assets and manage their ZPL resource names.",
  },
  {
    icon: IconEyeOutline,
    title: "Record preview",
    description: "Step through live record values before producing a batch.",
  },
  {
    icon: IconFileDocumentOutline,
    title: "Flexible export",
    description: "Save ZPL, PNG images, batch PNGs, or a complete workspace ZIP.",
  },
];

const privacyPoints = [
  { title: "No upload endpoint", description: "Label source and imported datasets are processed by the browser application." },
  { title: "No account required", description: "Open the editor and begin working without creating a profile." },
  { title: "Open implementation", description: "Inspect the MIT-licensed code and integrate the same engine yourself." },
];

const libraryFeatures = [
  "Typed ESM APIs for parsing and rendering ZPL",
  "Node canvas output through the optional skia-canvas peer",
  "HTMLCanvasElement and Blob output in modern browsers",
  "Reusable render sessions, structured diagnostics, and safety limits",
];

const libraryLinks = [
  {
    title: "Command support",
    description: "See supported, partial, and recognized commands.",
    href: "https://github.com/le2ni/zplr/blob/main/docs/COMMAND_SUPPORT.md",
  },
  {
    title: "Diagnostics",
    description: "Use stable codes in integrations and tooling.",
    href: "https://github.com/le2ni/zplr/blob/main/docs/DIAGNOSTICS.md",
  },
  {
    title: "Source on GitHub",
    description: "Review the renderer or contribute a change.",
    href: "https://github.com/le2ni/zplr",
  },
];

const useCases = [
  { number: "01", title: "Shipping labels", description: "Inspect addresses, tracking barcodes, routing blocks, and print dimensions." },
  { number: "02", title: "Retail and inventory", description: "Build UPC, EAN, Code 128, Data Matrix, QR, and item-label templates." },
  { number: "03", title: "Template workflows", description: "Bind CSV or JSON records to ^FN fields and preview every variation." },
  { number: "04", title: "Application previews", description: "Embed ZPL parsing and rendering in Node.js services or browser interfaces." },
];

const faqs = [
  {
    question: "What is a ZPL editor?",
    answer: "A ZPL editor helps you write and inspect Zebra Programming Language label source. ZPLr combines source editing, command guidance, diagnostics, live rendering, and visual field editing in one browser workspace.",
  },
  {
    question: "Can I preview ZPL online without uploading my label?",
    answer: "Yes. ZPLr runs the parser and renderer locally in your browser, so the online ZPL viewer does not need to send your label source or imported data to a rendering server.",
  },
  {
    question: "Is ZPLr also a visual ZPL label designer?",
    answer: "Yes. Supported fields can be selected, dragged, resized, aligned, reordered, locked, hidden, and edited through layers and property controls while the ZPL source stays synchronized.",
  },
  {
    question: "Can I use ZPLr from Node.js or a browser application?",
    answer: "Yes. Import zplr or zplr/node for Node.js, and zplr/web for browser projects. Both entries expose typed parsing and rendering APIs built from the same engine.",
  },
  {
    question: "Can the editor export ZPL labels as PNG files?",
    answer: "Yes. You can export the active label as PNG, generate PNGs for variable-data records, save the ZPL source, or download a workspace ZIP containing labels, datasets, and assets.",
  },
  {
    question: "Which ZPL commands are supported?",
    answer: "ZPLr recognizes more than 200 commands across rendering, state, storage, control, and compatibility categories. The public command-support document records which commands are supported, partial, or recognized without rendered output.",
  },
];

const nodeExample = `// "zplr/node" exposes the same Node.js API.
import { renderZplPNG } from "zplr";
import { writeFile } from "node:fs/promises";

const [png] = await renderZplPNG(source, {
  printDensity: 8,
});

await writeFile("label.png", png);`;

const browserExample = `import { renderZpl } from "zplr/web";

const job = await renderZpl(source);
const canvas = job.labels[0].canvas;

document.querySelector("main")?.append(canvas);`;

type SyntaxTokenKind =
  | "plain"
  | "comment"
  | "keyword"
  | "string"
  | "number"
  | "function"
  | "global"
  | "punctuation"
  | "operator";

interface SyntaxToken {
  kind: SyntaxTokenKind;
  value: string;
}

const javascriptKeywords = new Set([
  "async",
  "await",
  "const",
  "default",
  "export",
  "from",
  "import",
  "interface",
  "let",
  "new",
  "return",
  "type",
  "var",
]);
const javascriptFunctions = new Set([
  "append",
  "querySelector",
  "renderZpl",
  "renderZplPNG",
  "writeFile",
]);
const javascriptGlobals = new Set(["document"]);
const javascriptTokenPattern =
  /\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b\d+(?:\.\d+)?\b|\b[A-Za-z_$][\w$]*\b|===|!==|=>|\?\.|[{}[\]();,.?:=]|\s+|./g;

function highlightJavaScript(source: string): SyntaxToken[] {
  return [...source.matchAll(javascriptTokenPattern)].map(([value]) => {
    let kind: SyntaxTokenKind = "plain";
    if (value.startsWith("//") || value.startsWith("/*")) kind = "comment";
    else if (/^["'`]/.test(value)) kind = "string";
    else if (javascriptKeywords.has(value)) kind = "keyword";
    else if (javascriptFunctions.has(value)) kind = "function";
    else if (javascriptGlobals.has(value)) kind = "global";
    else if (/^\d/.test(value)) kind = "number";
    else if (/^[{}[\]();,.?:]$/.test(value)) kind = "punctuation";
    else if (/^(?:===|!==|=>|\?\.|=)$/.test(value)) kind = "operator";
    return { kind, value };
  });
}

const highlightedNodeExample = highlightJavaScript(nodeExample);
const highlightedBrowserExample = highlightJavaScript(browserExample);

type SnippetId = "node" | "browser";

const copiedSnippet = ref<SnippetId | null>(null);
let copyResetTimer: ReturnType<typeof setTimeout> | undefined;

async function copySnippet(id: SnippetId, source: string): Promise<void> {
  try {
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(source);
      } catch {
        copyWithTextArea(source);
      }
    } else {
      copyWithTextArea(source);
    }
    copiedSnippet.value = id;
    if (copyResetTimer) clearTimeout(copyResetTimer);
    copyResetTimer = setTimeout(() => {
      copiedSnippet.value = null;
    }, 2_000);
  } catch {
    copiedSnippet.value = null;
  }
}

function copyWithTextArea(source: string): void {
  const textarea = document.createElement("textarea");
  textarea.value = source;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();
  textarea.setSelectionRange(0, source.length);
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("Copy command was rejected");
}

onBeforeUnmount(() => {
  if (copyResetTimer) clearTimeout(copyResetTimer);
});

const structuredData = [
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "ZPLr",
    url: canonical,
    description,
  },
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "ZPLr",
    applicationCategory: "DeveloperApplication",
    applicationSubCategory: "ZPL label editor and renderer",
    operatingSystem: "Any",
    url: `${config.public.siteUrl}/editor`,
    softwareVersion: config.public.packageVersion,
    description,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    license: "https://opensource.org/license/mit",
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  },
];

useSeoMeta({
  title,
  description,
  robots: "index, follow",
  ogType: "website",
  ogSiteName: "ZPLr",
  ogTitle: title,
  ogDescription: description,
  ogUrl: canonical,
  ogImage: socialImage,
  ogImageWidth: 1200,
  ogImageHeight: 630,
  ogImageAlt: "ZPLr online ZPL editor with code and a rendered label",
  twitterCard: "summary_large_image",
  twitterTitle: title,
  twitterDescription: description,
  twitterImage: socialImage,
});

useHead({
  link: [
    {
      rel: "preload",
      as: "image",
      type: "image/png",
      href: screenshots.overview,
      media: "(prefers-color-scheme: light)",
    },
    {
      rel: "preload",
      as: "image",
      type: "image/png",
      href: screenshots.overviewDark,
      media: "(prefers-color-scheme: dark)",
    },
    { rel: "canonical", href: canonical },
    { rel: "icon", type: "image/svg+xml", href: logoUrl },
  ],
  script: structuredData.map((entry) => ({
    type: "application/ld+json",
    innerHTML: JSON.stringify(entry),
  })),
});
</script>

<style scoped>
.landing-grid {
  background-image:
    linear-gradient(rgb(24 24 27 / 0.045) 1px, transparent 1px),
    linear-gradient(90deg, rgb(24 24 27 / 0.045) 1px, transparent 1px);
  background-size: 56px 56px;
}

.landing-glow {
  background: radial-gradient(circle at 50% 0%, rgb(161 161 170 / 0.22), transparent 63%);
}

.landing-code-grid {
  background-image:
    linear-gradient(rgb(255 255 255 / 0.025) 1px, transparent 1px),
    linear-gradient(90deg, rgb(255 255 255 / 0.025) 1px, transparent 1px);
  background-size: 48px 48px;
}

.landing-eyebrow {
  color: rgb(82 82 91);
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.landing-section-title {
  margin-top: 0.75rem;
  font-size: clamp(2rem, 5vw, 2.75rem);
  font-weight: 900;
  letter-spacing: -0.035em;
  line-height: 1.1;
}

.landing-section-copy {
  margin-top: 1.25rem;
  color: rgb(82 82 91);
  font-size: 1rem;
  line-height: 1.85;
}

.landing-text-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: rgb(24 24 27);
  font-size: 0.875rem;
  font-weight: 800;
}

.landing-text-link:hover {
  gap: 0.7rem;
}

.landing-inline-code-dark {
  border: 1px solid rgb(255 255 255 / 0.15);
  border-radius: 0.3rem;
  background: rgb(255 255 255 / 0.08);
  padding: 0.1rem 0.3rem;
  color: white;
  font-size: 0.85em;
}

.snippet-copy-button {
  display: inline-flex;
  height: 1.75rem;
  align-items: center;
  gap: 0.35rem;
  border: 1px solid rgb(255 255 255 / 0.1);
  border-radius: 0.4rem;
  padding-inline: 0.5rem;
  color: rgb(161 161 170);
  font-size: 0.6875rem;
  font-weight: 700;
  transition:
    color 150ms ease,
    border-color 150ms ease,
    background-color 150ms ease;
}

.snippet-copy-button:hover {
  border-color: rgb(255 255 255 / 0.2);
  background: rgb(255 255 255 / 0.06);
  color: white;
}

.snippet-copy-button:focus-visible {
  outline: 2px solid white;
  outline-offset: 2px;
}

.syntax-comment {
  color: rgb(161 161 170);
  font-style: italic;
}

.syntax-keyword {
  color: rgb(196 181 253);
}

.syntax-string {
  color: rgb(134 239 172);
}

.syntax-number {
  color: rgb(252 165 165);
}

.syntax-function {
  color: rgb(125 211 252);
}

.syntax-global {
  color: rgb(253 224 71);
}

.syntax-punctuation,
.syntax-operator {
  color: rgb(161 161 170);
}

@media (prefers-color-scheme: dark) {
  .landing-grid {
    background-image:
      linear-gradient(rgb(255 255 255 / 0.035) 1px, transparent 1px),
      linear-gradient(90deg, rgb(255 255 255 / 0.035) 1px, transparent 1px);
  }

  .landing-glow {
    background: radial-gradient(circle at 50% 0%, rgb(255 255 255 / 0.1), transparent 63%);
  }

  .landing-text-link {
    color: white;
  }

  .landing-eyebrow,
  .landing-section-copy {
    color: rgb(161 161 170);
  }
}
</style>
