<template>
  <div class="resource-backdrop" @mousedown.self="emit('close')">
    <section class="resource-dialog" role="dialog" aria-modal="true" aria-labelledby="resource-manager-title">
      <header class="resource-header">
        <div>
          <h2 id="resource-manager-title">Images &amp; fonts</h2>
          <p>Import printer-ready resources, keep their originals, and manage every source reference.</p>
        </div>
        <button class="resource-close" type="button" title="Close resource manager" aria-label="Close resource manager" @click="emit('close')">
          <IconClose aria-hidden="true" />
        </button>
      </header>

      <div class="resource-body">
        <aside class="resource-list-panel">
          <div class="resource-list-heading">
            <strong>Resources in ZPL</strong><span>{{ resources.length }}</span>
          </div>
          <div v-if="resources.length" class="resource-list">
            <button v-for="resource in resources" :key="resource.id" type="button" :class="{ active: selectedResourceId === resource.id }" :aria-pressed="selectedResourceId === resource.id" @click="selectedResourceId = resource.id">
              <span class="resource-kind">{{ resource.kind === "graphic" ? "IMG" : resource.kind === "font" ? "FONT" : "OBJ" }}</span>
              <span class="min-w-0 flex-1"><strong>{{ resource.name }}</strong><small>{{ resource.bytes?.toLocaleString() ?? "?" }} bytes · {{ resource.references.length }} use{{ resource.references.length === 1 ? "" : "s" }}</small></span>
            </button>
          </div>
          <p v-else class="resource-empty">Imported <code>~DG</code> and <code>~DY</code> resources appear here.</p>

          <div v-if="selectedResource" class="resource-selected-actions">
            <label>Resource name<input v-model="renameValue" @keydown.enter.prevent="renameSelected" /></label>
            <div>
              <button type="button" @click="renameSelected">Rename everywhere</button>
              <button v-if="selectedResource.kind === 'graphic'" type="button" @click="insertSelectedGraphic">Place on label</button>
              <button v-if="selectedResource.kind === 'font'" type="button" :disabled="!selectedFieldSpan" @click="applySelectedFont">Apply to text</button>
            </div>
            <button class="resource-danger" type="button" @click="deleteSelected">Delete definition</button>
          </div>

          <div v-if="assets.length" class="resource-originals">
            <div class="resource-list-heading"><strong>Saved originals</strong><span>{{ assets.length }}</span></div>
            <button v-for="asset in assets" :key="asset.id" type="button" @click="emit('downloadAsset', asset.id)">
              <span>{{ asset.filename }}</span><small>{{ formatBytes(asset.size) }} · download</small>
            </button>
          </div>
        </aside>

        <main class="resource-import-panel">
          <div class="resource-tabs" role="tablist" aria-label="Resource type">
            <button type="button" role="tab" :aria-selected="importTab === 'image'" :class="{ active: importTab === 'image' }" @click="importTab = 'image'">Image</button>
            <button type="button" role="tab" :aria-selected="importTab === 'font'" :class="{ active: importTab === 'font' }" @click="importTab = 'font'">TrueType font</button>
          </div>

          <div v-if="importTab === 'image'" class="resource-import-content">
            <div class="resource-drop" @click="imageInput?.click()" @dragover.prevent @drop.prevent="dropImage">
              <strong>{{ imageFile?.name || "Choose a PNG, JPEG, WebP, GIF, BMP, or SVG" }}</strong>
              <span>Images are converted locally to a 1-bit printer bitmap.</span>
              <input ref="imageInput" class="sr-only" type="file" accept="image/*,.svg" @change="pickImage" />
            </div>

            <div class="resource-image-grid">
              <div class="resource-preview">
                <canvas ref="previewCanvas" aria-label="Converted monochrome image preview"></canvas>
                <span v-if="conversionBusy">Converting…</span>
                <span v-else-if="!imageBitmap">Converted preview</span>
              </div>
              <div class="resource-controls">
                <label>Name<input v-model="imageName" /></label>
                <label>Storage<select v-model="imageStorage"><option value="stored">Stored ~DG + ^XG</option><option value="inline">Inline ^GFA</option></select></label>
                <label>Dithering<select v-model="dither"><option value="threshold">Threshold</option><option value="bayer">Ordered Bayer</option><option value="floyd-steinberg">Floyd–Steinberg</option></select></label>
                <label>Threshold <span>{{ threshold }}</span><input v-model.number="threshold" type="range" min="0" max="255" step="1" /></label>
                <label>Maximum width (dots)<input v-model.number="maximumWidth" type="number" min="1" max="4096" /></label>
                <label class="resource-check"><input v-model="invert" type="checkbox" /> Invert black and white</label>
                <div class="grid grid-cols-2 gap-2"><label>X<input v-model.number="placeX" type="number" min="0" /></label><label>Y<input v-model.number="placeY" type="number" min="0" /></label></div>
              </div>
            </div>
            <div v-if="imageBitmap" class="resource-summary">
              {{ imageBitmap.width }} × {{ imageBitmap.height }} dots · {{ imageBitmap.data.length.toLocaleString() }} raw bytes · {{ imageStorage === "stored" ? normalizedImageName : "inline field" }}
            </div>
            <button class="resource-primary" type="button" :disabled="!imageFile || !imageBitmap || conversionBusy" @click="importImage">Import and place image</button>
          </div>

          <div v-else class="resource-import-content">
            <div class="resource-drop" @click="fontInput?.click()" @dragover.prevent @drop.prevent="dropFont">
              <strong>{{ fontFile?.name || "Choose a .ttf OpenType font" }}</strong>
              <span>The original font is validated locally before generating a compressed <code>~DY</code> resource.</span>
              <input ref="fontInput" class="sr-only" type="file" accept=".ttf,font/ttf,application/x-font-ttf" @change="pickFont" />
            </div>
            <div class="resource-font-form">
              <label>Printer resource name<input v-model="fontName" /></label>
              <label>Font identifier<select v-model="fontIdentifier"><option v-for="identifier in fontIdentifiers" :key="identifier" :value="identifier">{{ identifier }} (^A{{ identifier }})</option></select></label>
            </div>
            <div v-if="fontDetails" class="resource-font-details">
              <strong>{{ fontDetails.family }}</strong><span>{{ fontDetails.glyphs.toLocaleString() }} glyphs · {{ formatBytes(fontDetails.bytes) }} · {{ normalizedFontName }}</span>
            </div>
            <button class="resource-primary" type="button" :disabled="!fontFile || !fontBytes || !fontDetails" @click="importFont">Import and register font</button>
            <p class="resource-note">The import adds <code>~DY</code> and <code>^CW{{ fontIdentifier }}</code>. Select <code>^A{{ fontIdentifier }}</code> in ZPL (or the text properties) to use it.</p>
          </div>
        </main>
      </div>
      <p v-if="message" class="resource-message" role="status">{{ message }}</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, shallowRef, watch } from "vue";
