<template>
  <div class="landing min-h-screen overflow-hidden text-zinc-950 dark:text-white">
    <a
      href="#main-content"
      class="sr-only z-50 rounded-md bg-white px-4 py-2 text-zinc-950 shadow-lg focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
    >
      Skip to content
    </a>

    <SiteHeader />

    <main id="main-content">
      <section class="landing-hero relative isolate">
        <div class="landing-hero-grid mx-auto grid max-w-[90rem] items-center gap-14 px-5 py-16 sm:px-7 sm:py-20 lg:grid-cols-[0.95fr_1.05fr] lg:gap-12 lg:px-10">
          <div class="relative z-10">
            <div class="landing-kicker inline-flex items-center gap-3 font-mono text-[11px] font-bold tracking-[0.11em] uppercase">
              <span class="landing-kicker-command">^XA</span>
              Free · open source · local-only
            </div>
            <h1 class="landing-hero-title mt-7 text-balance text-5xl font-black tracking-[-0.065em] sm:text-6xl lg:text-7xl xl:text-[5.35rem]">
              Free Online <span>ZPL Viewer</span> &amp; Editor
            </h1>
            <p class="landing-hero-copy mt-7 max-w-2xl text-pretty text-lg/8 sm:text-xl/9">
              Paste or type Zebra Programming Language and preview the label instantly. The viewer renders in your browser, so your ZPL is never uploaded to a remote service.
            </p>
            <div class="landing-hero-actions mt-9 flex flex-col items-stretch gap-3 sm:flex-row">
              <NuxtLink
                to="/editor"
                aria-label="Open the full ZPL editor"
                class="landing-primary-cta inline-flex h-12 items-center justify-center px-5 text-sm font-black sm:w-auto"
              >
                <IconVectorSquareEdit class="mr-2 size-5" aria-hidden="true" />
                Open the full ZPL editor
              </NuxtLink>
              <NuxtLink
                to="/zpl-commands"
                class="landing-secondary-cta inline-flex h-12 items-center justify-center px-5 text-sm font-black sm:w-auto"
              >
                <IconCodeTags class="mr-2 size-5" aria-hidden="true" />
                Browse ZPL commands
              </NuxtLink>
            </div>
            <div class="landing-proof mt-8 flex flex-wrap gap-x-6 gap-y-3 font-mono text-[11px] font-bold tracking-[0.05em] uppercase">
              <span><i aria-hidden="true"></i>No sign-up</span>
              <span><i aria-hidden="true"></i>No label uploads</span>
              <span><i aria-hidden="true"></i>MIT licensed</span>
            </div>
          </div>

          <div class="landing-hero-visual relative mx-auto w-full max-w-4xl lg:mx-0">
            <span class="landing-figure-index font-mono text-[10px] font-bold tracking-[0.15em] uppercase">01 / Interactive viewer</span>
            <ZplQuickViewer />
          </div>
        </div>

        <dl class="landing-spec-strip mx-auto grid max-w-[90rem] grid-cols-1 sm:grid-cols-3">
          <div>
            <dt>Language coverage</dt>
            <dd>200+ commands recognized</dd>
          </div>
          <div>
            <dt>Runtime</dt>
            <dd>Node.js + browser</dd>
          </div>
          <div>
            <dt>Processing</dt>
            <dd>100% local</dd>
          </div>
        </dl>
      </section>

      <section id="view-zpl" aria-labelledby="viewer-guide-title" class="landing-modes scroll-mt-24">
        <div class="mx-auto max-w-[90rem] px-5 py-14 sm:px-7 lg:px-10">
          <h2 id="viewer-guide-title" class="landing-section-title">How to view a ZPL file online</h2>
          <ol class="mt-7 grid list-decimal gap-6 pl-5 text-sm/7 md:grid-cols-3 md:gap-10">
            <li><strong>Open your label.</strong> Choose Open ZPL file in the viewer, or paste code from a .zpl or .txt file. A complete label starts with <NuxtLink to="/zpl-commands/caret-xa" class="underline">^XA</NuxtLink> and ends with <NuxtLink to="/zpl-commands/caret-xz" class="underline">^XZ</NuxtLink>.</li>
            <li><strong>Check the preview.</strong> Change text, barcodes, or coordinates and the first label updates locally. The quick viewer uses 8 dots/mm (203 dpi). Set other print densities and inspect multiple labels in the full editor.</li>
            <li><strong>Keep your result.</strong> Download the preview as PNG, or continue editing the same label in the <NuxtLink to="/editor" class="underline">ZPL editor and visual designer</NuxtLink>.</li>
          </ol>
          <div class="mt-9 grid gap-6 border-t border-zinc-300 pt-7 text-sm/7 md:grid-cols-2 dark:border-white/15">
            <div>
              <h3 class="font-bold">Label blank, too small, or cut off?</h3>
              <p class="mt-2">Check <NuxtLink to="/zpl-commands/caret-pw" class="underline">^PW label width</NuxtLink>, <NuxtLink to="/zpl-commands/caret-ll" class="underline">^LL label length</NuxtLink>, and <NuxtLink to="/zpl-commands/caret-fo" class="underline">^FO field positions</NuxtLink>. Dimensions are in printer dots. In the editor, match the print density to your printer and review any diagnostics.</p>
            </div>
            <div>
              <h3 class="font-bold">Preview support and printer differences</h3>
              <p class="mt-2">ZPLr renders supported text, graphics, and barcodes such as <NuxtLink to="/zpl-commands/caret-bc" class="underline">^BC Code 128</NuxtLink> and <NuxtLink to="/zpl-commands/caret-bq" class="underline">^BQ QR codes</NuxtLink>. Some commands are partial or control printer hardware without drawing pixels. Read the <NuxtLink to="/zpl-commands" class="underline">command support notes</NuxtLink> and verify the output on your target printer.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="features" class="landing-modes scroll-mt-24">
        <div class="mx-auto max-w-[90rem] px-5 py-20 sm:px-7 sm:py-28 lg:px-10">
          <div class="landing-section-heading grid gap-6 lg:grid-cols-[0.7fr_1.3fr] lg:items-end">
            <div>
              <p class="landing-eyebrow">Editor, viewer, and designer</p>
              <p class="mt-3 font-mono text-xs font-bold tracking-[0.14em] text-zinc-500 uppercase">One source / three surfaces</p>
            </div>
            <div>
              <h2 class="landing-section-title">Three ways to work with one ZPL label</h2>
              <p class="landing-section-copy max-w-3xl">
                Start in source code, inspect the rendered result, or select fields directly on the label. Every view stays synchronized, so you can move quickly without losing the underlying ZPL.
              </p>
            </div>
          </div>
          <div class="landing-mode-grid mt-14 grid md:grid-cols-3">
            <article v-for="(feature, index) in primaryFeatures" :key="feature.title" class="landing-mode-card">
              <div class="flex items-start justify-between gap-4">
                <span class="landing-mode-number font-mono">0{{ index + 1 }}</span>
                <component :is="feature.icon" class="size-6" aria-hidden="true" />
              </div>
              <h3 class="mt-10 text-2xl font-black tracking-tight">{{ feature.title }}</h3>
              <p class="mt-3 text-sm/7">{{ feature.description }}</p>
              <ul class="mt-7 space-y-2.5 text-sm font-semibold">
                <li v-for="item in feature.items" :key="item" class="flex gap-2.5">
                  <span class="mt-2 block h-px w-3 shrink-0 bg-current" aria-hidden="true"></span>
                  <span>{{ item }}</span>
                </li>
              </ul>
            </article>
          </div>
        </div>
      </section>

      <section class="landing-showcase landing-showcase-preview">
        <div class="mx-auto grid max-w-[90rem] items-center gap-14 px-5 py-20 sm:px-7 sm:py-28 lg:grid-cols-[0.78fr_1.22fr] lg:gap-20 lg:px-10">
          <div class="landing-showcase-copy">
            <p class="landing-feature-index">01 / Live ZPL preview</p>
            <h2 class="landing-section-title">Write code. See the label—not a guess.</h2>
            <p class="landing-section-copy">
              The online ZPL viewer renders a deterministic one-bit raster locally as you type. Source-linked diagnostics, command documentation, formatting, and safety limits help you find problems before a label reaches a print workflow.
            </p>
            <ul class="landing-check-list mt-8 grid gap-4 text-sm/6 sm:grid-cols-2 lg:grid-cols-1">
              <li v-for="item in previewFeatures" :key="item" class="flex gap-3">
                <IconCheckCircleOutline class="mt-0.5 size-5 shrink-0" aria-hidden="true" />
                <span>{{ item }}</span>
              </li>
            </ul>
            <NuxtLink to="/editor" class="landing-text-link mt-8">
              Preview ZPL online
              <IconArrowRight class="size-4" aria-hidden="true" />
            </NuxtLink>
          </div>
          <figure class="landing-feature-shot landing-feature-shot-preview">
            <div class="landing-shot-label landing-shot-label-top" aria-hidden="true">Output / 600 × 800 dots</div>
            <div class="landing-feature-viewport">
              <picture class="block">
                <source media="(prefers-color-scheme: dark)" :srcset="screenshots.previewDark" />
                <img
                  :src="screenshots.preview"
                  width="1384"
                  height="1376"
                  loading="lazy"
                  alt="Rendered shipping label in the live ZPL preview canvas"
                  class="landing-feature-image"
                />
              </picture>
            </div>
            <figcaption class="landing-shot-caption">
              <span>Deterministic raster</span>
              <span>203 dpi</span>
              <span>No remote API</span>
            </figcaption>
          </figure>
        </div>
      </section>

      <section id="designer" class="landing-showcase landing-showcase-designer scroll-mt-24">
        <div class="mx-auto grid max-w-[90rem] items-center gap-14 px-5 py-20 sm:px-7 sm:py-28 lg:grid-cols-[1.2fr_0.8fr] lg:gap-20 lg:px-10">
          <figure class="landing-feature-shot landing-feature-shot-designer order-2 lg:order-1">
            <div class="landing-shot-label landing-shot-label-side" aria-hidden="true">Selected field / ^FO</div>
            <div class="landing-feature-viewport">
              <picture class="block">
                <source media="(prefers-color-scheme: dark)" :srcset="screenshots.designerDark" />
                <img
                  :src="screenshots.designer"
                  width="1384"
                  height="1640"
                  loading="lazy"
                  alt="Visual ZPL label designer with a drag-and-drop canvas, layers, guides, and field properties"
                  class="landing-feature-image"
                />
              </picture>
            </div>
            <figcaption class="landing-shot-caption">
              <span>Canvas</span>
              <span>Properties</span>
              <span>Source synchronized</span>
            </figcaption>
          </figure>
          <div class="landing-showcase-copy order-1 lg:order-2">
            <p class="landing-feature-index">02 / Visual ZPL designer</p>
            <h2 class="landing-section-title">Design on the label while keeping real ZPL underneath</h2>
            <p class="landing-section-copy">
              Drag, resize, align, distribute, lock, hide, and reorder supported fields on a WYSIWYG canvas. Rulers, snapping, manual guides, layers, and property controls make precise label layout faster.
            </p>
            <div class="landing-feature-tags mt-8 grid grid-cols-2">
              <div v-for="item in designerFeatures" :key="item" class="px-3 py-3 text-sm font-bold">
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

      <section class="landing-showcase landing-showcase-data">
        <div class="mx-auto grid max-w-[90rem] items-center gap-14 px-5 py-20 sm:px-7 sm:py-28 lg:grid-cols-[0.75fr_1.25fr] lg:gap-20 lg:px-10">
          <div class="landing-showcase-copy">
            <p class="landing-feature-index">03 / Variable data and assets</p>
            <h2 class="landing-section-title">One design, every record</h2>
            <p class="landing-section-copy">
              Import CSV or JSON, bind columns to <code class="landing-inline-code-dark">^FN</code> fields, preview each record, and turn ZPL into PNG batches. Images and fonts are managed in the same local workspace.
            </p>
            <div class="landing-data-grid mt-9 grid gap-px sm:grid-cols-2">
              <div v-for="feature in dataFeatures" :key="feature.title" class="p-4">
                <component :is="feature.icon" class="size-5" aria-hidden="true" />
                <h3 class="mt-3 text-sm font-bold">{{ feature.title }}</h3>
                <p class="mt-1.5 text-sm/6">{{ feature.description }}</p>
              </div>
            </div>
          </div>
          <figure class="landing-feature-shot landing-feature-shot-data">
            <div class="landing-shot-label landing-shot-label-top" aria-hidden="true">Batch / 2 records / 2 columns</div>
            <div class="landing-feature-viewport">
              <picture class="block">
                <source media="(prefers-color-scheme: dark)" :srcset="screenshots.variableDataDark" />
                <img
                  :src="screenshots.variableData"
                  width="2432"
                  height="720"
                  loading="lazy"
                  alt="ZPL variable data manager previewing records imported from CSV or JSON for batch label export"
                  class="landing-feature-image"
                />
              </picture>
            </div>
            <figcaption class="landing-shot-caption">
              <span>CSV + JSON</span>
              <span>Live record preview</span>
              <span>Batch PNGs</span>
            </figcaption>
          </figure>
        </div>
      </section>

      <section class="landing-privacy">
        <div class="mx-auto grid max-w-[90rem] gap-12 px-5 py-20 sm:px-7 sm:py-24 lg:grid-cols-[0.7fr_1.3fr] lg:items-center lg:px-10">
          <div class="landing-zero" aria-hidden="true">
            <span>0</span>
            <small>upload endpoints</small>
          </div>
          <div>
            <p class="landing-feature-index flex items-center gap-2"><IconCloudOffOutline class="size-4" aria-hidden="true" /> Private by architecture</p>
            <h2 class="landing-section-title max-w-3xl">Your ZPL never needs to leave the browser</h2>
            <p class="landing-section-copy max-w-3xl" data-testid="local-only-notice">
              ZPLr parses, renders, and edits labels on your device. Your ZPL and imported data never leave this browser for processing. There is no account, upload API, or server-side label processing.
            </p>
            <div class="landing-privacy-grid mt-10 grid text-left sm:grid-cols-3">
              <div v-for="item in privacyPoints" :key="item.title">
                <h3 class="text-sm font-black">{{ item.title }}</h3>
                <p class="mt-2 text-xs/5">{{ item.description }}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="library" class="landing-library landing-code-grid scroll-mt-24 bg-zinc-950 py-20 text-white sm:py-28">
        <div class="mx-auto max-w-[90rem] px-5 sm:px-7 lg:px-10">
          <div class="grid gap-12 lg:grid-cols-[0.82fr_1.18fr] lg:gap-16">
            <div>
              <p class="landing-feature-index">04 / JavaScript and TypeScript ZPL library</p>
              <h2 class="landing-section-title">One ZPL engine, two runtimes</h2>
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
                  class="landing-library-primary inline-flex h-10 items-center px-4 text-sm font-black"
                >
                  npm install zplr
                  <IconOpenInNew class="ml-2 size-4" aria-hidden="true" />
                </a>
                <a
                  href="https://github.com/le2ni/zplr/blob/main/USAGE.md"
                  target="_blank"
                  rel="noreferrer"
                  class="landing-library-secondary inline-flex h-10 items-center px-4 text-sm font-black"
                >
                  Read usage guide
                </a>
              </div>
            </div>

            <div class="space-y-4">
              <article class="landing-code-panel overflow-hidden">
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
              <article class="landing-code-panel overflow-hidden">
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

          <div class="landing-library-links mt-14 grid border-t border-white/10 pt-8 sm:grid-cols-3">
            <a
              v-for="link in libraryLinks"
              :key="link.title"
              :href="link.href"
              target="_blank"
              rel="noreferrer"
              class="landing-library-link group flex items-center justify-between px-4 py-4"
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

      <section class="landing-use-cases">
        <div class="mx-auto max-w-[90rem] px-5 py-20 sm:px-7 sm:py-28 lg:px-10">
          <div class="max-w-3xl">
            <p class="landing-eyebrow">Built for real label work</p>
            <h2 class="landing-section-title">From a first preview to an automated label pipeline</h2>
          </div>
          <div class="landing-use-grid mt-12 grid sm:grid-cols-2 lg:grid-cols-4">
            <article v-for="useCase in useCases" :key="useCase.title" class="landing-use-card">
              <span class="landing-use-number font-mono">{{ useCase.number }}</span>
              <h3 class="mt-12 text-lg font-black">{{ useCase.title }}</h3>
              <p class="mt-3 text-sm/6">{{ useCase.description }}</p>
            </article>
          </div>
        </div>
      </section>

      <section id="faq" class="landing-faq scroll-mt-24">
        <div class="mx-auto grid max-w-[90rem] gap-12 px-5 py-20 sm:px-7 sm:py-28 lg:grid-cols-[0.68fr_1.32fr] lg:gap-20 lg:px-10">
          <div>
            <p class="landing-eyebrow">Frequently asked questions</p>
            <h2 class="landing-section-title">About the ZPL editor and library</h2>
            <p class="landing-section-copy">
              Need implementation details? The project documentation covers command support, diagnostics, limits, and runtime APIs.
            </p>
          </div>
          <div class="landing-faq-list">
            <details v-for="(faq, index) in faqs" :key="faq.question" class="group" :open="index === 0">
              <summary class="flex cursor-pointer list-none items-start justify-between gap-5 text-left font-bold">
                <span>{{ faq.question }}</span>
                <span class="landing-faq-plus leading-none transition group-open:rotate-45" aria-hidden="true">+</span>
              </summary>
              <p class="max-w-3xl pt-3 text-sm/7">{{ faq.answer }}</p>
            </details>
          </div>
        </div>
      </section>

      <section class="landing-final-cta">
        <div class="mx-auto grid max-w-[90rem] gap-10 px-5 py-16 sm:px-7 sm:py-20 lg:grid-cols-[0.62fr_1.38fr] lg:items-center lg:px-10">
          <div class="landing-end-mark" aria-hidden="true">
            <span>^XZ</span>
            <small>End format</small>
          </div>
          <div>
            <p class="landing-feature-index">Ready when you are</p>
            <h2 class="landing-section-title max-w-3xl">Your next ZPL label can start here</h2>
            <p class="landing-section-copy max-w-2xl">
              Open the editor with a working shipping-label example, then change the code, move fields visually, or connect variable data.
            </p>
            <NuxtLink
              to="/editor"
              class="landing-primary-cta mt-8 inline-flex h-12 items-center px-5 text-sm font-black"
            >
              Open the free ZPL editor
              <IconArrowRight class="ml-2 size-5" aria-hidden="true" />
            </NuxtLink>
          </div>
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
            <NuxtLink to="/zpl-commands" class="hover:text-white">ZPL commands</NuxtLink>
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
  IconImageOutline,
  IconOpenInNew,
  IconPackageVariantClosed,
  IconVectorSquareEdit,
} from "@iconify-prerendered/vue-mdi";
import logoUrl from "../../web/assets/logo.svg";

