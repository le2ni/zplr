<template>
  <div class="command-doc min-h-screen bg-white text-zinc-950 dark:bg-zinc-950 dark:text-white">
    <a href="#command-content" class="sr-only z-50 rounded-md bg-white px-4 py-2 text-zinc-950 shadow-lg focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
      Skip to command documentation
    </a>
    <SiteHeader />

    <main id="command-content">
      <div class="border-b border-zinc-200 bg-zinc-50/75 dark:border-white/10 dark:bg-zinc-900/35">
        <div class="mx-auto max-w-[90rem] px-5 py-3 sm:px-7 lg:px-10">
          <nav class="flex items-center gap-2 text-xs text-zinc-500" aria-label="Breadcrumb">
            <NuxtLink to="/" class="hover:text-zinc-950 dark:hover:text-white">ZPLr</NuxtLink>
            <IconChevronRight class="size-3" aria-hidden="true" />
            <NuxtLink to="/zpl-commands" class="hover:text-zinc-950 dark:hover:text-white">Commands</NuxtLink>
            <IconChevronRight class="size-3" aria-hidden="true" />
            <span class="font-mono font-bold text-zinc-700 dark:text-zinc-300">{{ guide.canonical }}</span>
          </nav>
        </div>
      </div>

      <div class="mx-auto grid max-w-[90rem] gap-10 px-5 py-10 sm:px-7 lg:grid-cols-[minmax(0,1fr)_15rem] lg:px-10 xl:grid-cols-[minmax(0,1fr)_17rem]">
        <article class="min-w-0">
          <header class="command-heading">
            <div class="flex flex-wrap items-center gap-2">
              <span class="status-badge" :class="`status-${guide.status}`">{{ statusLabel(guide.status) }}</span>
              <span class="fact-badge">{{ guide.category }}</span>
              <span class="fact-badge">{{ guide.effect }}</span>
              <span class="fact-badge">{{ guide.scope }} scope</span>
            </div>
            <div class="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start">
              <code class="hero-command" :class="`category-${guide.category}`">{{ guide.canonical }}</code>
              <div>
                <h1 class="text-balance text-3xl font-black tracking-[-0.045em] sm:text-5xl">{{ guide.title }}</h1>
                <p class="mt-4 max-w-4xl text-pretty text-base/7 text-zinc-600 sm:text-lg/8 dark:text-zinc-300">{{ guide.summary }}</p>
              </div>
            </div>

            <div v-if="guide.limitations.length" class="limitation-box">
              <IconAlertCircleOutline class="mt-0.5 size-5 shrink-0" aria-hidden="true" />
              <div>
                <p class="font-bold">ZPLr compatibility note</p>
                <ul class="mt-1 space-y-1">
                  <li v-for="limitation in guide.limitations" :key="limitation">{{ limitation }}</li>
                </ul>
              </div>
            </div>

            <div v-if="!hasPreviews" class="code-only-notice">
              <IconCodeTags class="size-5 shrink-0" aria-hidden="true" />
              <p>These are code examples only. {{ codeOnlyExplanation }}</p>
            </div>
          </header>

          <section
            v-if="guide.featuredExample"
            id="rendered-sample"
            class="signature-section featured-sample-section scroll-mt-24"
          >
            <div class="section-eyebrow">Rendered sample</div>
            <div class="featured-sample-heading">
              <h2>A representative output</h2>
              <p>This compact example is selected because the visible result clearly demonstrates {{ guide.canonical }}.</p>
            </div>
            <article class="example-card mt-5">
              <div class="example-card-header">
                <div>
                  <h4>{{ guide.featuredExample.title }}</h4>
                  <p>{{ guide.featuredExample.description }}</p>
                </div>
                <div class="example-actions">
                  <button
                    type="button"
                    :aria-label="`Copy ${guide.featuredExample.title}`"
                    @click="copyExample(guide.featuredExample)"
                  >
                    <IconCheck v-if="copiedExample === guide.featuredExample.id" class="size-4" aria-hidden="true" />
                    <IconContentCopy v-else class="size-4" aria-hidden="true" />
                    {{ copiedExample === guide.featuredExample.id ? "Copied" : "Copy" }}
                  </button>
                  <NuxtLink :to="editorExampleRoute(guide.featuredExample.id)">
                    <IconPencilOutline class="size-4" aria-hidden="true" />
                    Edit in editor
                    <IconArrowRight class="size-3.5" aria-hidden="true" />
                  </NuxtLink>
                </div>
              </div>
              <div class="example-body">
                <div class="code-pane">
                  <div class="pane-label"><span>ZPL</span><span>{{ guide.featuredExample.filename }}</span></div>
                  <pre tabindex="0"><code>{{ guide.featuredExample.source }}</code></pre>
                </div>
                <div class="preview-pane">
                  <div class="pane-label"><span>Renderer</span><span>8 dpmm</span></div>
                  <ClientOnly>
                    <ZplMiniPreview
                      :source="guide.featuredExample.source"
                      :alt="`Representative rendered sample for ${guide.canonical} ${guide.title}`"
                      compact
                      crop
                    />
                    <template #fallback><div class="preview-fallback" role="status">Preview loads in your browser</div></template>
                  </ClientOnly>
                </div>
              </div>
            </article>
          </section>

          <section
            v-for="(signature, signatureIndex) in guide.signatures"
            :id="signature.id"
            :key="signature.id"
            class="signature-section scroll-mt-24"
          >
            <div class="section-eyebrow">Syntax{{ guide.signatures.length > 1 ? ` ${signatureIndex + 1}` : "" }}</div>
            <div class="signature-bar">
              <code>{{ signature.syntax }}</code>
              <span v-if="signature.label">{{ signature.label }}</span>
            </div>

            <template v-if="signature.parameters.length">
              <article
                v-for="parameter in signature.parameters"
                :id="`parameter-${parameter.id}`"
                :key="parameter.id"
                class="parameter-section scroll-mt-24"
              >
                <div class="parameter-heading">
                  <code>{{ parameter.key }}</code>
                  <div>
                    <h2>{{ cleanName(parameter.name) }}</h2>
                    <p>{{ parameter.description }}</p>
                  </div>
                </div>

                <dl class="parameter-facts">
                  <div v-if="parameter.defaultValue">
                    <dt>Default</dt>
                    <dd><code>{{ parameter.defaultValue }}</code></dd>
                  </div>
                  <div v-if="parameter.range">
                    <dt>Range</dt>
                    <dd><code>{{ parameter.range.min }}–{{ parameter.range.max }}</code></dd>
                  </div>
                  <div>
                    <dt>Required</dt>
                    <dd>{{ parameter.required ? "Yes" : "No" }}</dd>
                  </div>
                  <div v-if="parameter.repeatable">
                    <dt>Pattern</dt>
                    <dd>Repeatable</dd>
                  </div>
                </dl>

                <div v-if="parameter.choices.length" class="suggested-values">
                  <span>Documented values</span>
                  <code v-for="choice in parameter.choices.slice(0, 16)" :key="choice">{{ choice }}</code>
                  <em v-if="parameter.choices.length > 16">+{{ parameter.choices.length - 16 }} more</em>
                </div>

                <div class="examples-heading">
                  <h3><code>{{ parameter.key }}</code> variations</h3>
                  <p>Compare values side by side; other parameters remain at representative defaults.</p>
                </div>
                <section
                  class="example-comparison"
                  :aria-label="`${parameter.key} parameter variations`"
                >
                  <div class="comparison-label">
                    <span>Side-by-side comparison</span>
                    <span>{{ parameter.examples.length }} variations</span>
                  </div>
                  <div
                    class="comparison-grid"
                    :class="comparisonClass(parameter.examples.length)"
                    role="list"
                  >
                    <article
                      v-for="example in parameter.examples"
                      :key="example.id"
                      class="example-card example-variation"
                      role="listitem"
                    >
                      <div class="example-card-header">
                        <div>
                          <h4>{{ example.title }}</h4>
                          <p>{{ example.description }}</p>
                        </div>
                        <div class="example-actions">
                          <button type="button" :aria-label="`Copy ${example.title}`" @click="copyExample(example)">
                            <IconCheck v-if="copiedExample === example.id" class="size-4" aria-hidden="true" />
                            <IconContentCopy v-else class="size-4" aria-hidden="true" />
                            {{ copiedExample === example.id ? "Copied" : "Copy" }}
                          </button>
                          <NuxtLink :to="editorExampleRoute(example.id)">
                            <IconPencilOutline class="size-4" aria-hidden="true" />
                            Edit in editor
                            <IconArrowRight class="size-3.5" aria-hidden="true" />
                          </NuxtLink>
                        </div>
                      </div>

                      <div class="example-body" :class="{ 'code-only': !example.preview }">
                        <div class="code-pane">
                          <div class="pane-label">
                            <span>ZPL</span>
                            <span>{{ example.filename }}</span>
                          </div>
                          <pre tabindex="0"><code>{{ example.source }}</code></pre>
                        </div>
                        <div v-if="example.preview" class="preview-pane">
                          <div class="pane-label">
                            <span>Renderer</span>
                            <span>8 dpmm</span>
                          </div>
                          <ClientOnly>
                            <ZplMiniPreview
                              :source="example.source"
                              :alt="`Rendered label for ${guide.canonical} ${example.title}`"
                              compact
                            />
                            <template #fallback>
                              <div class="preview-fallback" role="status">Preview loads in your browser</div>
                            </template>
                          </ClientOnly>
                        </div>
                      </div>
                    </article>
                  </div>
                </section>
              </article>
            </template>

            <div v-else class="parameterless-section">
              <p>This command form has no parameters.</p>
              <section v-for="example in signature.examples" :key="example.id" class="example-card mt-5">
                <div class="example-card-header">
                  <div>
                    <h4>{{ example.title }}</h4>
                    <p>{{ example.description }}</p>
                  </div>
                  <div class="example-actions">
                    <button type="button" :aria-label="`Copy ${example.title}`" @click="copyExample(example)">
                      <IconCheck v-if="copiedExample === example.id" class="size-4" aria-hidden="true" />
                      <IconContentCopy v-else class="size-4" aria-hidden="true" />
                      {{ copiedExample === example.id ? "Copied" : "Copy" }}
                    </button>
                    <NuxtLink :to="editorExampleRoute(example.id)">
                      <IconPencilOutline class="size-4" aria-hidden="true" />
                      Edit in editor
                      <IconArrowRight class="size-3.5" aria-hidden="true" />
                    </NuxtLink>
                  </div>
                </div>
                <div class="example-body" :class="{ 'code-only': !example.preview }">
                  <div class="code-pane">
                    <div class="pane-label"><span>ZPL</span><span>{{ example.filename }}</span></div>
                    <pre tabindex="0"><code>{{ example.source }}</code></pre>
                  </div>
                  <div v-if="example.preview" class="preview-pane">
                    <div class="pane-label"><span>Renderer</span><span>8 dpmm</span></div>
                    <ClientOnly>
                      <ZplMiniPreview :source="example.source" :alt="`Rendered label for ${guide.canonical}`" />
                      <template #fallback><div class="preview-fallback" role="status">Preview loads in your browser</div></template>
                    </ClientOnly>
                  </div>
                </div>
              </section>
            </div>
          </section>

          <section class="official-reference">
            <div>
              <p class="section-eyebrow">Primary source</p>
              <h2>Official Zebra reference</h2>
              <p>Use the manufacturer reference for printer- and firmware-specific behavior beyond ZPLr’s pinned rendering profile.</p>
            </div>
            <a :href="guide.reference" target="_blank" rel="noreferrer">
              Open Zebra documentation
              <IconOpenInNew class="size-4" aria-hidden="true" />
            </a>
          </section>

          <nav class="adjacent-navigation" aria-label="Adjacent commands">
            <NuxtLink v-if="previousGuide" :to="zplCommandRoute(previousGuide)" rel="prev">
              <span><IconArrowLeft class="size-4" aria-hidden="true" /> Previous</span>
              <strong><code>{{ previousGuide.canonical }}</code> {{ previousGuide.title }}</strong>
            </NuxtLink>
            <span v-else></span>
            <NuxtLink v-if="nextGuide" :to="zplCommandRoute(nextGuide)" rel="next" class="text-right">
              <span>Next <IconArrowRight class="size-4" aria-hidden="true" /></span>
              <strong>{{ nextGuide.title }} <code>{{ nextGuide.canonical }}</code></strong>
            </NuxtLink>
          </nav>
        </article>

        <aside class="hidden lg:block">
          <nav class="toc sticky top-24" aria-label="On this page">
            <p>On this page</p>
            <a v-if="guide.featuredExample" href="#rendered-sample" class="signature-link">
              Rendered sample
            </a>
            <a v-for="(signature, index) in guide.signatures" :key="signature.id" :href="`#${signature.id}`" class="signature-link">
              Syntax{{ guide.signatures.length > 1 ? ` ${index + 1}` : "" }}
            </a>
            <template v-for="signature in guide.signatures" :key="`${signature.id}-parameters`">
              <a v-for="parameter in signature.parameters" :key="parameter.id" :href="`#parameter-${parameter.id}`">
                <code>{{ parameter.key }}</code>
                <span>{{ cleanName(parameter.name) }}</span>
              </a>
            </template>
            <NuxtLink to="/zpl-commands" class="all-commands">
              <IconViewGridOutline class="size-4" aria-hidden="true" />
              All {{ coverage.commands }} commands
            </NuxtLink>
          </nav>
        </aside>
      </div>
    </main>

    <DocumentationFooter />
  </div>
