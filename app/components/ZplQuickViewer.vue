<template>
  <section
    class="quick-viewer"
    data-testid="homepage-zpl-viewer"
    aria-label="Interactive ZPL viewer"
    :aria-busy="status === 'rendering'"
  >
    <header class="quick-viewer-toolbar">
      <div>
        <span class="quick-viewer-dot" aria-hidden="true"></span>
        <strong>Live ZPL viewer</strong>
      </div>
      <label class="quick-viewer-open">
        Open ZPL file
        <input type="file" accept=".zpl,.txt,text/plain" aria-label="Open ZPL file" @change="openFile" />
      </label>
    </header>

    <div class="quick-viewer-workbench">
      <label class="quick-viewer-source">
        <span class="quick-viewer-pane-label">ZPL code</span>
        <textarea
          v-model="source"
          aria-label="ZPL code to preview"
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
          :maxlength="maxSourceLength"
          @focus="activateViewer"
        ></textarea>
      </label>

      <div class="quick-viewer-preview">
        <span class="quick-viewer-pane-label">Label preview</span>
        <div class="quick-viewer-canvas">
          <img
            v-if="previewUrl"
            :src="previewUrl"
            alt="Live ZPL viewer preview of the current label code"
          />
          <img
            v-else-if="status === 'idle'"
            class="quick-viewer-placeholder"
            src="/screenshots/zpl-label-preview.png"
            width="600"
            height="800"
            alt="Rendered shipping label preview from the sample ZPL code"
            decoding="async"
            fetchpriority="high"
          />
          <div v-else-if="status === 'rendering'" class="quick-viewer-message" role="status">
            <span class="quick-viewer-spinner" aria-hidden="true"></span>
            Rendering this label locally…
          </div>
          <div v-else class="quick-viewer-message quick-viewer-error" role="alert">
            <IconAlertCircleOutline aria-hidden="true" />
            <span>{{ failure }}</span>
          </div>
        </div>
      </div>
    </div>

    <footer class="quick-viewer-footer">
      <span aria-live="polite">{{ fileError || resultSummary }}</span>
      <div>
        <a v-if="downloadUrl" :href="downloadUrl" download="zpl-label.png">Download PNG</a>
        <button type="button" :disabled="source === defaultSource" @click="resetSource">
          <IconRestore aria-hidden="true" />
          Reset sample
        </button>
        <NuxtLink :to="editorPath">
          Open full editor
          <IconArrowRight aria-hidden="true" />
        </NuxtLink>
      </div>
    </footer>
    <p v-if="fileError || transferNotice" class="quick-viewer-notice" role="alert">{{ fileError || transferNotice }}</p>
  </section>
</template>

<script setup lang="ts">
import {
  IconAlertCircleOutline,
  IconArrowRight,
  IconRestore,
} from "@iconify-prerendered/vue-mdi";
import defaultSource from "../../fixtures/zplr.zpl?raw";
import { encodeSharedLabel, sharedLabelHashPrefix } from "../../web/share";

const maxSourceLength = 256_000;
const source = ref(defaultSource);
const fileError = ref("");
const renderedSource = ref("");
const previewUrl = ref<string>();
const failure = ref("Enter a complete ZPL label between ^XA and ^XZ.");
const width = ref<number>();
const height = ref<number>();
const diagnosticCount = ref(0);
const status = ref<"idle" | "rendering" | "ready" | "error">("idle");
let renderTimer: ReturnType<typeof setTimeout> | undefined;
let renderSequence = 0;

const shareToken = computed(() => {
  if (source.value === defaultSource || !source.value.trim()) return undefined;
  return encodeSharedLabel({ name: "viewer-label.zpl", source: source.value });
});
const editorPath = computed(() => shareToken.value ? `/editor${sharedLabelHashPrefix}${shareToken.value}` : "/editor");
const transferNotice = computed(() => source.value !== defaultSource && source.value.trim() && !shareToken.value
  ? "This label is too large to carry in a link. Copy its ZPL into the full editor."
  : "");
const downloadUrl = computed(() => {
  if (status.value === "idle" && source.value === defaultSource) return "/screenshots/zpl-label-preview.png";
  return status.value === "ready" && renderedSource.value === source.value ? previewUrl.value : undefined;
});