const config = useRuntimeConfig();
const canonical = `${config.public.siteUrl}/`;
const title = "Free Online ZPL Viewer & Editor | ZPLr";
const description = "Paste ZPL code and preview Zebra labels instantly in your browser. Edit, validate, and export PNGs locally—free with no upload or sign-up.";
const socialImage = `${config.public.siteUrl}/screenshots/zpl-editor-social.png`;
const screenshots = {
  quickPreview: "/screenshots/zpl-label-preview.png",
  preview: "/screenshots/zpl-live-preview.png",
  previewDark: "/screenshots/zpl-live-preview-dark.png",
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
    question: "What is a ZPL viewer?",
    answer: "A ZPL viewer turns Zebra Programming Language source into a visual label preview. ZPLr lets you paste and view ZPL online while running the parser and renderer locally in your browser, without uploading your label or data to a rendering server.",
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
    applicationSubCategory: "ZPL viewer, label editor, and renderer",
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
  ogImageAlt: "ZPLr online ZPL viewer with code and a rendered label preview",
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
      href: screenshots.quickPreview,
    },
    { rel: "canonical", href: canonical },
  ],
  script: structuredData.map((entry) => ({
    type: "application/ld+json",
    innerHTML: JSON.stringify(entry),
  })),
});
</script>

