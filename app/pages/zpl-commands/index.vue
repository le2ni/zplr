<template>
  <div class="docs-page min-h-screen bg-white text-zinc-950 dark:bg-zinc-950 dark:text-white">
    <a href="#command-index" class="sr-only z-50 rounded-md bg-white px-4 py-2 text-zinc-950 shadow-lg focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
      Skip to command index
    </a>
    <SiteHeader />

    <main id="command-index">
      <section class="docs-hero border-b border-zinc-200 dark:border-white/10">
        <div class="mx-auto max-w-[90rem] px-5 py-14 sm:px-7 sm:py-18 lg:px-10">
          <div class="docs-kicker">
            <span>^XA</span>
            ZPL II 2025 · Complete language catalog
          </div>
          <div class="mt-7 grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div>
              <h1 class="max-w-4xl text-balance text-4xl font-black tracking-[-0.055em] sm:text-6xl">
                Every ZPL command, explained and ready to render.
              </h1>
              <p class="mt-5 max-w-3xl text-pretty text-base/7 text-zinc-600 sm:text-lg/8 dark:text-zinc-300">
                Browse all {{ coverage.commands }} commands in ZPLr’s pinned profile. Each page combines concise language guidance, exact syntax, parameter variants, local previews, and one-click editing.
              </p>
            </div>
            <dl class="grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-zinc-200 bg-zinc-200 shadow-sm dark:border-white/10 dark:bg-white/10">
              <div class="docs-stat">
                <dt>Commands</dt>
                <dd>{{ coverage.commands }}</dd>
              </div>
              <div class="docs-stat">
                <dt>Parameters</dt>
                <dd>{{ coverage.parameters }}</dd>
              </div>
              <div class="docs-stat">
                <dt>Examples</dt>
                <dd>{{ coverage.examples.toLocaleString("en-US") }}</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section class="mx-auto max-w-[90rem] px-5 py-10 sm:px-7 lg:px-10">
        <div class="command-toolbar">
          <label class="search-field">
            <IconMagnify aria-hidden="true" />
            <span class="sr-only">Search commands and parameters</span>
            <input
              v-model.trim="query"
              type="search"
              placeholder="Search ^FO, barcode, orientation, RFID…"
              autocomplete="off"
              @focus="ensureAllCommands"
            />
            <kbd v-if="!query">/</kbd>
          </label>

          <label class="filter-field">
            <span>Category</span>
            <select v-model="category" @focus="ensureAllCommands">
              <option value="all">All categories</option>
              <option v-for="option in categories" :key="option" :value="option">{{ titleCase(option) }}</option>
            </select>
          </label>

          <label class="filter-field">
            <span>Effect</span>
            <select v-model="effect" @focus="ensureAllCommands">
              <option value="all">All effects</option>
              <option value="raster">Raster</option>
              <option value="job">Job state</option>
              <option value="device">Device only</option>
            </select>
          </label>

          <label class="filter-field">
            <span>Support</span>
            <select v-model="status" @focus="ensureAllCommands">
              <option value="all">All statuses</option>
              <option value="supported">Supported</option>
              <option value="partial">Partial</option>
              <option value="non-rendering">Non-rendering</option>
              <option value="unsupported">Unsupported</option>
            </select>
          </label>
        </div>

        <div class="mt-7 flex items-center justify-between gap-4">
          <p class="font-mono text-[11px] font-bold tracking-[0.08em] text-zinc-500 uppercase" aria-live="polite">
            {{ resultCount }} command{{ resultCount === 1 ? "" : "s" }}
            <span v-if="catalogLoading"> · loading complete catalog</span>
            <span v-else-if="hasHiddenGuides"> · showing {{ visibleGuides.length }}</span>
          </p>
          <button v-if="filtersActive" type="button" class="clear-filters" @click="clearFilters">
            Clear filters
          </button>
        </div>

        <div v-if="visibleGuides.length" class="command-grid mt-5">
          <NuxtLink
            v-for="guide in visibleGuides"
            :key="guide.canonical"
            :to="zplCommandRoute(guide)"
            class="command-card group"
          >
            <div class="flex items-start justify-between gap-4">
              <code class="command-code" :class="`category-${guide.category}`">{{ guide.canonical }}</code>
              <span class="status-badge" :class="`status-${guide.status}`">{{ statusLabel(guide.status) }}</span>
            </div>
            <h2>{{ guide.title }}</h2>
            <p>{{ guide.summary }}</p>
            <div v-if="guide.previewSource" class="command-sample">
              <span class="sr-only">Sample output rendered at 8 dpmm</span>
              <ClientOnly>
                <ZplMiniPreview
                  :source="guide.previewSource"
                  :alt="`Rendered sample for ${guide.canonical} ${guide.title}`"
                  thumbnail
                />
                <template #fallback>
                  <div class="command-sample-fallback" role="status">Preview loads in your browser</div>
                </template>
              </ClientOnly>
            </div>
            <div class="mt-auto flex items-center justify-between border-t border-zinc-200/80 pt-4 text-[10px] font-bold tracking-[0.06em] text-zinc-500 uppercase dark:border-white/10">
              <span>{{ guide.category }} · {{ guide.effect }}</span>
              <span class="inline-flex items-center gap-1 text-zinc-900 transition group-hover:translate-x-0.5 dark:text-white">
                {{ parameterCount(guide) }} params
                <IconArrowRight class="size-3.5" aria-hidden="true" />
              </span>
            </div>
          </NuxtLink>
        </div>

        <div v-if="hasHiddenGuides" class="show-all-row">
          <button type="button" :disabled="catalogLoading" @click="showAllCommands">
            {{ catalogLoading ? "Loading commands…" : `Show all ${resultCount} commands` }}
            <IconArrowRight class="size-4" aria-hidden="true" />
          </button>
          <p v-if="catalogLoadError" role="status">
            The complete index could not be loaded. Select the button to retry.
          </p>
        </div>

        <div v-if="!visibleGuides.length" class="empty-state">
          <IconTextSearch class="size-8" aria-hidden="true" />
          <h2>No matching command</h2>
          <p>Try a command code, parameter name, or a broader filter.</p>
          <button type="button" @click="clearFilters">Show all commands</button>
        </div>

        <nav class="command-directory" aria-labelledby="complete-command-directory-heading">
          <div class="command-directory-heading">
            <div>
              <p>Complete directory</p>
              <h2 id="complete-command-directory-heading">All {{ coverage.commands }} ZPL commands</h2>
            </div>
            <span>Every guide is linked here for direct browsing.</span>
          </div>
          <div class="command-directory-grid">
            <NuxtLink
              v-for="guide in commandDirectory"
              :key="guide.canonical"
              :to="zplCommandRoute(guide)"
            >
              <code :class="`category-${guide.category}`">{{ guide.canonical }}</code>
              <span>{{ guide.title }}</span>
            </NuxtLink>
          </div>
        </nav>
      </section>
    </main>

    <DocumentationFooter />
  </div>