</template>

<script setup lang="ts">
import {
  IconAlertCircleOutline,
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconChevronRight,
  IconCodeTags,
  IconContentCopy,
  IconOpenInNew,
  IconPencilOutline,
  IconViewGridOutline,
} from "@iconify-prerendered/vue-mdi";
import {
  type ZplCommandGuide,
  type ZplDocumentationExample,
} from "../../../web/zplDocumentation";

const route = useRoute();
const slug = Array.isArray(route.params.slug) ? route.params.slug[0] : route.params.slug;
interface AdjacentCommandGuide {
  canonical: string;
  slug: string;
  title: string;
}

interface CommandDocumentationPayload {
  guide: ZplCommandGuide;
  previousGuide?: AdjacentCommandGuide;
  nextGuide?: AdjacentCommandGuide;
  coverage: {
    commands: number;
    signatures: number;
    parameters: number;
    examples: number;
    previewExamples: number;
  };
}

const {
  data: documentation,
  error: documentationError,
} = await useFetch<CommandDocumentationPayload>(
  `/api/zpl-documentation/${encodeURIComponent(slug ?? "")}.json`,
  { key: `zpl-documentation-${slug ?? "unknown"}` },
);
if (documentationError.value || !documentation.value) {
  throw createError({
    statusCode: documentationError.value?.statusCode === 404 ? 404 : 500,
    statusMessage: documentationError.value?.statusCode === 404
      ? "ZPL command not found"
      : "The ZPL command reference could not be loaded",
  });
}