<style scoped>
.landing {
  --landing-ink: rgb(20 20 20);
  --landing-paper: rgb(242 240 233);
  --landing-sheet: rgb(255 254 249);
  --landing-stock: rgb(226 223 214);
  --landing-shadow: rgb(204 200 190);
  --landing-muted: rgb(82 80 75);
  --landing-rule: rgb(20 20 20 / 0.24);
  --landing-accent: rgb(158 55 44);
  background: var(--landing-paper);
  font-family:
    "Noto Sans Variable", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
    "Segoe UI", sans-serif;
}

.landing-hero {
  border-bottom: 2px solid var(--landing-ink);
  background-color: var(--landing-paper);
  background-image:
    linear-gradient(90deg, transparent 50%, rgb(20 20 20 / 0.045) 50%, rgb(20 20 20 / 0.045) calc(50% + 1px), transparent calc(50% + 1px)),
    repeating-linear-gradient(0deg, transparent 0 31px, rgb(20 20 20 / 0.018) 31px 32px);
}

.landing-hero-grid {
  position: relative;
}

.landing-hero-grid::before {
  position: absolute;
  top: 1.5rem;
  left: 2.5rem;
  color: rgb(20 20 20 / 0.38);
  content: "FORM 001  /  ZPLR";
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.55rem;
  font-weight: 800;
  letter-spacing: 0.16em;
}