</template>

<script setup lang="ts">
import {
  IconArrowRight,
  IconMagnify,
  IconTextSearch,
} from "@iconify-prerendered/vue-mdi";
import type {
  CommandCapabilityStatus,
  CommandCategory,
  CommandEffect,
} from "../../../src/types/ZplDocument";
import type { ZplCommandIndexGuide } from "../../../web/zplDocumentation";

interface CommandDirectoryEntry {
  canonical: string;
  slug: string;
  title: string;
  category: CommandCategory;
}

interface CommandIndexPayload {
  coverage: {
    commands: number;
    signatures: number;
    parameters: number;
    examples: number;
    previewExamples: number;
  };
  initialCommandLimit: number;
  categories: CommandCategory[];
  guides: ZplCommandIndexGuide[];
  directory: CommandDirectoryEntry[];
}

const { data: documentation, error: documentationError } = await useFetch<CommandIndexPayload>(
  "/api/zpl-documentation.json",
  { key: "zpl-documentation-index" },
);
if (documentationError.value || !documentation.value) {
  throw createError({
    statusCode: 500,
    statusMessage: "The ZPL command reference could not be loaded",
  });
}
const coverage = documentation.value.coverage;
const initialCommandLimit = documentation.value.initialCommandLimit;
const categories = documentation.value.categories;
const zplCommandGuides = ref(documentation.value.guides);
const commandDirectory = documentation.value.directory;
const catalogLoading = ref(false);
const catalogLoadError = ref(false);
let catalogRequest: Promise<void> | undefined;