const {
  guide,
  previousGuide,
  nextGuide,
  coverage,
} = documentation.value;

function zplCommandRoute(candidate: Pick<AdjacentCommandGuide, "slug">): string {
  return `/zpl-commands/${candidate.slug}`;
}

function editorExampleRoute(exampleId: string): string {
  return `/editor#example=${encodeURIComponent(exampleId)}`;
}
const hasPreviews = Boolean(guide.featuredExample) || guide.signatures.some((signature) =>
  signature.examples.some(({ preview }) => preview) ||
  signature.parameters.some((parameter) => parameter.examples.some(({ preview }) => preview)),
);
const codeOnlyExplanation = computed(() => {
  if (guide.status === "unsupported") {
    return "This command is recognized but not implemented by the local renderer.";
  }
  if (guide.effect === "device" || guide.effect === "job") {
    return "This printer or session command does not produce a standalone label image.";
  }
  return "A single rendered image would not reliably demonstrate this command, so the editable syntax examples are shown without a misleading preview.";
});
const copiedExample = ref<string>();
let copyTimer: ReturnType<typeof setTimeout> | undefined;

function cleanName(value: string): string {
  const normalized = value.replace(/\s+/g, " ").replace(/\s*[-–—:,.]+\s*$/g, "").trim();
  return normalized ? normalized[0]!.toUpperCase() + normalized.slice(1) : "Parameter";
}