.landing-kicker {
  color: var(--landing-muted);
}

.landing-kicker-command {
  display: inline-flex;
  min-width: 2.65rem;
  height: 1.8rem;
  align-items: center;
  justify-content: center;
  background: var(--landing-ink);
  color: white;
}

.landing-hero-title {
  max-width: 12ch;
  color: var(--landing-ink);
  line-height: 0.94;
}

.landing-hero-title span {
  text-decoration: underline;
  text-decoration-color: var(--landing-accent);
  text-decoration-thickness: 0.09em;
  text-underline-offset: 0.08em;
}

.landing-hero-copy {
  color: var(--landing-muted);
}

.landing-primary-cta,
.landing-secondary-cta {
  border: 2px solid var(--landing-ink);
  transition:
    box-shadow 160ms ease,
    transform 160ms ease,
    background-color 160ms ease;
}

.landing-primary-cta {
  background: var(--landing-ink);
  box-shadow: 4px 4px 0 var(--landing-shadow);
  color: white;
}

.landing-secondary-cta {
  background: transparent;
  color: var(--landing-ink);
}

.landing-primary-cta:hover,
.landing-secondary-cta:hover {
  transform: translateY(-1px);
}

.landing-primary-cta:hover {
  box-shadow: 5px 5px 0 var(--landing-shadow);
}

.landing-secondary-cta:hover {
  background: var(--landing-sheet);
  box-shadow: 3px 3px 0 var(--landing-shadow);
}

.landing-primary-cta:focus-visible,
.landing-secondary-cta:focus-visible {
  outline: 3px solid var(--landing-accent);
  outline-offset: 3px;
}

.landing-proof {
  color: var(--landing-muted);
}

.landing-proof span {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
}

.landing-proof i {
  width: 0.45rem;
  height: 0.45rem;
  background: var(--landing-accent);
}

.landing-figure-index {
  position: absolute;
  top: -1.75rem;
  right: 1.25rem;
  color: var(--landing-muted);
}

.landing-hero-shot {
  position: relative;
  z-index: 2;
  overflow: hidden;
  border: 2px solid var(--landing-ink);
  background: var(--landing-sheet);
  box-shadow: 9px 9px 0 var(--landing-shadow);
  transition:
    box-shadow 220ms ease,
    transform 220ms ease;
}

.landing-hero-shot:hover {
  box-shadow: 11px 11px 0 var(--landing-shadow);
  transform: translateY(-2px);
}

.landing-shot-bar {
  border-bottom: 2px solid var(--landing-ink);
  background: var(--landing-ink);
  color: white;
}

.landing-hero-image {
  background: rgb(244 244 245);
}

.landing-spec-strip {
  border-top: 2px solid var(--landing-ink);
  border-right: 2px solid var(--landing-ink);
  border-left: 2px solid var(--landing-ink);
  background: var(--landing-sheet);
  color: var(--landing-ink);
}

.landing-spec-strip > div {
  padding: 1.15rem 1.4rem 1.25rem;
}