function zplCommandRoute(guide: Pick<ZplCommandIndexGuide, "slug"> | CommandDirectoryEntry): string {
  return `/zpl-commands/${guide.slug}`;
}

const query = ref("");
const category = ref<CommandCategory | "all">("all");
const effect = ref<CommandEffect | "all">("all");
const status = ref<Exclude<CommandCapabilityStatus, "unknown"> | "all">("all");
const commandLimit = ref(initialCommandLimit);
const allCommandsLoaded = computed(() => zplCommandGuides.value.length === coverage.commands);
const searchTextBySlug = computed(() => new Map(zplCommandGuides.value.map((guide) => [
  guide.slug,
  [
    guide.canonical,
    guide.title,
    guide.summary,
    guide.category,
    guide.effect,
    guide.scope,
    guide.status,
    guide.parameterTerms,
  ].join(" ").toLowerCase(),
])));

const filteredGuides = computed(() => {
  const needle = query.value.toLowerCase();
  return zplCommandGuides.value.filter((guide) =>
    (!needle || searchTextBySlug.value.get(guide.slug)!.includes(needle)) &&
    (category.value === "all" || guide.category === category.value) &&
    (effect.value === "all" || guide.effect === effect.value) &&
    (status.value === "all" || guide.status === status.value));
});
const visibleGuides = computed(() => filteredGuides.value.slice(0, commandLimit.value));

const filtersActive = computed(() =>
  Boolean(query.value) || category.value !== "all" || effect.value !== "all" || status.value !== "all",
);
const resultCount = computed(() =>
  !allCommandsLoaded.value && !filtersActive.value
    ? coverage.commands
    : filteredGuides.value.length,
);
const hasHiddenGuides = computed(() =>
  !allCommandsLoaded.value || visibleGuides.value.length < filteredGuides.value.length,
);

async function ensureAllCommands(): Promise<void> {
  if (allCommandsLoaded.value) return;
  if (catalogRequest) return catalogRequest;

  catalogLoading.value = true;
  catalogLoadError.value = false;
  catalogRequest = $fetch<ZplCommandIndexGuide[]>("/zpl-command-index.json")
    .then((guides) => {
      if (!Array.isArray(guides) || guides.length !== coverage.commands) {
        throw new Error("The generated command index is incomplete.");
      }
      zplCommandGuides.value = guides;
    })
    .catch(() => {
      catalogLoadError.value = true;
    })
    .finally(() => {
      catalogLoading.value = false;
      catalogRequest = undefined;
    });
  return catalogRequest;
}

function clearFilters(): void {
  query.value = "";
  category.value = "all";
  effect.value = "all";
  status.value = "all";
  commandLimit.value = initialCommandLimit;
}

async function showAllCommands(): Promise<void> {
  await ensureAllCommands();
  commandLimit.value = filteredGuides.value.length;
}

watch([query, category, effect, status], () => {
  commandLimit.value = initialCommandLimit;
  void ensureAllCommands();
});

function titleCase(value: string): string {
  return value[0]!.toUpperCase() + value.slice(1);
}

function statusLabel(value: ZplCommandIndexGuide["status"]): string {
  return value === "non-rendering" ? "Device only" : titleCase(value);
}

function parameterCount(guide: ZplCommandIndexGuide): number {
  return guide.parameterCount;
}

function focusSearch(event: KeyboardEvent): void {
  if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
  const target = event.target as HTMLElement | null;
  if (target?.matches("input, textarea, select, [contenteditable=true]")) return;
  event.preventDefault();
  document.querySelector<HTMLInputElement>(".search-field input")?.focus();
}