function comparisonClass(exampleCount: number): string {
  return `variations-${Math.min(3, Math.max(1, exampleCount))}`;
}

function titleCase(value: string): string {
  return value[0]!.toUpperCase() + value.slice(1);
}

function statusLabel(value: ZplCommandGuide["status"]): string {
  return value === "non-rendering" ? "Device only" : titleCase(value);
}

async function copyExample(example: ZplDocumentationExample): Promise<void> {
  try {
    await navigator.clipboard.writeText(example.source);
    copiedExample.value = example.id;
    if (copyTimer) clearTimeout(copyTimer);
    copyTimer = setTimeout(() => {
      copiedExample.value = undefined;
    }, 2_000);
  } catch {
    copiedExample.value = undefined;
  }
}

onBeforeUnmount(() => {
  if (copyTimer) clearTimeout(copyTimer);
});

const config = useRuntimeConfig();
const canonical = `${config.public.siteUrl}${zplCommandRoute(guide)}`;
const socialImage = `${config.public.siteUrl}/og.png`;
const title = `${guide.canonical} ${guide.title} — ZPL Syntax & Examples | ZPLr`;
const description = `${guide.summary} Review its syntax, every documented parameter, ZPLr support status, and editable examples.`;

useSeoMeta({
  title,
  description,
  robots: "index, follow",
  ogType: "article",
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
    innerHTML: JSON.stringify([
      {
        "@context": "https://schema.org",
        "@type": "TechArticle",
        headline: `${guide.canonical} ${guide.title}`,
        description,
        url: canonical,
        about: {
          "@type": "DefinedTerm",
          name: guide.canonical,
          description: guide.summary,
        },
        isPartOf: {
          "@type": "CollectionPage",
          name: "ZPL Command Reference",
          url: `${config.public.siteUrl}/zpl-commands`,
        },
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "ZPLr", item: config.public.siteUrl },
          { "@type": "ListItem", position: 2, name: "ZPL Commands", item: `${config.public.siteUrl}/zpl-commands` },
          { "@type": "ListItem", position: 3, name: guide.canonical, item: canonical },
        ],
      },
    ]),
  }],
});
</script>