.landing-spec-strip > div + div {
  border-top: 2px solid var(--landing-ink);
}

.landing-spec-strip dt {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.landing-spec-strip dd {
  margin-top: 0.35rem;
  font-size: 1.05rem;
  font-weight: 900;
}

.landing-modes {
  border-bottom: 2px solid var(--landing-ink);
  background: var(--landing-sheet);
}

.landing-section-heading {
  padding-bottom: 1.25rem;
  border-bottom: 1px solid var(--landing-rule);
}

.landing-mode-grid {
  border: 2px solid var(--landing-ink);
}

.landing-mode-card {
  min-height: 25rem;
  padding: 1.6rem;
  background: var(--landing-paper);
  color: var(--landing-ink);
}

.landing-mode-card + .landing-mode-card {
  border-top: 2px solid var(--landing-ink);
}

.landing-mode-card:nth-child(2) {
  background: var(--landing-sheet);
  color: var(--landing-ink);
}

.landing-mode-card:nth-child(3) {
  background: var(--landing-stock);
  color: var(--landing-ink);
}

.landing-mode-number {
  font-size: 2.75rem;
  font-weight: 900;
  letter-spacing: -0.08em;
  line-height: 1;
}

.landing-mode-card p {
  color: currentColor;
  opacity: 0.72;
}

.landing-showcase {
  border-bottom: 2px solid var(--landing-ink);
}

.landing-showcase-preview {
  background:
    linear-gradient(90deg, transparent 0 49.9%, rgb(20 20 20 / 0.035) 50%, transparent 50.1%),
    var(--landing-paper);
}

.landing-showcase-designer {
  background:
    repeating-linear-gradient(0deg, transparent 0 47px, rgb(20 20 20 / 0.025) 47px 48px),
    var(--landing-sheet);
  color: var(--landing-ink);
}

.landing-showcase-designer .landing-section-copy {
  color: var(--landing-muted);
}

.landing-showcase-designer .landing-text-link {
  color: var(--landing-ink);
}

.landing-showcase-data {
  border-color: var(--landing-ink);
  background-color: var(--landing-stock);
  background-image:
    linear-gradient(rgb(20 20 20 / 0.025) 1px, transparent 1px),
    linear-gradient(90deg, rgb(20 20 20 / 0.025) 1px, transparent 1px);
  background-size: 48px 48px;
  color: var(--landing-ink);
}

.landing-showcase-data .landing-section-copy {
  color: var(--landing-muted);
}

.landing-feature-index {
  margin-bottom: 0.8rem;
  color: var(--landing-muted);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.69rem;
  font-weight: 900;
  letter-spacing: 0.13em;
  text-transform: uppercase;
}

.landing-showcase-designer .landing-feature-index {
  color: var(--landing-muted);
}

.landing-showcase-data .landing-feature-index {
  color: var(--landing-accent);
}

.landing-check-list {
  color: var(--landing-muted);
}

.landing-check-list svg {
  color: var(--landing-accent);
}

.landing-feature-shot {
  position: relative;
  padding: 0.7rem;
  border: 2px solid var(--landing-ink);
  background: var(--landing-sheet);
  box-shadow: 8px 8px 0 var(--landing-shadow);
}

.landing-feature-viewport {
  position: relative;
  overflow: hidden;
  background: rgb(244 244 245);
}

.landing-feature-viewport picture {
  position: absolute;
  inset: 0;
}

.landing-feature-image {
  display: block;
  width: 100%;
  height: auto;
}

.landing-feature-shot-preview .landing-feature-viewport {
  aspect-ratio: 692 / 688;
}

.landing-feature-shot-designer {
  box-shadow: 8px 8px 0 var(--landing-shadow);
}

.landing-feature-shot-designer .landing-feature-viewport {
  aspect-ratio: 692 / 820;
}

.landing-feature-shot-data {
  border-color: var(--landing-ink);
  box-shadow: 8px 8px 0 var(--landing-shadow);
}

.landing-feature-shot-data .landing-feature-viewport {
  aspect-ratio: 1216 / 360;
}

.landing-shot-label {
  position: absolute;
  z-index: 3;
  border: 2px solid var(--landing-ink);
  background: var(--landing-sheet);
  color: var(--landing-ink);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.62rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.landing-shot-label-top {
  top: -1.25rem;
  left: 1.3rem;
  padding: 0.45rem 0.7rem;
}

.landing-shot-label-side {
  top: 1.2rem;
  left: -2rem;
  padding: 0.45rem 0.7rem;
  transform: rotate(-90deg) translateX(-100%);
  transform-origin: left top;
}

.landing-feature-shot-data .landing-shot-label {
  color: var(--landing-accent);
}

.landing-shot-caption {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0.5rem 1rem;
  padding: 0.75rem 0.15rem 0.1rem;
  color: var(--landing-ink);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.59rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.landing-shot-caption span::before {
  margin-right: 0.45rem;
  color: var(--landing-accent);
  content: "↳";
}

.landing-feature-shot-data .landing-shot-caption span::before {
  color: var(--landing-accent);
}

.landing-feature-tags {
  border-top: 1px solid rgb(20 20 20 / 0.28);
  border-left: 1px solid rgb(20 20 20 / 0.28);
}

.landing-feature-tags > div {
  border-right: 1px solid rgb(20 20 20 / 0.28);
  border-bottom: 1px solid rgb(20 20 20 / 0.28);
}

.landing-data-grid {
  border: 1px solid var(--landing-rule);
  background: var(--landing-rule);
}

.landing-data-grid > div {
  background: var(--landing-sheet);
}

.landing-data-grid p {
  color: var(--landing-muted);
}

.landing-privacy {
  border-bottom: 2px solid var(--landing-ink);
  background:
    repeating-linear-gradient(-45deg, transparent 0 12px, rgb(20 20 20 / 0.025) 12px 13px),
    var(--landing-sheet);
}

.landing-zero {
  position: relative;
  display: flex;
  min-height: 18rem;
  align-items: center;
  justify-content: center;
  border: 2px dashed var(--landing-ink);
  background: var(--landing-paper);
  color: var(--landing-ink);
}

.landing-zero span {
  font-size: clamp(9rem, 20vw, 17rem);
  font-weight: 950;
  letter-spacing: -0.12em;
  line-height: 0.75;
}

.landing-zero small {
  position: absolute;
  right: 1rem;
  bottom: 1rem;
  padding: 0.35rem 0.55rem;
  background: var(--landing-ink);
  color: white;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.6rem;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.landing-privacy-grid {
  border-top: 2px solid var(--landing-ink);
  border-left: 2px solid var(--landing-ink);
}

.landing-privacy-grid > div {
  padding: 1rem;
  border-right: 2px solid var(--landing-ink);
  border-bottom: 2px solid var(--landing-ink);
}

.landing-privacy-grid p {
  color: var(--landing-muted);
}

.landing-library {
  border-bottom: 2px solid rgb(255 255 255 / 0.18);
}

.landing-library .landing-feature-index {
  color: rgb(212 212 216);
}

.landing-library .landing-section-title {
  color: white;
}

.landing-library-primary,
.landing-library-secondary {
  border: 2px solid white;
  transition:
    background-color 150ms ease,
    color 150ms ease,
    transform 150ms ease,
    box-shadow 150ms ease;
}

.landing-library-primary {
  background: white;
  box-shadow: none;
  color: rgb(20 20 20);
}

.landing-library-secondary {
  color: white;
}

.landing-library-primary:hover,
.landing-library-secondary:hover {
  transform: translate(-2px, -2px);
}

.landing-library-primary:hover {
  background: rgb(228 228 231);
}

.landing-library-secondary:hover {
  background: white;
  color: rgb(20 20 20);
}

.landing-code-panel {
  border: 2px solid rgb(255 255 255 / 0.16);
  background: rgb(0 0 0 / 0.38);
}

.landing-code-panel:first-child {
  border-color: rgb(255 255 255 / 0.28);
}

.landing-library-links {
  gap: 1px;
  background: rgb(255 255 255 / 0.14);
}

.landing-library-link {
  background: rgb(24 24 27);
  transition: background-color 150ms ease;
}

.landing-library-link:hover {
  background: rgb(255 255 255 / 0.08);
}

.landing-use-cases {
  border-bottom: 2px solid var(--landing-ink);
  background: var(--landing-paper);
}

.landing-use-grid {
  gap: 2px;
  border: 2px solid var(--landing-ink);
  background: var(--landing-ink);
}

.landing-use-card {
  position: relative;
  min-height: 18rem;
  padding: 1.25rem;
  background: var(--landing-sheet);
  color: var(--landing-ink);
}

.landing-use-card:nth-child(2) {
  background: var(--landing-stock);
  color: var(--landing-ink);
}

.landing-use-card:nth-child(3) {
  background: var(--landing-paper);
  color: var(--landing-ink);
}

.landing-use-card:nth-child(4) {
  background: var(--landing-stock);
  color: var(--landing-ink);
}

.landing-use-number {
  display: inline-flex;
  width: 3.25rem;
  height: 2rem;
  align-items: center;
  justify-content: center;
  border: 2px solid currentColor;
  font-size: 0.7rem;
  font-weight: 900;
  letter-spacing: 0.1em;
}

.landing-use-card p {
  color: currentColor;
  opacity: 0.68;
}

.landing-faq {
  border-bottom: 2px solid var(--landing-ink);
  background: var(--landing-sheet);
}

.landing-faq-list {
  border: 2px solid var(--landing-ink);
}

.landing-faq-list details {
  padding: 1.15rem 1.25rem;
}

.landing-faq-list details + details {
  border-top: 2px solid var(--landing-ink);
}

.landing-faq-list details[open] {
  background: var(--landing-paper);
}

.landing-faq-list summary {
  font-weight: 850;
}

.landing-faq-list p {
  color: var(--landing-muted);
}

.landing-faq-plus {
  display: inline-flex;
  width: 1.75rem;
  height: 1.75rem;
  flex: none;
  align-items: center;
  justify-content: center;
  background: var(--landing-ink);
  color: var(--landing-sheet);
  font-size: 1.2rem;
}

.landing-final-cta {
  border-bottom: 2px solid var(--landing-ink);
  background:
    repeating-linear-gradient(90deg, transparent 0 39px, rgb(20 20 20 / 0.025) 39px 40px),
    var(--landing-stock);
  color: var(--landing-ink);
}

.landing-final-cta .landing-feature-index,
.landing-final-cta .landing-section-copy {
  color: var(--landing-muted);
}

.landing-final-cta .landing-primary-cta {
  border-color: var(--landing-ink);
  background: var(--landing-ink);
  color: var(--landing-sheet);
}

.landing-end-mark {
  position: relative;
  display: flex;
  min-height: 15rem;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--landing-ink);
  background:
    repeating-linear-gradient(
      90deg,
      transparent 0 8px,
      rgb(20 20 20 / 0.035) 8px 9px
    ),
    var(--landing-sheet);
  box-shadow: 7px 7px 0 var(--landing-shadow);
  color: var(--landing-ink);
}

.landing-end-mark::before {
  position: absolute;
  inset: 0.75rem;
  border: 1px dashed var(--landing-ink);
  content: "";
}

.landing-end-mark span {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: clamp(4rem, 9vw, 7rem);
  font-weight: 900;
  letter-spacing: -0.1em;
  line-height: 1;
}

.landing-end-mark small {
  margin-top: 0.75rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.62rem;
  font-weight: 900;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.landing-code-grid {
  background-image:
    linear-gradient(rgb(255 255 255 / 0.025) 1px, transparent 1px),
    linear-gradient(90deg, rgb(255 255 255 / 0.025) 1px, transparent 1px);
  background-size: 48px 48px;
}

.landing-eyebrow {
  color: var(--landing-muted);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.75rem;
  font-weight: 900;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.landing-section-title {
  font-size: clamp(2.15rem, 5vw, 3.25rem);
  font-weight: 900;
  letter-spacing: -0.055em;
  line-height: 1.02;
}

.landing-section-copy {
  margin-top: 1.25rem;
  color: var(--landing-muted);
  font-size: 1rem;
  line-height: 1.85;
}

.landing-text-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding-bottom: 0.18rem;
  border-bottom: 2px solid currentColor;
  color: var(--landing-ink);
  font-size: 0.875rem;
  font-weight: 900;
  transition: gap 150ms ease;
}

.landing-text-link:hover {
  gap: 0.7rem;
}

.landing-inline-code-dark {
  border: 1px solid var(--landing-ink);
  background: var(--landing-sheet);
  padding: 0.1rem 0.3rem;
  color: var(--landing-ink);
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
  .landing {
    --landing-ink: rgb(244 244 245);
    --landing-paper: rgb(15 15 17);
    --landing-sheet: rgb(23 23 26);
    --landing-stock: rgb(37 36 33);
    --landing-shadow: rgb(58 56 51);
    --landing-muted: rgb(161 161 170);
    --landing-rule: rgb(255 255 255 / 0.18);
    --landing-accent: rgb(205 103 91);
  }

  .landing-hero {
    background-image:
      linear-gradient(90deg, transparent 50%, rgb(255 255 255 / 0.06) 50%, rgb(255 255 255 / 0.06) calc(50% + 1px), transparent calc(50% + 1px)),
      repeating-linear-gradient(0deg, transparent 0 31px, rgb(255 255 255 / 0.018) 31px 32px);
  }

  .landing-hero-grid::before {
    color: rgb(255 255 255 / 0.38);
  }

  .landing-kicker-command,
  .landing-primary-cta {
    background: var(--landing-ink);
    color: rgb(20 20 20);
  }

  .landing-secondary-cta:hover {
    background: rgb(255 255 255 / 0.08);
  }

  .landing-shot-bar {
    background: rgb(9 9 11);
    color: white;
  }

  .landing-showcase-preview {
    background:
      linear-gradient(90deg, transparent 0 49.9%, rgb(255 255 255 / 0.05) 50%, transparent 50.1%),
      var(--landing-paper);
  }

  .landing-showcase-designer {
    background:
      repeating-linear-gradient(0deg, transparent 0 47px, rgb(255 255 255 / 0.022) 47px 48px),
      var(--landing-sheet);
  }

  .landing-showcase-data {
    background-image:
      linear-gradient(rgb(255 255 255 / 0.025) 1px, transparent 1px),
      linear-gradient(90deg, rgb(255 255 255 / 0.025) 1px, transparent 1px);
  }

  .landing-final-cta {
    background:
      repeating-linear-gradient(90deg, transparent 0 39px, rgb(255 255 255 / 0.025) 39px 40px),
      var(--landing-stock);
  }

  .landing-end-mark {
    background:
      repeating-linear-gradient(
        90deg,
        transparent 0 8px,
        rgb(255 255 255 / 0.035) 8px 9px
      ),
      var(--landing-sheet);
  }

  .landing-privacy {
    background:
      repeating-linear-gradient(-45deg, transparent 0 12px, rgb(255 255 255 / 0.025) 12px 13px),
      var(--landing-sheet);
  }

  .landing-zero small {
    background: var(--landing-ink);
    color: rgb(20 20 20);
  }

  .landing-text-link {
    color: var(--landing-ink);
  }

  .landing-eyebrow,
  .landing-section-copy {
    color: rgb(161 161 170);
  }
}

@media (min-width: 640px) {
  .landing-spec-strip > div + div {
    border-top: 0;
    border-left: 2px solid var(--landing-ink);
  }
}

@media (min-width: 768px) {
  .landing-mode-card {
    padding: 2rem;
  }

  .landing-mode-card + .landing-mode-card {
    border-top: 0;
    border-left: 2px solid var(--landing-ink);
  }

}

@media (max-width: 1023px) {
  .landing-hero {
    background-image: repeating-linear-gradient(0deg, transparent 0 31px, rgb(20 20 20 / 0.018) 31px 32px);
  }

  .landing-hero-visual {
    width: calc(100% - 1rem);
  }
}

@media (max-width: 639px) {
  .landing-hero-grid::before {
    left: 1.25rem;
  }

  .landing-hero-title {
    font-size: clamp(3.25rem, 15vw, 4.6rem);
  }

  .landing-hero-shot,
  .landing-feature-shot,
  .landing-feature-shot-designer,
  .landing-feature-shot-data {
    box-shadow: 6px 6px 0 var(--landing-shadow);
  }

  .landing-mode-card {
    min-height: auto;
  }

  .landing-shot-label-side {
    top: -1.25rem;
    left: 1rem;
    transform: none;
  }

  .landing-shot-caption {
    justify-content: flex-start;
  }
}

/* Keep the landing chrome in the same visual system as the editor workspace. */
.landing {
  --landing-ink: rgb(24 24 27);
  --landing-paper: rgb(250 250 250);
  --landing-sheet: rgb(255 255 255);
  --landing-stock: rgb(244 244 245);
  --landing-shadow: rgb(24 24 27 / 0.12);
  --landing-muted: rgb(82 82 91);
  --landing-rule: rgb(228 228 231);
  --landing-accent: rgb(37 99 235);
  background: var(--landing-paper);
  font-family: inherit;
}

.landing-primary-cta,
.landing-secondary-cta {
  border-width: 1px;
  border-radius: 0.55rem;
  box-shadow: none;
}

.landing-primary-cta:hover,
.landing-secondary-cta:hover {
  box-shadow: none;
  transform: translateY(-1px);
}

.landing-secondary-cta:hover {
  background: var(--landing-stock);
}

.landing-hero,
.landing-modes,
.landing-showcase,
.landing-privacy,
.landing-use-cases,
.landing-faq,
.landing-final-cta {
  border-bottom: 1px solid var(--landing-rule);
}

.landing-hero {
  background-color: var(--landing-sheet);
  background-image:
    linear-gradient(rgb(24 24 27 / 0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgb(24 24 27 / 0.035) 1px, transparent 1px);
  background-size: 20px 20px;
}

@media (min-width: 1024px) {
  .landing-hero {
    display: flex;
    min-height: calc(100svh - 4rem);
    flex-direction: column;
  }

  .landing-hero-grid {
    width: 100%;
    flex: 1 1 auto;
    padding-block: clamp(2rem, 4.5vh, 3.25rem);
  }

  .landing-hero-title {
    max-width: 16ch;
    margin-top: 1.25rem;
    font-size: clamp(3.5rem, 4.25vw, 4.5rem);
    line-height: 0.95;
  }

  .landing-hero-copy {
    max-width: 38rem;
    margin-top: 1.25rem;
    font-size: 1.05rem;
    line-height: 1.75;
  }

  .landing-hero-actions {
    margin-top: 1.5rem;
  }

  .landing-proof {
    margin-top: 1.25rem;
  }

  .landing-spec-strip {
    width: 100%;
    flex: 0 0 auto;
  }
}

.landing-kicker-command {
  border-radius: 0.4rem;
}

.landing-hero-title span {
  text-decoration-color: var(--landing-accent);
  text-decoration-thickness: 0.06em;
}

.landing-hero-shot {
  border: 1px solid var(--landing-rule);
  border-radius: 0.75rem;
  box-shadow: 0 20px 55px rgb(24 24 27 / 0.16);
}

.landing-hero-shot:hover {
  box-shadow: 0 24px 65px rgb(24 24 27 / 0.2);
  transform: translateY(-2px);
}

.landing-shot-bar {
  border-bottom: 1px solid rgb(255 255 255 / 0.12);
}

.landing-spec-strip {
  overflow: hidden;
  border: 1px solid var(--landing-rule);
  border-radius: 0.7rem 0.7rem 0 0;
  background: var(--landing-sheet);
}

.landing-spec-strip > div + div {
  border-top: 1px solid var(--landing-rule);
}

.landing-mode-grid,
.landing-use-grid {
  gap: 1px;
  overflow: hidden;
  border: 1px solid var(--landing-rule);
  border-radius: 0.75rem;
  background: var(--landing-rule);
}

.landing-mode-card,
.landing-use-card {
  border: 0 !important;
  background: var(--landing-sheet) !important;
  color: var(--landing-ink) !important;
}

.landing-mode-card:nth-child(even),
.landing-use-card:nth-child(even) {
  background: var(--landing-stock) !important;
}

.landing-showcase-preview,
.landing-showcase-designer,
.landing-showcase-data,
.landing-privacy,
.landing-final-cta {
  background-color: var(--landing-paper);
  background-image:
    linear-gradient(rgb(24 24 27 / 0.025) 1px, transparent 1px),
    linear-gradient(90deg, rgb(24 24 27 / 0.025) 1px, transparent 1px);
  background-size: 20px 20px;
  color: var(--landing-ink);
}

.landing-showcase-designer,
.landing-privacy,
.landing-faq {
  background-color: var(--landing-sheet);
}

.landing-feature-shot {
  border: 1px solid var(--landing-rule);
  border-radius: 0.75rem;
  background: var(--landing-sheet);
  box-shadow: 0 18px 45px rgb(24 24 27 / 0.13);
}

.landing-feature-viewport {
  border-radius: 0.45rem;
}

.landing-shot-label {
  border: 1px solid var(--landing-rule);
  border-radius: 0.4rem;
  background: var(--landing-sheet);
  box-shadow: 0 5px 16px rgb(24 24 27 / 0.12);
  color: var(--landing-muted);
}

.landing-shot-label-side {
  top: -1.25rem;
  left: 1.3rem;
  transform: none;
}

.landing-shot-caption {
  color: var(--landing-muted);
}

.landing-feature-tags,
.landing-privacy-grid {
  gap: 1px;
  overflow: hidden;
  border: 1px solid var(--landing-rule);
  border-radius: 0.6rem;
  background: var(--landing-rule);
}

.landing-feature-tags > div,
.landing-privacy-grid > div {
  border: 0;
  background: var(--landing-sheet);
}

.landing-data-grid {
  overflow: hidden;
  border: 1px solid var(--landing-rule);
  border-radius: 0.65rem;
  background: var(--landing-rule);
}

.landing-zero {
  border: 1px dashed rgb(161 161 170);
  border-radius: 0.75rem;
  background: var(--landing-stock);
}

.landing-zero small {
  border-radius: 0.35rem;
}

.landing-library-primary,
.landing-library-secondary {
  border-width: 1px;
  border-radius: 0.5rem;
}

.landing-code-panel,
.landing-library-link {
  border-radius: 0.65rem;
}

.landing-library-links {
  gap: 0.65rem;
  background: transparent;
}

.landing-library-link {
  border: 1px solid rgb(255 255 255 / 0.12);
}

.landing-faq-list {
  overflow: hidden;
  border: 1px solid var(--landing-rule);
  border-radius: 0.75rem;
}

.landing-faq-list details + details {
  border-top: 1px solid var(--landing-rule);
}

.landing-faq-plus {
  border-radius: 0.4rem;
}

.landing-end-mark {
  border: 1px solid var(--landing-rule);
  border-radius: 0.75rem;
  background: var(--landing-sheet);
  box-shadow: 0 18px 45px rgb(24 24 27 / 0.12);
}

.landing-end-mark::before {
  border-color: var(--landing-rule);
  border-radius: 0.5rem;
}

@media (min-width: 640px) {
  .landing-spec-strip > div + div {
    border-top: 0;
    border-left: 1px solid var(--landing-rule);
  }
}

@media (prefers-color-scheme: dark) {
  .landing {
    --landing-ink: rgb(244 244 245);
    --landing-paper: rgb(9 9 11);
    --landing-sheet: rgb(24 24 27);
    --landing-stock: rgb(39 39 42);
    --landing-shadow: rgb(0 0 0 / 0.35);
    --landing-muted: rgb(161 161 170);
    --landing-rule: rgb(255 255 255 / 0.1);
    --landing-accent: rgb(96 165 250);
  }

  .landing-hero,
  .landing-showcase-preview,
  .landing-showcase-designer,
  .landing-showcase-data,
  .landing-privacy,
  .landing-final-cta {
    background-image:
      linear-gradient(rgb(255 255 255 / 0.035) 1px, transparent 1px),
      linear-gradient(90deg, rgb(255 255 255 / 0.035) 1px, transparent 1px);
  }

  .landing-hero-shot,
  .landing-feature-shot,
  .landing-end-mark {
    box-shadow: 0 20px 55px rgb(0 0 0 / 0.35);
  }

  .landing-shot-label {
    box-shadow: 0 5px 16px rgb(0 0 0 / 0.3);
  }
}
</style>