onMounted(() => window.addEventListener("keydown", focusSearch));
onBeforeUnmount(() => window.removeEventListener("keydown", focusSearch));

const config = useRuntimeConfig();
const canonical = `${config.public.siteUrl}/zpl-commands`;
const socialImage = `${config.public.siteUrl}/og.png`;
const title = "ZPL Command Reference — Syntax, Parameters & Examples | ZPLr";
const description = `Browse all ${coverage.commands} ZPL II commands with syntax, parameter examples, support details, local label previews, and one-click editing.`;

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
  ogImageWidth: 1_200,
  ogImageHeight: 630,
  ogImageAlt: "ZPLr command reference with ZPL code, a rendered label, and documentation coverage",
  twitterCard: "summary_large_image",
  twitterTitle: title,
  twitterDescription: description,
  twitterImage: socialImage,
});

useHead({
  link: [{ rel: "canonical", href: canonical }],
  script: [{
    type: "application/ld+json",
    innerHTML: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "ZPL Command Reference",
      description,
      url: canonical,
      numberOfItems: coverage.commands,
      isPartOf: {
        "@type": "WebSite",
        name: "ZPLr",
        url: config.public.siteUrl,
      },
    }),
  }],
});
</script>

<style scoped>
.docs-page {
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
}

.docs-hero {
  background:
    radial-gradient(circle at 78% 20%, rgb(59 130 246 / 0.08), transparent 28rem),
    linear-gradient(to bottom, rgb(250 250 250), white);
}

.docs-kicker {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  color: rgb(82 82 91);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.11em;
  text-transform: uppercase;
}

.docs-kicker span {
  border-radius: 0.35rem;
  background: rgb(24 24 27);
  color: white;
  padding: 0.25rem 0.45rem;
}

.docs-stat {
  min-width: 7rem;
  background: white;
  padding: 0.9rem 1rem;
}