import { IconClose } from "@iconify-prerendered/vue-mdi";
import * as opentypeModule from "opentype.js";
import type { Font } from "opentype.js";
import type { SourceChange } from "../visualEditorSource";
import type { SourceSpan } from "../../src/index.web";
import type { WorkspaceAssetMetadata } from "../workspaceAssets";
import {
  collectZplResources,
  imageFileToMonochrome,
  monochromeImageData,
  normalizedResourceName,
  sourceEditForExistingGraphic,
  sourceEditForApplyFont,
  sourceEditForInlineGraphic,
  sourceEditForResourceDelete,
  sourceTransactionForDownloadedFont,
  sourceTransactionForResourceRename,
  sourceTransactionForStoredGraphic,
  type DitherMode,
  type MonochromeBitmap,
} from "../zplResources";

const props = defineProps<{
  source: string;
  activeLabelIndex: number;
  assets: readonly WorkspaceAssetMetadata[];
  selectedFieldSpan?: SourceSpan;
}>();

const emit = defineEmits<{
  edit: [change: SourceChange];
  close: [];
  storeAsset: [asset: { metadata: WorkspaceAssetMetadata; bytes: Uint8Array }];
  downloadAsset: [assetId: string];
  deleteAsset: [assetId: string];
  renameAsset: [assetId: string, resourceName: string];
}>();

const resources = computed(() => collectZplResources(props.source));
const selectedResourceId = ref<string>();
const selectedResource = computed(() => resources.value.find(({ id }) => id === selectedResourceId.value));
const renameValue = ref("");
watch(selectedResource, (resource) => { renameValue.value = resource?.name ?? ""; });