<style scoped>
.command-doc {
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
}

.command-heading {
  padding-bottom: 3rem;
}

.hero-command {
  align-self: flex-start;
  border: 1px solid rgb(228 228 231);
  border-radius: 0.8rem;
  background: rgb(250 250 250);
  padding: 0.75rem 0.85rem;
  font-size: 1.35rem;
  font-weight: 900;
  box-shadow: 0 2px 8px rgb(24 24 27 / 0.04);
}

.category-barcode { color: rgb(29 78 216); }
.category-text { color: rgb(126 34 206); }
.category-graphic { color: rgb(4 120 87); }
.category-storage { color: rgb(180 83 9); }
.category-network { color: rgb(14 116 144); }
.category-rfid { color: rgb(190 24 93); }

.status-badge,
.fact-badge {
  border-radius: 999px;
  padding: 0.32rem 0.58rem;
  font-size: 0.59rem;
  font-weight: 850;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

.fact-badge {
  border: 1px solid rgb(228 228 231);
  color: rgb(82 82 91);
}

.status-supported { background: rgb(220 252 231); color: rgb(21 128 61); }
.status-partial { background: rgb(254 249 195); color: rgb(161 98 7); }
.status-non-rendering { background: rgb(244 244 245); color: rgb(82 82 91); }
.status-unsupported { background: rgb(255 228 230); color: rgb(190 18 60); }

.limitation-box,
.code-only-notice {
  margin-top: 1.8rem;
  display: flex;
  gap: 0.75rem;
  border: 1px solid rgb(253 230 138);
  border-radius: 0.8rem;
  background: rgb(254 252 232);
  padding: 0.9rem 1rem;
  color: rgb(133 77 14);
  font-size: 0.75rem;
  line-height: 1.25rem;
}

.code-only-notice {
  border-color: rgb(228 228 231);
  background: rgb(250 250 250);
  color: rgb(82 82 91);
}

.signature-section {
  border-top: 1px solid rgb(228 228 231);
  padding: 3rem 0;
}

.featured-sample-section {
  padding-top: 2.5rem;
}

.featured-sample-heading {
  margin-top: 0.65rem;
}

.featured-sample-heading h2 {
  font-size: 1.25rem;
  font-weight: 850;
  letter-spacing: -0.025em;
}

.featured-sample-heading p {
  margin-top: 0.3rem;
  max-width: 48rem;
  color: rgb(82 82 91);
  font-size: 0.78rem;
  line-height: 1.35rem;
}

.section-eyebrow {
  color: rgb(113 113 122);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.64rem;
  font-weight: 850;
  letter-spacing: 0.11em;
  text-transform: uppercase;
}

.signature-bar {
  margin-top: 0.65rem;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  border: 1px solid rgb(212 212 216);
  border-radius: 0.8rem;
  background: rgb(24 24 27);
  padding: 1rem 1.1rem;
  color: white;
}

.signature-bar code {
  font-size: 1rem;
  font-weight: 750;
}

.signature-bar span {
  color: rgb(161 161 170);
  font-size: 0.68rem;
}

.parameter-section {
  padding-top: 3rem;
}

.parameter-section + .parameter-section {
  margin-top: 3rem;
  border-top: 1px dashed rgb(212 212 216);
}

.parameter-heading {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: start;
  gap: 0.8rem;
}

.parameter-heading > code {
  border-radius: 0.4rem;
  background: rgb(244 244 245);
  padding: 0.35rem 0.5rem;
  color: rgb(39 39 42);
  font-size: 0.8rem;
  font-weight: 850;
}

.parameter-heading h2 {
  font-size: 1.1rem;
  font-weight: 850;
  letter-spacing: -0.02em;
}

.parameter-heading p {
  margin-top: 0.25rem;
  color: rgb(82 82 91);
  font-size: 0.78rem;
  line-height: 1.35rem;
}

.parameter-facts {
  margin-top: 1rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.parameter-facts > div {
  display: flex;
  overflow: hidden;
  border: 1px solid rgb(228 228 231);
  border-radius: 0.45rem;
  font-size: 0.65rem;
}

.parameter-facts dt,
.parameter-facts dd {
  padding: 0.36rem 0.52rem;
}

.parameter-facts dt {
  background: rgb(244 244 245);
  color: rgb(82 82 91);
  font-weight: 800;
}

.parameter-facts dd {
  color: rgb(39 39 42);
  font-weight: 650;
}

.suggested-values {
  margin-top: 0.8rem;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
}

.suggested-values > span {
  margin-right: 0.25rem;
  color: rgb(113 113 122);
  font-size: 0.61rem;
  font-weight: 800;
  text-transform: uppercase;
}

.suggested-values code {
  border-radius: 0.3rem;
  background: rgb(244 244 245);
  padding: 0.22rem 0.36rem;
  color: rgb(63 63 70);
  font-size: 0.63rem;
}

.suggested-values em {
  color: rgb(113 113 122);
  font-size: 0.62rem;
  font-style: normal;
}

.examples-heading {
  margin: 2rem 0 0.8rem;
}

.examples-heading h3 {
  color: rgb(39 39 42);
  font-size: 0.8rem;
  font-weight: 850;
}

.examples-heading p {
  margin-top: 0.2rem;
  color: rgb(113 113 122);
  font-size: 0.68rem;
}

.example-comparison {
  overflow: hidden;
  border: 1px solid rgb(212 212 216);
  border-radius: 0.9rem;
  background: rgb(212 212 216);
  box-shadow: 0 4px 16px rgb(24 24 27 / 0.035);
}

.comparison-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border-bottom: 1px solid rgb(228 228 231);
  background: rgb(250 250 250);
  padding: 0.55rem 0.8rem;
  color: rgb(113 113 122);
  font-size: 0.59rem;
  font-weight: 800;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

.comparison-grid {
  display: grid;
  gap: 1px;
  overflow-x: auto;
  scrollbar-width: thin;
  scroll-snap-type: x proximity;
}

.comparison-grid.variations-1 {
  grid-template-columns: minmax(0, 1fr);
}

.comparison-grid.variations-2 {
  grid-template-columns: repeat(2, minmax(18rem, 1fr));
}

.comparison-grid.variations-3 {
  grid-template-columns: repeat(3, minmax(18rem, 1fr));
}

.example-variation {
  min-width: 0;
  scroll-snap-align: start;
}

.example-comparison .example-card {
  border: 0;
  border-radius: 0;
  box-shadow: none;
}

.example-variation .example-card-header {
  min-height: 8.25rem;
  align-items: stretch;
  flex-direction: column;
}

.example-variation .example-actions {
  width: 100%;
}

.example-variation .example-actions a {
  margin-left: auto;
}

.example-variation .example-body,
.example-variation .example-body.code-only {
  grid-template-columns: 1fr;
}

.example-variation .preview-pane {
  border-top: 1px solid rgb(228 228 231);
  border-left: 0;
}

.example-variation .code-pane pre {
  min-height: 14rem;
  max-height: 20rem;
}

.example-variation .preview-fallback {
  min-height: 14rem;
}

.example-card {
  overflow: hidden;
  border: 1px solid rgb(212 212 216);
  border-radius: 0.9rem;
  background: white;
  box-shadow: 0 4px 16px rgb(24 24 27 / 0.035);
}

.example-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border-bottom: 1px solid rgb(228 228 231);
  padding: 0.8rem 0.9rem;
}

.example-card-header h4 {
  color: rgb(24 24 27);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.75rem;
  font-weight: 800;
}

.example-card-header p {
  margin-top: 0.2rem;
  max-width: 48rem;
  color: rgb(113 113 122);
  font-size: 0.65rem;
  line-height: 1rem;
}

.example-actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 0.4rem;
}