.docs-stat dt {
  color: rgb(113 113 122);
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.docs-stat dd {
  margin-top: 0.15rem;
  font-size: 1.35rem;
  font-weight: 900;
  letter-spacing: -0.04em;
}

.command-toolbar {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: minmax(18rem, 1fr) repeat(3, minmax(9rem, auto));
}

.search-field {
  position: relative;
  display: flex;
  min-width: 0;
  align-items: center;
}

.search-field > svg {
  position: absolute;
  left: 0.9rem;
  width: 1.1rem;
  height: 1.1rem;
  color: rgb(113 113 122);
}

.search-field input {
  width: 100%;
  height: 3.25rem;
  border: 1px solid rgb(212 212 216);
  border-radius: 0.75rem;
  background: white;
  padding: 0 3rem 0 2.75rem;
  color: rgb(24 24 27);
  font-size: 0.9rem;
  outline: none;
  transition: border-color 140ms ease, box-shadow 140ms ease;
}

.search-field input:focus {
  border-color: rgb(113 113 122);
  box-shadow: 0 0 0 3px rgb(228 228 231);
}

.search-field kbd {
  position: absolute;
  right: 0.85rem;
  border: 1px solid rgb(212 212 216);
  border-radius: 0.3rem;
  padding: 0.12rem 0.35rem;
  color: rgb(113 113 122);
  font-family: ui-monospace, monospace;
  font-size: 0.65rem;
}

.filter-field {
  display: flex;
  min-width: 0;
  flex-direction: column;
  justify-content: center;
  border: 1px solid rgb(212 212 216);
  border-radius: 0.75rem;
  background: white;
  padding: 0.35rem 0.7rem;
}

.filter-field span {
  color: rgb(113 113 122);
  font-size: 0.56rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.filter-field select {
  min-width: 0;
  border: 0;
  background: transparent;
  color: rgb(39 39 42);
  font-size: 0.76rem;
  font-weight: 700;
  outline: none;
}

.clear-filters {
  color: rgb(82 82 91);
  font-size: 0.72rem;
  font-weight: 750;
  text-decoration: underline;
  text-underline-offset: 0.2rem;
}

.command-grid {
  display: grid;
  gap: 0.85rem;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.command-card {
  display: flex;
  min-height: 15rem;
  flex-direction: column;
  border: 1px solid rgb(228 228 231);
  border-radius: 0.9rem;
  background: white;
  padding: 1.15rem;
  box-shadow: 0 1px 2px rgb(24 24 27 / 0.025);
  transition: border-color 150ms ease, box-shadow 150ms ease, transform 150ms ease;
}

.command-card:hover {
  transform: translateY(-2px);
  border-color: rgb(161 161 170);
  box-shadow: 0 12px 30px rgb(24 24 27 / 0.07);
}

.command-card:focus-visible {
  outline: 2px solid rgb(82 82 91);
  outline-offset: 3px;
}

.command-code {
  border-radius: 0.45rem;
  background: rgb(244 244 245);
  padding: 0.35rem 0.5rem;
  color: rgb(24 24 27);
  font-size: 0.88rem;
  font-weight: 850;
}

.category-barcode { color: rgb(29 78 216); }
.category-text { color: rgb(126 34 206); }
.category-graphic { color: rgb(4 120 87); }
.category-storage { color: rgb(180 83 9); }
.category-network { color: rgb(14 116 144); }
.category-rfid { color: rgb(190 24 93); }

.status-badge {
  border-radius: 999px;
  padding: 0.28rem 0.5rem;
  font-size: 0.57rem;
  font-weight: 850;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.status-supported { background: rgb(220 252 231); color: rgb(21 128 61); }
.status-partial { background: rgb(254 249 195); color: rgb(161 98 7); }
.status-non-rendering { background: rgb(244 244 245); color: rgb(82 82 91); }
.status-unsupported { background: rgb(255 228 230); color: rgb(190 18 60); }

.command-card h2 {
  margin-top: 1rem;
  color: rgb(24 24 27);
  font-size: 1rem;
  font-weight: 850;
  letter-spacing: -0.02em;
}

.command-card > p {
  margin: 0.55rem 0 0.9rem;
  color: rgb(82 82 91);
  font-size: 0.75rem;
  line-height: 1.35rem;
}

.command-sample {
  overflow: hidden;
  margin-bottom: 1rem;
  border: 1px solid rgb(228 228 231);
  border-radius: 0.65rem;
  background: rgb(250 250 250);
}

.command-sample-fallback {
  display: grid;
  min-height: 4.5rem;
  place-items: center;
  color: rgb(113 113 122);
  font-size: 0.65rem;
}

.show-all-row {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.7rem;
  padding: 2.5rem 0 1rem;
}

.show-all-row button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  border: 1px solid rgb(212 212 216);
  border-radius: 0.65rem;
  background: white;
  padding: 0.75rem 1rem;
  color: rgb(39 39 42);
  font-size: 0.75rem;
  font-weight: 800;
  box-shadow: 0 1px 2px rgb(24 24 27 / 0.04);
}

.show-all-row button:hover {
  border-color: rgb(113 113 122);
}

.show-all-row button:disabled {
  cursor: progress;
  opacity: 0.7;
}

.show-all-row p {
  color: rgb(190 18 60);
  font-size: 0.7rem;
}

.empty-state {
  margin-top: 3rem;
  display: flex;
  min-height: 23rem;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 1px dashed rgb(212 212 216);
  border-radius: 1rem;
  color: rgb(113 113 122);
  text-align: center;
}

.empty-state h2 {
  margin-top: 1rem;
  color: rgb(39 39 42);
  font-weight: 850;
}

.empty-state p {
  margin-top: 0.3rem;
  font-size: 0.8rem;
}

.empty-state button {
  margin-top: 1rem;
  border-radius: 0.5rem;
  background: rgb(24 24 27);
  padding: 0.55rem 0.8rem;
  color: white;
  font-size: 0.72rem;
  font-weight: 750;
}

.command-directory {
  margin-top: 4rem;
  border-top: 1px solid rgb(228 228 231);
  padding-top: 2rem;
}

.command-directory-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 2rem;
}

.command-directory-heading p {
  color: rgb(113 113 122);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.command-directory-heading h2 {
  margin-top: 0.3rem;
  font-size: 1.35rem;
  font-weight: 900;
  letter-spacing: -0.035em;
}

.command-directory-heading > span {
  color: rgb(113 113 122);
  font-size: 0.72rem;
}

.command-directory-grid {
  display: grid;
  margin-top: 1.25rem;
  gap: 1px;
  overflow: hidden;
  border: 1px solid rgb(228 228 231);
  border-radius: 0.8rem;
  background: rgb(228 228 231);
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.command-directory-grid a {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0.65rem;
  background: white;
  padding: 0.7rem 0.8rem;
  transition: background-color 140ms ease;
}

.command-directory-grid a:hover {
  background: rgb(250 250 250);
}

.command-directory-grid a:focus-visible {
  position: relative;
  z-index: 1;
  outline: 2px solid rgb(82 82 91);
  outline-offset: -2px;
}

.command-directory-grid code {
  min-width: 3.5rem;
  font-size: 0.73rem;
  font-weight: 850;
}

.command-directory-grid span {
  overflow: hidden;
  color: rgb(82 82 91);
  font-size: 0.68rem;
  line-height: 1.1rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 1023px) {
  .command-toolbar {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .search-field {
    grid-column: 1 / -1;
  }

  .command-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .command-directory-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 639px) {
  .command-toolbar {
    grid-template-columns: 1fr;
  }

  .search-field {
    grid-column: auto;
  }

  .command-grid {
    grid-template-columns: 1fr;
  }

  .command-card {
    min-height: 13rem;
  }

  .command-directory-heading {
    align-items: start;
    flex-direction: column;
    gap: 0.5rem;
  }

  .command-directory-grid {
    grid-template-columns: 1fr;
  }
}

@media (prefers-color-scheme: dark) {
  .docs-hero {
    background:
      radial-gradient(circle at 78% 20%, rgb(59 130 246 / 0.12), transparent 28rem),
      linear-gradient(to bottom, rgb(24 24 27), rgb(9 9 11));
  }

  .docs-kicker {
    color: rgb(161 161 170);
  }

  .docs-kicker span {
    background: white;
    color: rgb(9 9 11);
  }

  .docs-stat,
  .search-field input,
  .filter-field,
  .command-card,
  .show-all-row button,
  .command-directory-grid a {
    background: rgb(24 24 27);
    border-color: rgb(255 255 255 / 0.1);
  }

  .command-directory {
    border-color: rgb(255 255 255 / 0.1);
  }

  .command-directory-grid {
    border-color: rgb(255 255 255 / 0.1);
    background: rgb(255 255 255 / 0.1);
  }

  .command-directory-grid a:hover {
    background: rgb(39 39 42);
  }

  .command-directory-grid span {
    color: rgb(161 161 170);
  }

  .search-field input,
  .filter-field select {
    color: white;
  }

  .search-field input:focus {
    border-color: rgb(113 113 122);
    box-shadow: 0 0 0 3px rgb(63 63 70);
  }

  .search-field kbd {
    border-color: rgb(82 82 91);
  }

  .command-card:hover {
    border-color: rgb(113 113 122);
    box-shadow: 0 12px 30px rgb(0 0 0 / 0.22);
  }

  .command-code {
    background: rgb(255 255 255 / 0.08);
  }

  .command-card h2,
  .empty-state h2 {
    color: white;
  }

  .show-all-row button {
    color: white;
  }

  .command-card > p {
    color: rgb(161 161 170);
  }

  .command-sample {
    border-color: rgb(255 255 255 / 0.1);
    background: rgb(24 24 27);
  }

  .status-supported { background: rgb(20 83 45 / 0.5); color: rgb(134 239 172); }
  .status-partial { background: rgb(113 63 18 / 0.5); color: rgb(253 224 71); }
  .status-non-rendering { background: rgb(255 255 255 / 0.08); color: rgb(212 212 216); }
  .status-unsupported { background: rgb(136 19 55 / 0.45); color: rgb(253 164 175); }
}
</style>