const resultSummary = computed(() => {
  if (status.value !== "ready" || !width.value || !height.value) {
    return "No upload · no sign-up · no server rendering";
  }
  const diagnostics = diagnosticCount.value
    ? ` · ${diagnosticCount.value} diagnostic${diagnosticCount.value === 1 ? "" : "s"}`
    : " · no diagnostics";
  return `${width.value} × ${height.value} dots · 203 dpi${diagnostics}`;
});

function scheduleRender(delay = 180): void {
  if (renderTimer) clearTimeout(renderTimer);
  renderTimer = setTimeout(() => void renderSource(), delay);
}

function activateViewer(): void {
  if (status.value === "idle") scheduleRender(0);
}

async function renderSource(): Promise<void> {
  const requestedSource = source.value.trim();
  const sequence = ++renderSequence;
  if (!requestedSource) {
    previewUrl.value = undefined;
    width.value = undefined;
    height.value = undefined;
    diagnosticCount.value = 0;
    failure.value = "Paste ZPL code to create a label preview.";
    status.value = "error";
    return;
  }

  status.value = "rendering";
  try {
    const { renderZpl } = await import("../../src/index.web");
    const result = await renderZpl(requestedSource, {
      printDensity: 8,
      strict: false,
      limits: {
        maxDimension: 1_600,
        maxPixels: 1_500_000,
        maxGraphicBytes: 1_000_000,
        maxSessionBytes: 3_000_000,
        maxTemplateDepth: 6,
        maxExpandedCommands: 5_000,
        maxLabels: 4,
      },
    });
    if (sequence !== renderSequence) return;
    const label = result.labels[0];
    diagnosticCount.value = result.diagnostics.length;
    if (!label) {
      previewUrl.value = undefined;
      width.value = undefined;
      height.value = undefined;
      failure.value = result.diagnostics[0]?.message ?? "This ZPL did not produce a printable label.";
      status.value = "error";
      return;
    }
    previewUrl.value = label.canvas.toDataURL("image/png");
    renderedSource.value = source.value;
    width.value = label.width;
    height.value = label.height;
    failure.value = "";
    status.value = "ready";
  } catch (error) {
    if (sequence !== renderSequence) return;
    previewUrl.value = undefined;
    width.value = undefined;
    height.value = undefined;
    diagnosticCount.value = 0;
    failure.value = error instanceof Error ? error.message : "The local ZPL renderer could not create a preview.";
    status.value = "error";
  }
}

function resetSource(): void {
  fileError.value = "";
  source.value = defaultSource;
  scheduleRender(0);
}

async function openFile(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (!file) return;
  fileError.value = "";
  if (file.size > maxSourceLength) {
    fileError.value = "The quick viewer accepts files up to 256 KB. Open larger labels in the full editor.";
    return;
  }
  try {
    const text = await file.text();
    if (!text.trim()) {
      fileError.value = "This file is empty. Choose a ZPL label or paste its code.";
      return;
    }
    source.value = text;
    scheduleRender(0);
  } catch {
    fileError.value = "This file could not be read. Try opening it again or paste its ZPL code.";
  }
}

watch(source, () => {
  // Invalidate an in-flight render immediately so its old preview cannot be
  // offered as a download while the next edit is still being debounced.
  renderSequence += 1;
  fileError.value = "";
  scheduleRender();
}, { flush: "sync" });

onBeforeUnmount(() => {
  renderSequence += 1;
  if (renderTimer) clearTimeout(renderTimer);
});
</script>

<style scoped>
.quick-viewer {
  position: relative;
  display: grid;
  overflow: hidden;
  aspect-ratio: 8 / 5;
  grid-template-rows: 2.5rem minmax(0, 1fr) 2.5rem;
  border: 1px solid rgb(228 228 231);
  border-radius: 0.75rem;
  background: white;
  box-shadow: 0 18px 45px rgb(24 24 27 / 0.13);
  color: rgb(24 24 27);
}

.quick-viewer-open {
  position: relative;
  cursor: pointer;
  border: 1px solid currentColor;
  border-radius: 0.25rem;
  padding: 0.25rem 0.4rem;
  font-weight: 700;
}

.quick-viewer-open input {
  position: absolute;
  inset: 0;
  width: 100%;
  opacity: 0;
  cursor: pointer;
}

.quick-viewer-open:focus-within {
  outline: 2px solid rgb(37 99 235);
  outline-offset: 2px;
}