const importTab = ref<"image" | "font">("image");
const imageInput = ref<HTMLInputElement | null>(null);
const fontInput = ref<HTMLInputElement | null>(null);
const previewCanvas = ref<HTMLCanvasElement | null>(null);
const imageFile = shallowRef<File>();
const imageBitmap = shallowRef<MonochromeBitmap>();
const imageName = ref("IMAGE");
const imageStorage = ref<"stored" | "inline">("stored");
const dither = ref<DitherMode>("threshold");
const threshold = ref(128);
const maximumWidth = ref(812);
const invert = ref(false);
const placeX = ref(0);
const placeY = ref(0);
const conversionBusy = ref(false);
const normalizedImageName = computed(() => normalizedResourceName(imageName.value, "GRF"));

const fontFile = shallowRef<File>();
const fontBytes = shallowRef<Uint8Array>();
const fontName = ref("FONT");
const fontIdentifier = ref("Z");
const fontIdentifiers = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const fontDetails = ref<{ family: string; glyphs: number; bytes: number }>();
const normalizedFontName = computed(() => normalizedResourceName(fontName.value, "TTF"));
const message = ref("");
let conversionTimer: number | undefined;

function formatBytes(bytes: number): string {
  if (bytes < 1_024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1_024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

function fileBaseName(file: File): string {
  return file.name.replace(/\.[^.]+$/, "");
}

function pickImage(event: Event): void {
  const input = event.currentTarget as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (file) setImage(file);
}

function dropImage(event: DragEvent): void {
  const file = Array.from(event.dataTransfer?.files ?? []).find((candidate) => candidate.type.startsWith("image/") || candidate.name.toLowerCase().endsWith(".svg"));
  if (file) setImage(file);
}

function setImage(file: File): void {
  if (file.size > 20_000_000) {
    message.value = "Images are limited to 20 MB before conversion.";
    return;
  }
  imageFile.value = file;
  imageName.value = fileBaseName(file);
  scheduleImageConversion(0);
}

function scheduleImageConversion(delay = 180): void {
  if (conversionTimer !== undefined) window.clearTimeout(conversionTimer);
  conversionTimer = window.setTimeout(() => void convertImage(), delay);
}

async function convertImage(): Promise<void> {
  const file = imageFile.value;
  if (!file) return;
  conversionBusy.value = true;
  try {
    const result = await imageFileToMonochrome(file, maximumWidth.value, {
      dither: dither.value,
      threshold: threshold.value,
      invert: invert.value,
    });
    imageBitmap.value = result.bitmap;
    await nextTick();
    const canvas = previewCanvas.value;
    const context = canvas?.getContext("2d");
    if (canvas && context) {
      canvas.width = result.bitmap.width;
      canvas.height = result.bitmap.height;
      context.putImageData(monochromeImageData(result.bitmap), 0, 0);
    }
    message.value = "";
  } catch (error) {
    imageBitmap.value = undefined;
    message.value = error instanceof Error ? error.message : "The image could not be converted.";
  } finally {
    conversionBusy.value = false;
  }
}

watch([dither, threshold, maximumWidth, invert], () => {
  if (imageFile.value) scheduleImageConversion();
});

function assetId(): string {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `asset-${Date.now().toString(36)}`;
}

async function originalAsset(file: File, resourceName: string, kind: "image" | "font"): Promise<void> {
  emit("storeAsset", {
    metadata: {
      id: assetId(),
      resourceName,
      filename: file.name,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      kind,
      importedAt: new Date().toISOString(),
    },
    bytes: new Uint8Array(await file.arrayBuffer()),
  });
}

function importImage(): void {
  const bitmap = imageBitmap.value;
  const file = imageFile.value;
  if (!bitmap || !file) return;
  const change = imageStorage.value === "stored"
    ? sourceTransactionForStoredGraphic(props.source, props.activeLabelIndex, bitmap, imageName.value, placeX.value, placeY.value)
    : sourceEditForInlineGraphic(props.source, props.activeLabelIndex, bitmap, placeX.value, placeY.value);
  if (!change) {
    message.value = "Add a complete ^XA…^XZ label before importing an image.";
    return;
  }
  emit("edit", change);
  void originalAsset(file, imageStorage.value === "stored" ? normalizedImageName.value : "INLINE", "image");
  message.value = `${file.name} was converted and placed on the label.`;
}

function pickFont(event: Event): void {
  const input = event.currentTarget as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (file) void setFont(file);
}

function dropFont(event: DragEvent): void {
  const file = Array.from(event.dataTransfer?.files ?? []).find((candidate) => candidate.name.toLowerCase().endsWith(".ttf"));
  if (file) void setFont(file);
}

function arrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

async function setFont(file: File): Promise<void> {
  if (file.size > 4_000_000) {
    message.value = "Fonts are limited to 4 MB by the local renderer.";
    return;
  }
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const moduleWithDefault = opentypeModule as typeof opentypeModule & { default?: typeof opentypeModule };
    const parser = opentypeModule.parse ?? moduleWithDefault.default?.parse;
    if (!parser) throw new Error("The OpenType parser is unavailable.");
    const font = parser(arrayBuffer(bytes)) as Font;
    const family = font.names.fontFamily?.en || font.names.fullName?.en || fileBaseName(file);
    fontFile.value = file;
    fontBytes.value = bytes;
    fontName.value = fileBaseName(file);
    fontDetails.value = { family, glyphs: font.glyphs.length, bytes: file.size };
    message.value = "";
  } catch (error) {
    fontFile.value = undefined;
    fontBytes.value = undefined;
    fontDetails.value = undefined;
    message.value = error instanceof Error ? `Invalid TrueType font: ${error.message}` : "The font is invalid.";
  }
}

function importFont(): void {
  const bytes = fontBytes.value;
  const file = fontFile.value;
  if (!bytes || !file) return;
  const change = sourceTransactionForDownloadedFont(props.source, bytes, fontName.value, fontIdentifier.value, props.selectedFieldSpan);
  if (!change) {
    message.value = "Add a complete ^XA…^XZ label before importing a font.";
    return;
  }
  emit("edit", change);
  void originalAsset(file, normalizedFontName.value, "font");
  message.value = `${fontDetails.value?.family ?? file.name} was registered as ^A${fontIdentifier.value}.`;
}

function renameSelected(): void {
  const resource = selectedResource.value;
  if (!resource) return;
  const change = sourceTransactionForResourceRename(props.source, resource, renameValue.value);
  if (!change) return;
  emit("edit", change);
  const matchingAsset = props.assets.find((asset) => asset.resourceName.toUpperCase() === resource.name.toUpperCase());
  if (matchingAsset) {
    emit("renameAsset", matchingAsset.id, normalizedResourceName(renameValue.value, resource.kind === "font" ? "TTF" : "GRF"));
  }
}

function insertSelectedGraphic(): void {
  const resource = selectedResource.value;
  if (!resource || resource.kind !== "graphic") return;
  const change = sourceEditForExistingGraphic(props.source, props.activeLabelIndex, resource.name, placeX.value, placeY.value);
  if (change) emit("edit", change);
}

function applySelectedFont(): void {
  const resource = selectedResource.value;
  if (!resource || resource.kind !== "font" || !props.selectedFieldSpan) return;
  const change = sourceEditForApplyFont(props.source, props.selectedFieldSpan, resource.name);
  if (change) emit("edit", change);
  else message.value = "Select a text layer and make sure this font has a ^CW identifier.";
}

function deleteSelected(): void {
  const resource = selectedResource.value;
  if (!resource || !window.confirm(`Delete the ${resource.name} definition? Existing uses will remain visible as missing-resource diagnostics.`)) return;
  emit("edit", sourceEditForResourceDelete(props.source, resource));
  const matchingAsset = props.assets.find((asset) => asset.resourceName.toUpperCase() === resource.name.toUpperCase());
  if (matchingAsset) emit("deleteAsset", matchingAsset.id);
  selectedResourceId.value = undefined;
}

onBeforeUnmount(() => {
  if (conversionTimer !== undefined) window.clearTimeout(conversionTimer);
});
</script>

<style scoped>
.resource-backdrop { position: fixed; inset: 0; z-index: 70; display: flex; align-items: center; justify-content: center; background: rgb(24 24 27 / 0.32); padding: 1rem; backdrop-filter: blur(2px); }
.resource-dialog { position: relative; display: flex; width: min(68rem, 100%); height: min(43rem, calc(100dvh - 2rem)); flex-direction: column; overflow: hidden; border: 1px solid rgb(228 228 231); border-radius: 0.85rem; background: white; box-shadow: 0 28px 70px rgb(24 24 27 / 0.28); }
.resource-header { display: flex; min-height: 4rem; flex: 0 0 auto; align-items: center; border-bottom: 1px solid rgb(228 228 231); padding: 0.7rem 1rem; }
.resource-header h2 { font-size: 0.9rem; font-weight: 700; }
.resource-header p { margin-top: 0.15rem; color: rgb(113 113 122); font-size: 0.65rem; }
.resource-close { display: inline-flex; width: 2rem; height: 2rem; margin-left: auto; align-items: center; justify-content: center; border-radius: 0.45rem; color: rgb(113 113 122); line-height: 0; }
.resource-close svg { width: 1rem; height: 1rem; }
.resource-close:hover { background: rgb(244 244 245); color: rgb(24 24 27); }
.resource-body { display: flex; min-height: 0; flex: 1; }
.resource-list-panel { display: flex; width: 18rem; flex: 0 0 auto; flex-direction: column; overflow-y: auto; border-right: 1px solid rgb(228 228 231); }
.resource-list-heading { display: flex; align-items: center; justify-content: space-between; padding: 0.7rem; color: rgb(113 113 122); font-size: 0.6rem; letter-spacing: 0.05em; text-transform: uppercase; }
.resource-list > button { display: flex; width: calc(100% - 0.8rem); align-items: center; gap: 0.55rem; margin: 0 0.4rem 0.2rem; border: 1px solid transparent; border-radius: 0.5rem; padding: 0.5rem; cursor: pointer; text-align: left; }
.resource-list > button:hover { background: rgb(244 244 245); }
.resource-list > button.active { border-color: rgb(191 219 254); background: rgb(239 246 255); }
.resource-list > button strong, .resource-list > button small { display: block; overflow: hidden; text-overflow: ellipsis; font-size: 0.65rem; white-space: nowrap; }
.resource-list > button small { margin-top: 0.12rem; color: rgb(113 113 122); font-size: 0.56rem; }
.resource-kind { display: inline-flex; width: 2.3rem; height: 1.55rem; align-items: center; justify-content: center; border-radius: 0.35rem; background: rgb(244 244 245); color: rgb(82 82 91); font-size: 0.5rem; font-weight: 800; }
.resource-empty { padding: 1rem; color: rgb(113 113 122); font-size: 0.65rem; line-height: 1rem; text-align: center; }
.resource-selected-actions { margin: 0.7rem; border-top: 1px solid rgb(228 228 231); padding-top: 0.7rem; }
.resource-selected-actions label, .resource-controls > label, .resource-font-form label { display: block; color: rgb(82 82 91); font-size: 0.62rem; font-weight: 700; }
.resource-selected-actions input, .resource-controls input, .resource-controls select, .resource-font-form input, .resource-font-form select { display: block; width: 100%; height: 2rem; margin-top: 0.25rem; border: 1px solid rgb(212 212 216); border-radius: 0.4rem; background: white; padding-inline: 0.45rem; color: rgb(39 39 42); font-size: 0.68rem; }
.resource-selected-actions > div { display: grid; grid-template-columns: 1fr 1fr; gap: 0.35rem; margin-top: 0.45rem; }
.resource-selected-actions button { min-height: 1.8rem; border: 1px solid rgb(212 212 216); border-radius: 0.4rem; padding: 0.3rem; font-size: 0.58rem; font-weight: 600; }
.resource-selected-actions .resource-danger { width: 100%; margin-top: 0.4rem; border-color: rgb(254 205 211); color: rgb(190 18 60); }
.resource-originals { margin-top: auto; border-top: 1px solid rgb(228 228 231); padding-bottom: 0.5rem; }
.resource-originals > button { display: block; width: 100%; padding: 0.35rem 0.7rem; text-align: left; }
.resource-originals span, .resource-originals small { display: block; overflow: hidden; text-overflow: ellipsis; font-size: 0.62rem; white-space: nowrap; }
.resource-originals small { color: rgb(113 113 122); font-size: 0.55rem; }
.resource-import-panel { display: flex; min-width: 0; flex: 1; flex-direction: column; }
.resource-tabs { display: flex; min-height: 2.8rem; flex: 0 0 auto; align-items: flex-end; gap: 0.25rem; border-bottom: 1px solid rgb(228 228 231); padding: 0 0.8rem; }
.resource-tabs button { height: 2.2rem; border-bottom: 2px solid transparent; padding-inline: 0.8rem; color: rgb(113 113 122); font-size: 0.7rem; font-weight: 700; }
.resource-tabs button.active { border-bottom-color: rgb(39 39 42); color: rgb(24 24 27); }
.resource-import-content { min-height: 0; flex: 1; overflow-y: auto; padding: 1rem; }
.resource-drop { display: flex; min-height: 5.5rem; cursor: pointer; flex-direction: column; align-items: center; justify-content: center; border: 1.5px dashed rgb(161 161 170); border-radius: 0.65rem; background: rgb(250 250 250); padding: 0.8rem; text-align: center; }
.resource-drop:hover { border-color: rgb(59 130 246); background: rgb(239 246 255); }
.resource-drop strong { font-size: 0.75rem; }
.resource-drop span { margin-top: 0.3rem; color: rgb(113 113 122); font-size: 0.62rem; }
.resource-image-grid { display: grid; grid-template-columns: minmax(15rem, 1fr) 16rem; gap: 1rem; margin-top: 1rem; }
.resource-preview { position: relative; display: flex; min-height: 18rem; align-items: center; justify-content: center; overflow: auto; border: 1px solid rgb(228 228 231); border-radius: 0.65rem; background-color: white; background-image: linear-gradient(45deg, rgb(228 228 231) 25%, transparent 25%), linear-gradient(-45deg, rgb(228 228 231) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgb(228 228 231) 75%), linear-gradient(-45deg, transparent 75%, rgb(228 228 231) 75%); background-position: 0 0, 0 8px, 8px -8px, -8px 0; background-size: 16px 16px; }
.resource-preview canvas { max-width: 100%; max-height: 24rem; image-rendering: pixelated; }
.resource-preview span { position: absolute; border-radius: 9999px; background: rgb(255 255 255 / 0.92); padding: 0.35rem 0.6rem; color: rgb(113 113 122); font-size: 0.6rem; box-shadow: 0 1px 4px rgb(0 0 0 / 0.1); }
.resource-controls { display: flex; flex-direction: column; gap: 0.65rem; }
.resource-controls label > span { float: right; color: rgb(113 113 122); }
.resource-controls input[type="range"] { padding: 0; accent-color: rgb(24 24 27); }
.resource-controls .resource-check { display: flex; align-items: center; gap: 0.45rem; }
.resource-controls .resource-check input { display: inline; width: auto; height: auto; margin: 0; }
.resource-summary, .resource-font-details { margin-top: 0.8rem; border-radius: 0.5rem; background: rgb(244 244 245); padding: 0.55rem 0.7rem; color: rgb(82 82 91); font-size: 0.62rem; }
.resource-primary { min-height: 2.3rem; margin-top: 0.8rem; border-radius: 0.5rem; background: rgb(24 24 27); padding-inline: 0.9rem; color: white; font-size: 0.7rem; font-weight: 700; }
.resource-primary:disabled { cursor: not-allowed; opacity: 0.35; }
.resource-font-form { display: grid; grid-template-columns: 1fr 10rem; gap: 0.8rem; margin-top: 1rem; }
.resource-font-details { display: flex; flex-direction: column; gap: 0.2rem; }
.resource-note { margin-top: 0.7rem; color: rgb(113 113 122); font-size: 0.62rem; line-height: 1rem; }
.resource-message { position: absolute; bottom: 1rem; left: 50%; z-index: 5; transform: translateX(-50%); border-radius: 9999px; background: rgb(24 24 27); padding: 0.45rem 0.8rem; color: white; font-size: 0.65rem; box-shadow: 0 4px 14px rgb(0 0 0 / 0.2); }
@media (max-width: 760px) { .resource-list-panel { display: none; } .resource-image-grid { grid-template-columns: 1fr; } .resource-preview { min-height: 12rem; } }
@media (prefers-color-scheme: dark) {
  .resource-dialog { border-color: rgb(255 255 255 / 0.1); background: rgb(9 9 11); }
  .resource-header, .resource-list-panel, .resource-tabs, .resource-selected-actions, .resource-originals, .resource-preview { border-color: rgb(255 255 255 / 0.1); }
  .resource-list > button:hover, .resource-summary, .resource-font-details { background: rgb(255 255 255 / 0.06); }
  .resource-list > button.active { border-color: rgb(59 130 246 / 0.35); background: rgb(59 130 246 / 0.12); }
  .resource-kind { background: rgb(255 255 255 / 0.08); color: rgb(212 212 216); }
  .resource-tabs button.active { border-bottom-color: white; color: white; }
  .resource-drop { border-color: rgb(255 255 255 / 0.2); background: rgb(24 24 27); }
  .resource-drop:hover { border-color: rgb(96 165 250); background: rgb(59 130 246 / 0.08); }
  .resource-selected-actions input, .resource-controls input, .resource-controls select, .resource-font-form input, .resource-font-form select { border-color: rgb(255 255 255 / 0.12); background: rgb(24 24 27); color: white; }
  .resource-primary { background: white; color: rgb(9 9 11); }
}
</style>