.example-actions button,
.example-actions a {
  display: inline-flex;
  height: 2rem;
  align-items: center;
  gap: 0.35rem;
  border: 1px solid rgb(212 212 216);
  border-radius: 0.45rem;
  padding: 0 0.55rem;
  color: rgb(63 63 70);
  font-size: 0.64rem;
  font-weight: 750;
  transition: background-color 130ms ease, color 130ms ease;
}

.example-actions a {
  border-color: rgb(24 24 27);
  background: rgb(24 24 27);
  color: white;
}

.example-actions button:hover {
  background: rgb(244 244 245);
}

.example-actions a:hover {
  background: rgb(63 63 70);
}

.example-actions button:focus-visible,
.example-actions a:focus-visible {
  outline: 2px solid rgb(113 113 122);
  outline-offset: 2px;
}

.example-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
}

.example-body.code-only {
  grid-template-columns: 1fr;
}

.code-pane,
.preview-pane {
  min-width: 0;
}

.preview-pane {
  border-left: 1px solid rgb(228 228 231);
}

.pane-label {
  display: flex;
  height: 2rem;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgb(63 63 70);
  background: rgb(39 39 42);
  padding: 0 0.7rem;
  color: rgb(161 161 170);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.57rem;
  font-weight: 800;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

.preview-pane .pane-label {
  border-color: rgb(228 228 231);
  background: rgb(250 250 250);
  color: rgb(113 113 122);
}

.code-pane pre {
  min-height: 18rem;
  max-height: 28rem;
  overflow: auto;
  background: rgb(24 24 27);
  padding: 1rem;
  color: rgb(228 228 231);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.69rem;
  line-height: 1.25rem;
  outline: none;
  tab-size: 2;
  white-space: pre-wrap;
  word-break: break-word;
}

.code-pane pre:focus-visible {
  box-shadow: inset 0 0 0 2px rgb(96 165 250);
}

.preview-fallback {
  display: grid;
  min-height: 18rem;
  place-items: center;
  background: rgb(250 250 250);
  color: rgb(113 113 122);
  font-size: 0.72rem;
}

.parameterless-section {
  margin-top: 1rem;
  color: rgb(82 82 91);
  font-size: 0.78rem;
}

.official-reference {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 2rem;
  border-top: 1px solid rgb(228 228 231);
  padding: 3rem 0;
}

.official-reference h2 {
  margin-top: 0.45rem;
  font-size: 1.1rem;
  font-weight: 850;
}

.official-reference p:not(.section-eyebrow) {
  margin-top: 0.3rem;
  max-width: 44rem;
  color: rgb(82 82 91);
  font-size: 0.75rem;
  line-height: 1.25rem;
}

.official-reference a {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 0.45rem;
  border-radius: 0.55rem;
  background: rgb(24 24 27);
  padding: 0.7rem 0.85rem;
  color: white;
  font-size: 0.7rem;
  font-weight: 750;
}

.adjacent-navigation {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  border-top: 1px solid rgb(228 228 231);
  padding: 2.5rem 0 1rem;
}

.adjacent-navigation a {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 0.4rem;
  border: 1px solid rgb(228 228 231);
  border-radius: 0.7rem;
  padding: 0.85rem;
  transition: border-color 130ms ease, background-color 130ms ease;
}

.adjacent-navigation a:hover {
  border-color: rgb(161 161 170);
  background: rgb(250 250 250);
}

.adjacent-navigation span {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  color: rgb(113 113 122);
  font-size: 0.62rem;
  font-weight: 750;
}

.adjacent-navigation a.text-right span {
  justify-content: flex-end;
}

.adjacent-navigation strong {
  overflow: hidden;
  color: rgb(39 39 42);
  font-size: 0.72rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.toc {
  max-height: calc(100vh - 7rem);
  overflow-y: auto;
  border-left: 1px solid rgb(228 228 231);
  padding-left: 1rem;
  scrollbar-width: thin;
}

.toc > p {
  margin-bottom: 0.55rem;
  color: rgb(39 39 42);
  font-size: 0.7rem;
  font-weight: 850;
}

.toc > a {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0.45rem;
  border-left: 2px solid transparent;
  padding: 0.38rem 0.5rem;
  color: rgb(113 113 122);
  font-size: 0.65rem;
}

.toc > a:hover {
  color: rgb(24 24 27);
}

.toc > a code {
  width: 2.5rem;
  flex-shrink: 0;
  color: rgb(63 63 70);
  font-weight: 800;
}

.toc > a span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.toc > .signature-link {
  color: rgb(39 39 42);
  font-weight: 750;
}

.toc > .all-commands {
  margin-top: 0.7rem;
  border-top: 1px solid rgb(228 228 231);
  padding-top: 0.8rem;
  color: rgb(39 39 42);
  font-weight: 750;
}

@media (max-width: 767px) {
  .comparison-grid.variations-2,
  .comparison-grid.variations-3 {
    grid-template-columns: 1fr;
    overflow-x: visible;
    scroll-snap-type: none;
  }

  .example-variation .example-card-header {
    min-height: 0;
  }

  .example-card-header,
  .official-reference {
    align-items: stretch;
    flex-direction: column;
  }

  .example-actions {
    width: 100%;
  }

  .example-actions a {
    margin-left: auto;
  }

  .example-body {
    grid-template-columns: 1fr;
  }

  .preview-pane {
    border-top: 1px solid rgb(228 228 231);
    border-left: 0;
  }

  .code-pane pre {
    min-height: 13rem;
    max-height: 22rem;
  }

  .adjacent-navigation {
    grid-template-columns: 1fr;
  }
}

@media (prefers-color-scheme: dark) {
  .hero-command,
  .example-card,
  .comparison-label {
    border-color: rgb(255 255 255 / 0.1);
    background: rgb(24 24 27);
  }

  .example-comparison {
    border-color: rgb(255 255 255 / 0.1);
    background: rgb(255 255 255 / 0.1);
  }

  .fact-badge,
  .signature-section,
  .parameter-section + .parameter-section,
  .official-reference,
  .adjacent-navigation,
  .toc,
  .toc > .all-commands,
  .comparison-label,
  .example-card-header,
  .preview-pane,
  .preview-pane .pane-label {
    border-color: rgb(255 255 255 / 0.1);
  }

  .status-supported { background: rgb(20 83 45 / 0.5); color: rgb(134 239 172); }
  .status-partial { background: rgb(113 63 18 / 0.5); color: rgb(253 224 71); }
  .status-non-rendering { background: rgb(255 255 255 / 0.08); color: rgb(212 212 216); }
  .status-unsupported { background: rgb(136 19 55 / 0.45); color: rgb(253 164 175); }

  .limitation-box {
    border-color: rgb(113 63 18);
    background: rgb(66 32 6 / 0.45);
    color: rgb(253 224 71);
  }

  .code-only-notice {
    border-color: rgb(255 255 255 / 0.1);
    background: rgb(255 255 255 / 0.04);
    color: rgb(161 161 170);
  }

  .parameter-heading > code,
  .suggested-values code {
    background: rgb(255 255 255 / 0.08);
    color: rgb(228 228 231);
  }

  .parameter-heading h2,
  .examples-heading h3,
  .featured-sample-heading h2,
  .example-card-header h4,
  .official-reference h2,
  .adjacent-navigation strong,
  .toc > p,
  .toc > .signature-link,
  .toc > .all-commands {
    color: white;
  }

  .parameter-heading p,
  .featured-sample-heading p,
  .official-reference p:not(.section-eyebrow) {
    color: rgb(161 161 170);
  }

  .parameter-facts > div {
    border-color: rgb(255 255 255 / 0.1);
  }

  .parameter-facts dt {
    background: rgb(255 255 255 / 0.08);
    color: rgb(161 161 170);
  }

  .parameter-facts dd {
    color: rgb(228 228 231);
  }

  .preview-pane .pane-label,
  .preview-fallback {
    background: rgb(24 24 27);
  }

  .example-actions button {
    border-color: rgb(82 82 91);
    color: rgb(212 212 216);
  }

  .example-actions button:hover {
    background: rgb(255 255 255 / 0.08);
  }

  .example-actions a,
  .official-reference a {
    background: white;
    color: rgb(9 9 11);
  }

  .adjacent-navigation a {
    border-color: rgb(255 255 255 / 0.1);
  }

  .adjacent-navigation a:hover {
    border-color: rgb(113 113 122);
    background: rgb(255 255 255 / 0.04);
  }

  .toc > a:hover,
  .toc > a code {
    color: rgb(228 228 231);
  }
}
</style>