.quick-viewer-notice {
  position: absolute;
  right: 0.5rem;
  bottom: 3rem;
  left: 0.5rem;
  border: 1px solid rgb(161 98 7);
  border-radius: 0.25rem;
  padding: 0.5rem;
  background: rgb(254 249 195);
  color: rgb(113 63 18);
  font-size: 0.75rem;
  line-height: 1.5;
}

.quick-viewer-toolbar,
.quick-viewer-footer {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding-inline: 0.8rem;
  font-size: 0.68rem;
}

.quick-viewer-toolbar {
  border-bottom: 1px solid rgb(228 228 231);
  background: rgb(255 255 255 / 0.96);
  color: rgb(24 24 27);
}

.quick-viewer-toolbar > div,
.quick-viewer-footer > div,
.quick-viewer-footer button,
.quick-viewer-footer a {
  display: inline-flex;
  align-items: center;
}

.quick-viewer-toolbar > div {
  gap: 0.5rem;
}

.quick-viewer-toolbar strong,
.quick-viewer-status,
.quick-viewer-pane-label,
.quick-viewer-footer {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.quick-viewer-toolbar strong,
.quick-viewer-status {
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.quick-viewer-status {
  overflow: hidden;
  color: rgb(82 82 91);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.quick-viewer-dot {
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 999px;
  background: rgb(34 197 94);
  box-shadow: 0 0 0 3px rgb(34 197 94 / 0.16);
}

.quick-viewer-workbench {
  display: grid;
  min-height: 0;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
}

.quick-viewer-source,
.quick-viewer-preview {
  display: grid;
  min-width: 0;
  min-height: 0;
  grid-template-rows: 1.75rem minmax(0, 1fr);
}

.quick-viewer-source {
  border-right: 1px solid rgb(228 228 231);
  background: white;
}

.quick-viewer-pane-label {
  position: relative;
  display: flex;
  align-items: center;
  border-bottom: 1px solid rgb(228 228 231);
  padding-inline: 0.7rem;
  background: rgb(250 250 250);
  color: rgb(82 82 91);
  font-size: 0.58rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.quick-viewer-source .quick-viewer-pane-label {
  background: white;
  box-shadow: inset 0 -2px rgb(37 99 235);
  color: rgb(24 24 27);
}

.quick-viewer textarea {
  width: 100%;
  min-height: 0;
  resize: none;
  border: 0;
  outline: 0;
  background:
    linear-gradient(90deg, rgb(250 250 250) 0 2rem, rgb(228 228 231) 2rem 2.0625rem, white 2.0625rem);
  padding: 0.75rem;
  padding-left: 2.75rem;
  caret-color: rgb(37 99 235);
  color: rgb(39 39 42);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: clamp(0.61rem, 0.75vw, 0.72rem);
  line-height: 1.55;
  tab-size: 2;
}

.quick-viewer textarea:focus-visible {
  box-shadow: inset 0 0 0 2px rgb(37 99 235);
}

.quick-viewer textarea::selection {
  background: rgb(191 219 254);
}

.quick-viewer-canvas {
  position: relative;
  display: flex;
  min-height: 0;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background:
    linear-gradient(rgb(37 99 235 / 0.055) 1px, transparent 1px),
    linear-gradient(90deg, rgb(37 99 235 / 0.055) 1px, transparent 1px),
    linear-gradient(rgb(37 99 235 / 0.09) 1px, transparent 1px),
    linear-gradient(90deg, rgb(37 99 235 / 0.09) 1px, transparent 1px),
    rgb(250 250 250);
  background-size: 10px 10px, 10px 10px, 50px 50px, 50px 50px;
}

.quick-viewer-canvas > img {
  display: block;
  max-width: 100%;
  max-height: 100%;
  padding: 0.75rem;
  object-fit: contain;
  image-rendering: pixelated;
}

.quick-viewer-placeholder {
  width: 100%;
  height: 100%;
}

.quick-viewer-message {
  display: flex;
  max-width: 18rem;
  align-items: center;
  gap: 0.55rem;
  padding: 1rem;
  color: rgb(82 82 91);
  font-size: 0.7rem;
  font-weight: 700;
  text-align: center;
}

.quick-viewer-message svg {
  width: 1.1rem;
  height: 1.1rem;
  flex: 0 0 auto;
}

.quick-viewer-error {
  color: rgb(190 24 93);
}

.quick-viewer-spinner {
  width: 0.9rem;
  height: 0.9rem;
  flex: 0 0 auto;
  border: 2px solid rgb(212 212 216);
  border-top-color: rgb(63 63 70);
  border-radius: 999px;
  animation: quick-viewer-spin 0.8s linear infinite;
}

.quick-viewer-footer {
  overflow: hidden;
  border-top: 1px solid rgb(228 228 231);
  background: white;
  color: rgb(82 82 91);
  white-space: nowrap;
}

.quick-viewer-footer > span {
  overflow: hidden;
  text-overflow: ellipsis;
}

.quick-viewer-footer > div {
  flex: 0 0 auto;
  gap: 0.3rem;
}

.quick-viewer-footer button,
.quick-viewer-footer a {
  height: 1.75rem;
  gap: 0.3rem;
  border-radius: 0.4rem;
  padding-inline: 0.45rem;
  color: rgb(39 39 42);
  font-weight: 800;
}

.quick-viewer-footer button:hover:not(:disabled),
.quick-viewer-footer a:hover {
  background: rgb(244 244 245);
}

.quick-viewer-footer a:hover {
  color: rgb(37 99 235);
}

.quick-viewer-footer button:disabled {
  color: rgb(161 161 170);
}

.quick-viewer-footer button:focus-visible,
.quick-viewer-footer a:focus-visible {
  outline: 2px solid rgb(37 99 235);
  outline-offset: 1px;
}

.quick-viewer-footer svg {
  width: 0.9rem;
  height: 0.9rem;
}

@keyframes quick-viewer-spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 700px) {
  .quick-viewer {
    min-height: 38rem;
    aspect-ratio: auto;
  }

  .quick-viewer-workbench {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(15rem, 0.9fr) minmax(16rem, 1.1fr);
  }

  .quick-viewer-source {
    border-right: 0;
    border-bottom: 1px solid rgb(212 212 216);
  }

  .quick-viewer-footer > span {
    display: none;
  }

  .quick-viewer-footer {
    justify-content: flex-end;
  }
}

@media (prefers-color-scheme: dark) {
  .quick-viewer {
    border-color: rgb(255 255 255 / 0.12);
    background: rgb(24 24 27);
    box-shadow: 0 18px 45px rgb(0 0 0 / 0.32);
  }

  .quick-viewer-toolbar,
  .quick-viewer-source,
  .quick-viewer-pane-label,
  .quick-viewer-footer {
    border-color: rgb(255 255 255 / 0.12);
    background: rgb(24 24 27);
  }

  .quick-viewer-toolbar {
    color: rgb(244 244 245);
  }

  .quick-viewer-status,
  .quick-viewer-pane-label,
  .quick-viewer-footer {
    color: rgb(161 161 170);
  }

  .quick-viewer-source .quick-viewer-pane-label {
    background: rgb(24 24 27);
    color: rgb(244 244 245);
  }

  .quick-viewer textarea {
    background:
      linear-gradient(90deg, rgb(9 9 11) 0 2rem, rgb(63 63 70) 2rem 2.0625rem, rgb(24 24 27) 2.0625rem);
    color: rgb(228 228 231);
  }

  .quick-viewer textarea::selection {
    background: rgb(30 64 175);
  }

  .quick-viewer-canvas {
    background:
      linear-gradient(rgb(96 165 250 / 0.07) 1px, transparent 1px),
      linear-gradient(90deg, rgb(96 165 250 / 0.07) 1px, transparent 1px),
      linear-gradient(rgb(96 165 250 / 0.12) 1px, transparent 1px),
      linear-gradient(90deg, rgb(96 165 250 / 0.12) 1px, transparent 1px),
      rgb(24 24 27);
    background-size: 10px 10px, 10px 10px, 50px 50px, 50px 50px;
  }

  .quick-viewer-footer button,
  .quick-viewer-footer a {
    color: rgb(228 228 231);
  }

  .quick-viewer-footer button:hover:not(:disabled),
  .quick-viewer-footer a:hover {
    background: rgb(255 255 255 / 0.08);
  }

  .quick-viewer-footer button:disabled {
    color: rgb(82 82 91);
  }

  .quick-viewer-error {
    color: rgb(251 113 133);
  }
}

@media (prefers-reduced-motion: reduce) {
  .quick-viewer-spinner {
    animation: none;
  }
}
</style>
