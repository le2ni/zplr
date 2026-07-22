<template>
  <section class="designer-root relative flex min-h-0 flex-1 overflow-hidden bg-zinc-100 dark:bg-zinc-900" aria-label="Visual label designer">
    <aside class="designer-toolbox hidden w-52 shrink-0 flex-col border-r border-zinc-200 bg-white lg:flex dark:border-white/10 dark:bg-zinc-950" aria-label="Add label elements">
      <div class="border-b border-zinc-200 px-3 py-3 dark:border-white/10">
        <h2 class="text-[11px] font-bold tracking-wide text-zinc-500 uppercase">Elements</h2>
        <p class="mt-1 text-[10px] leading-4 text-zinc-500">Drag onto the label or click to add at the center.</p>
      </div>
      <div class="grid grid-cols-2 gap-2 p-3">
        <button
          v-for="tool in tools"
          :key="tool.kind"
          class="designer-tool"
          type="button"
          draggable="true"
          :aria-label="`Add ${tool.name.toLowerCase()}`"
          :title="`Drag ${tool.name.toLowerCase()} onto the label`"
          @click="addToolAtCenter(tool.kind)"
          @dragstart="startToolDrag($event, tool.kind)"
          @dragend="toolDragActive = false"
        >
          <component :is="tool.icon" class="size-5" aria-hidden="true" />
          <span>{{ tool.name }}</span>
          <IconDrag class="absolute top-1.5 right-1 size-3 text-zinc-300 dark:text-zinc-700" aria-hidden="true" />
        </button>
      </div>
      <div class="mt-auto border-t border-zinc-200 p-3 text-[10px] leading-4 text-zinc-500 dark:border-white/10">
        <div class="flex items-start gap-2">
          <IconCursorMove class="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <span>Drag existing fields to reposition them. Use arrow keys for 1-dot nudges and Shift for 10 dots.</span>
        </div>
      </div>
    </aside>

    <div class="flex min-w-0 flex-1 flex-col">
      <header class="flex min-h-12 shrink-0 flex-wrap items-center gap-2 border-b border-zinc-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-zinc-950">
        <div class="min-w-0">
          <h2 class="flex items-center gap-1.5 truncate text-xs font-semibold text-zinc-900 dark:text-white">
            <IconVectorSquareEdit class="size-4 text-zinc-500" aria-hidden="true" />
            Designer
          </h2>
          <p v-if="label" class="truncate text-[10px] text-zinc-500">{{ filename }} · {{ label.width }} × {{ label.height }} dots</p>
          <p v-else class="truncate text-[10px] text-zinc-500">{{ filename }}</p>
        </div>

        <div v-if="labelCount > 1" class="ml-2 hidden items-center gap-1 overflow-x-auto sm:flex" aria-label="Designer labels">
          <button
            v-for="index in labelCount"
            :key="index"
            class="designer-label-tab"
            :class="{ active: activeLabelIndex === index - 1 }"
            type="button"
            @click="emit('update:activeLabelIndex', index - 1)"
          >Label {{ index }}</button>
        </div>

        <div class="ml-auto flex items-center gap-1">
          <label class="hidden items-center gap-1.5 text-[10px] text-zinc-500 sm:flex">
            Snap
            <select v-model.number="snapSize" class="designer-select" aria-label="Designer grid snap">
              <option :value="1">Off</option>
              <option :value="5">5 dots</option>
              <option :value="10">10 dots</option>
              <option :value="20">20 dots</option>
            </select>
          </label>
          <button class="designer-icon-button" :class="{ active: gridVisible }" type="button" title="Toggle grid" :aria-pressed="gridVisible" @click="gridVisible = !gridVisible">
            <IconGrid class="size-4" aria-hidden="true" /><span class="sr-only">Toggle grid</span>
          </button>
          <div class="ml-1 flex items-center rounded-md border border-zinc-200 dark:border-white/10">
            <button class="designer-zoom-button" type="button" title="Zoom out" @click="changeZoom(-10)"><IconMagnifyMinusOutline class="size-3.5" aria-hidden="true" /><span class="sr-only">Zoom out</span></button>
            <button class="min-w-12 border-x border-zinc-200 px-1.5 py-1 text-[10px] text-zinc-500 dark:border-white/10" type="button" title="Fit label" @click="fitLabel">{{ zoom === 100 ? "Fit" : `${zoom}%` }}</button>
            <button class="designer-zoom-button" type="button" title="Zoom in" @click="changeZoom(10)"><IconMagnifyPlusOutline class="size-3.5" aria-hidden="true" /><span class="sr-only">Zoom in</span></button>
          </div>
        </div>
      </header>

      <div class="flex h-12 shrink-0 items-center gap-2 overflow-x-auto border-b border-zinc-200 bg-white px-2 lg:hidden dark:border-white/10 dark:bg-zinc-950" aria-label="Add label elements">
        <button
          v-for="tool in tools"
          :key="tool.kind"
          class="designer-tool-compact"
          type="button"
          :aria-label="`Add ${tool.name.toLowerCase()}`"
          @click="addToolAtCenter(tool.kind)"
        >
          <component :is="tool.icon" class="size-4" aria-hidden="true" />
          {{ tool.name }}
        </button>
      </div>

      <div
        ref="viewport"
        class="designer-viewport relative min-h-0 flex-1 overflow-auto"
        @dragover="dragOverCanvas"
        @drop="dropOnCanvas"
      >
        <div class="flex min-h-full min-w-full items-center justify-center p-7 sm:p-10">
          <div
            v-if="label && previewUrl"
            ref="surface"
            class="designer-surface relative shrink-0 touch-none overflow-hidden bg-white shadow-2xl shadow-zinc-950/20 ring-1 ring-zinc-900/15 outline-none"
            :style="surfaceStyle"
            tabindex="0"
            aria-label="Editable rendered label. Select a field, then drag it or use the arrow keys to move it."
            data-testid="visual-label-canvas"
            @pointerdown.self="clearSelection"
            @keydown="handleCanvasKeydown"
          >
            <img :src="previewUrl" alt="Editable rendered ZPL label" class="pointer-events-none absolute inset-0 size-full select-none" draggable="false" />
            <div v-if="gridVisible" class="designer-grid pointer-events-none absolute inset-0" :style="gridStyle" aria-hidden="true"></div>
            <button
              v-for="field in fields"
              :key="field.id"
              class="designer-field absolute"
              :class="{ selected: isSelected(field), locked: !field.movable, dragging: isDragging(field) }"
              :style="fieldStyle(field)"
              type="button"
              :aria-label="`${visualFieldLabel(field.kind, field.region.type)} at ${Math.round(field.bounds.x)}, ${Math.round(field.bounds.y)}${field.movable ? '' : ', position locked'}`"
              :title="field.movable ? `Drag ${visualFieldLabel(field.kind, field.region.type).toLowerCase()} to move` : 'This field has no directly editable ^FO or ^FT origin'"
              :data-visual-kind="field.kind"
              @click.stop="selectField(field)"
              @pointerdown.stop="beginFieldDrag($event, field)"
            >
              <span class="sr-only">{{ visualFieldLabel(field.kind, field.region.type) }}</span>
            </button>
            <div
              v-if="selectedField?.origin"
              class="designer-origin-marker pointer-events-none absolute z-20"
              :style="originMarkerStyle"
              aria-hidden="true"
            ></div>
          </div>

          <div v-else-if="renderFailure" class="max-w-md rounded-xl border border-rose-200 bg-white p-4 text-sm text-rose-700 shadow-sm dark:border-rose-400/20 dark:bg-zinc-950 dark:text-rose-200">
            {{ renderFailure }}
          </div>
          <div v-else class="max-w-sm text-center text-xs leading-5 text-zinc-500">
            <IconVectorSquareEdit class="mx-auto mb-3 size-8 text-zinc-300 dark:text-zinc-700" aria-hidden="true" />
            Add a complete <code>^XA</code>…<code>^XZ</code> label to use the visual designer.
          </div>
        </div>

        <div v-if="rendering" class="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-zinc-100/50 backdrop-blur-[1px] dark:bg-zinc-900/50" role="status" aria-live="polite">
          <span class="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-500 shadow-sm dark:border-white/10 dark:bg-zinc-950">Updating designer…</span>
        </div>

        <div v-if="toolDragActive" class="pointer-events-none absolute inset-3 z-20 rounded-xl border-2 border-dashed border-blue-400 bg-blue-50/40 dark:bg-blue-400/5" aria-hidden="true">
          <span class="absolute top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3 py-1 text-[10px] font-semibold text-white shadow">Drop on the label</span>
        </div>
      </div>

      <footer class="flex h-9 shrink-0 items-center gap-2 border-t border-zinc-200 bg-white px-3 text-[10px] text-zinc-500 dark:border-white/10 dark:bg-zinc-950">
        <IconSelectionDrag class="size-3.5" aria-hidden="true" />
        <span v-if="selectedField">{{ visualFieldLabel(selectedField.kind, selectedField.region.type) }} selected<span v-if="selectedField.movable"> · drag or use arrow keys</span></span>
        <span v-else>{{ fields.length }} editable visual field{{ fields.length === 1 ? "" : "s" }}</span>
        <span class="ml-auto hidden sm:inline">Rendered locally · source stays authoritative</span>
      </footer>
    </div>

    <aside class="designer-inspector w-72 shrink-0 flex-col border-l border-zinc-200 bg-white dark:border-white/10 dark:bg-zinc-950" :class="{ 'has-selection': selectedField }" aria-label="Selected element properties">
      <div class="flex h-12 shrink-0 items-center border-b border-zinc-200 px-3 dark:border-white/10">
        <IconTuneVariant class="mr-2 size-4 text-zinc-500" aria-hidden="true" />
        <h2 class="text-xs font-semibold">Properties</h2>
        <button v-if="selectedField" class="designer-icon-button ml-auto lg:hidden" type="button" title="Close properties" @click="clearSelection"><IconClose class="size-4" aria-hidden="true" /><span class="sr-only">Close properties</span></button>
      </div>

      <div v-if="selectedField" class="min-h-0 flex-1 overflow-y-auto p-3">
        <div class="flex items-start gap-2">
          <div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 dark:bg-white/10 dark:text-zinc-300">
            <component :is="fieldIcon(selectedField)" class="size-5" aria-hidden="true" />
          </div>
          <div class="min-w-0">
            <h3 class="text-xs font-semibold text-zinc-900 dark:text-white">{{ visualFieldLabel(selectedField.kind, selectedField.region.type) }}</h3>
            <p class="mt-0.5 truncate font-mono text-[10px] text-zinc-500">{{ selectedField.origin?.command.canonical ?? "Rendered field" }}</p>
          </div>
        </div>

        <section class="designer-property-section">
          <h4>Position</h4>
          <div v-if="selectedField.origin" class="grid grid-cols-2 gap-2">
            <label class="designer-property-label">
              X <span>dots</span>
              <input :value="selectedPosition.x" type="number" min="0" :max="label?.width ?? 32000" step="1" @change="commitPosition('x', $event)" @keydown.stop />
            </label>
            <label class="designer-property-label">
              Y <span>dots</span>
              <input :value="selectedPosition.y" type="number" min="0" :max="label?.height ?? 32000" step="1" @change="commitPosition('y', $event)" @keydown.stop />
            </label>
          </div>
          <div v-else class="flex items-start gap-2 rounded-lg bg-amber-50 p-2 text-[10px] leading-4 text-amber-800 dark:bg-amber-400/10 dark:text-amber-200">
            <IconLockOutline class="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            This rendered field has no direct <code>^FO</code> or <code>^FT</code> origin to move safely.
          </div>
          <p class="mt-2 text-[10px] text-zinc-500">Rendered size: {{ Math.round(selectedField.bounds.width) }} × {{ Math.round(selectedField.bounds.height) }} dots</p>
        </section>

        <section v-if="selectedField.content" class="designer-property-section">
          <h4>Content</h4>
          <label class="sr-only" for="visual-field-content">Field content</label>
          <textarea
            id="visual-field-content"
            :value="selectedField.content.value"
            class="designer-content-input"
            rows="4"
            spellcheck="false"
            @blur="commitContent"
            @keydown.stop
          ></textarea>
          <p v-if="selectedField.content.prefix" class="mt-1 font-mono text-[9px] text-zinc-500">ZPL prefix {{ selectedField.content.prefix }} is preserved.</p>
        </section>

        <section class="designer-property-section">
          <h4>Source</h4>
          <button class="designer-secondary-action" type="button" @click="emit('selectSource', selectedField.sourceSpan)">
            <IconCodeTags class="size-4" aria-hidden="true" /> Reveal field in ZPL
          </button>
        </section>
      </div>

      <div v-else class="flex min-h-0 flex-1 flex-col items-center justify-center px-6 text-center text-[11px] leading-5 text-zinc-500">
        <IconSelection class="mb-3 size-8 text-zinc-300 dark:text-zinc-700" aria-hidden="true" />
        Select a field on the label to edit its position and content.
      </div>

      <div v-if="selectedField" class="grid shrink-0 grid-cols-2 gap-2 border-t border-zinc-200 p-3 dark:border-white/10">
        <button class="designer-secondary-action justify-center" type="button" :disabled="!selectedField.origin" @click="duplicateSelected">
          <IconContentCopy class="size-4" aria-hidden="true" /> Duplicate
        </button>
        <button class="designer-danger-action" type="button" @click="deleteSelected">
          <IconDeleteOutline class="size-4" aria-hidden="true" /> Delete
        </button>
      </div>
    </aside>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, type Component, type CSSProperties } from "vue";
import {
  IconBarcode,
  IconClose,
  IconCodeTags,
  IconContentCopy,
  IconCursorMove,
  IconDeleteOutline,
  IconDrag,
  IconFormatText,
  IconGrid,
  IconLockOutline,
  IconMagnifyMinusOutline,
  IconMagnifyPlusOutline,
  IconQrcode,
  IconSelection,
  IconSelectionDrag,
  IconShapeRectanglePlus,
  IconTuneVariant,
  IconVectorLine,
  IconVectorSquareEdit,
} from "@iconify-prerendered/vue-mdi";
import type { PrintDensity, RenderedLabel, SourceSpan } from "../../src/index.web";
import {
  collectVisualFields,
  sourceEditForContent,
  sourceEditForDelete,
  sourceEditForDuplicate,
  sourceEditForInsert,
  sourceEditForMove,
  visualFieldLabel,
  type SourceEdit,
  type VisualElementKind,
  type VisualField,
} from "../visualEditorSource";

const props = defineProps<{
  source: string;
  filename: string;
  label?: RenderedLabel<HTMLCanvasElement>;
  previewUrl?: string;
  rendering: boolean;
  renderFailure?: string;
  activeLabelIndex: number;
  labelCount: number;
  printDensity: PrintDensity;
}>();

const emit = defineEmits<{
  edit: [edit: SourceEdit];
  selectSource: [span: SourceSpan];
  "update:activeLabelIndex": [index: number];
}>();

const tools: readonly { kind: VisualElementKind; name: string; icon: Component }[] = [
  { kind: "text", name: "Text", icon: IconFormatText },
  { kind: "barcode", name: "Barcode", icon: IconBarcode },
  { kind: "qr", name: "QR code", icon: IconQrcode },
  { kind: "box", name: "Box", icon: IconShapeRectanglePlus },
  { kind: "line", name: "Line", icon: IconVectorLine },
];
const dragMime = "application/x-zplr-visual-element";

const viewport = ref<HTMLElement | null>(null);
const surface = ref<HTMLElement | null>(null);
const viewportWidth = ref(0);
const viewportHeight = ref(0);
const zoom = ref(100);
const snapSize = ref(10);
const gridVisible = ref(true);
const toolDragActive = ref(false);
const selectionAnchor = ref<number>();
const selectionKind = ref<VisualField["kind"]>();
const fields = computed(() => collectVisualFields(props.source, props.label?.highlightRegions ?? []));
const selectedField = computed(() => fields.value.find((field) =>
  (field.origin?.command.span.start ?? field.sourceSpan.start) === selectionAnchor.value &&
  field.kind === selectionKind.value
));
const selectedPosition = computed(() => ({
  x: Math.round(selectedField.value?.origin?.region.x ?? selectedField.value?.bounds.x ?? 0),
  y: Math.round(selectedField.value?.origin?.region.y ?? selectedField.value?.bounds.y ?? 0),
}));

const fitScale = computed(() => {
  if (!props.label || viewportWidth.value <= 0 || viewportHeight.value <= 0) return 1;
  const availableWidth = Math.max(80, viewportWidth.value - 80);
  const availableHeight = Math.max(80, viewportHeight.value - 80);
  return Math.max(0.04, Math.min(2, availableWidth / props.label.width, availableHeight / props.label.height));
});
const canvasScale = computed(() => fitScale.value * zoom.value / 100);
const surfaceStyle = computed<CSSProperties | undefined>(() => props.label ? {
  width: `${props.label.width * canvasScale.value}px`,
  height: `${props.label.height * canvasScale.value}px`,
} : undefined);
const gridStyle = computed<CSSProperties>(() => {
  const gridPixels = Math.max(3, snapSize.value * canvasScale.value);
  return { backgroundSize: `${gridPixels}px ${gridPixels}px` };
});

interface DragState {
  field: VisualField;
  startX: number;
  startY: number;
  deltaX: number;
  deltaY: number;
}

const dragState = ref<DragState>();
let resizeObserver: ResizeObserver | undefined;

function selectionOffset(field: VisualField): number {
  return field.origin?.command.span.start ?? field.sourceSpan.start;
}

function selectField(field: VisualField): void {
  selectionAnchor.value = selectionOffset(field);
  selectionKind.value = field.kind;
}

function clearSelection(): void {
  selectionAnchor.value = undefined;
  selectionKind.value = undefined;
}

function isSelected(field: VisualField): boolean {
  return selectedField.value?.id === field.id;
}

function isDragging(field: VisualField): boolean {
  return dragState.value?.field.id === field.id;
}

function snap(value: number): number {
  return snapSize.value <= 1 ? Math.round(value) : Math.round(value / snapSize.value) * snapSize.value;
}

function clamped(value: number, maximum: number): number {
  return Math.max(0, Math.min(maximum, value));
}

function fieldStyle(field: VisualField): CSSProperties {
  const offsetX = isDragging(field) ? dragState.value?.deltaX ?? 0 : 0;
  const offsetY = isDragging(field) ? dragState.value?.deltaY ?? 0 : 0;
  const rawWidth = Math.max(1, field.bounds.width * canvasScale.value);
  const rawHeight = Math.max(1, field.bounds.height * canvasScale.value);
  const width = Math.max(8, rawWidth);
  const height = Math.max(8, rawHeight);
  return {
    left: `${(field.bounds.x + offsetX) * canvasScale.value - (width - rawWidth) / 2}px`,
    top: `${(field.bounds.y + offsetY) * canvasScale.value - (height - rawHeight) / 2}px`,
    width: `${width}px`,
    height: `${height}px`,
    borderRadius: field.region.type === "circle" || field.region.type === "ellipse" ? "9999px" : undefined,
  };
}

const originMarkerStyle = computed<CSSProperties | undefined>(() => {
  const field = selectedField.value;
  if (!field?.origin) return undefined;
  const offsetX = isDragging(field) ? dragState.value?.deltaX ?? 0 : 0;
  const offsetY = isDragging(field) ? dragState.value?.deltaY ?? 0 : 0;
  return {
    left: `${(field.origin.region.x + offsetX) * canvasScale.value}px`,
    top: `${(field.origin.region.y + offsetY) * canvasScale.value}px`,
  };
});

function beginFieldDrag(event: PointerEvent, field: VisualField): void {
  selectField(field);
  if (!field.movable || event.button !== 0) return;
  event.preventDefault();
  dragState.value = { field, startX: event.clientX, startY: event.clientY, deltaX: 0, deltaY: 0 };
  window.addEventListener("pointermove", continueFieldDrag);
  window.addEventListener("pointerup", finishFieldDrag, { once: true });
  document.body.style.cursor = "grabbing";
  document.body.style.userSelect = "none";
}

function continueFieldDrag(event: PointerEvent): void {
  const state = dragState.value;
  if (!state || !props.label || !surface.value) return;
  event.preventDefault();
  const rect = surface.value.getBoundingClientRect();
  const rawX = (event.clientX - state.startX) / rect.width * props.label.width;
  const rawY = (event.clientY - state.startY) / rect.height * props.label.height;
  const originX = state.field.origin?.region.x ?? state.field.bounds.x;
  const originY = state.field.origin?.region.y ?? state.field.bounds.y;
  state.deltaX = clamped(snap(originX + rawX), props.label.width - 1) - originX;
  state.deltaY = clamped(snap(originY + rawY), props.label.height - 1) - originY;
}

function finishFieldDrag(): void {
  const state = dragState.value;
  window.removeEventListener("pointermove", continueFieldDrag);
  document.body.style.cursor = "";
  document.body.style.userSelect = "";
  dragState.value = undefined;
  if (!state?.field.origin || (state.deltaX === 0 && state.deltaY === 0)) return;
  const edit = sourceEditForMove(props.source, state.field.origin.command.span, state.deltaX, state.deltaY, props.printDensity);
  if (edit) emit("edit", edit);
}

function moveSelected(deltaX: number, deltaY: number): void {
  const field = selectedField.value;
  if (!field?.origin) return;
  const edit = sourceEditForMove(props.source, field.origin.command.span, deltaX, deltaY, props.printDensity);
  if (edit) emit("edit", edit);
}

function handleCanvasKeydown(event: KeyboardEvent): void {
  if (!selectedField.value) return;
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
    if (!selectedField.value.movable) return;
    event.preventDefault();
    const step = event.shiftKey ? 10 : 1;
    moveSelected(
      event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0,
      event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0,
    );
  } else if (event.key === "Delete" || event.key === "Backspace") {
    event.preventDefault();
    deleteSelected();
  } else if (event.key === "Escape") {
    event.preventDefault();
    clearSelection();
  } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "d") {
    event.preventDefault();
    duplicateSelected();
  }
}

function emitAndSelect(edit: SourceEdit, kind?: VisualField["kind"]): void {
  if (edit.selectOriginAt !== undefined) {
    selectionAnchor.value = edit.selectOriginAt;
    if (kind) selectionKind.value = kind;
  }
  emit("edit", edit);
}

function insertionKind(kind: VisualElementKind): VisualField["kind"] {
  if (kind === "line") return "graphic";
  return kind;
}

function addTool(kind: VisualElementKind, x: number, y: number): void {
  const edit = sourceEditForInsert(
    props.source,
    props.activeLabelIndex,
    kind,
    snap(x),
    snap(y),
    props.printDensity,
    props.label ? { width: props.label.width, height: props.label.height } : undefined,
  );
  if (edit) emitAndSelect(edit, insertionKind(kind));
}

function addToolAtCenter(kind: VisualElementKind): void {
  if (!props.label) return;
  addTool(kind, Math.max(0, props.label.width / 2 - 50), Math.max(0, props.label.height / 2 - 25));
}

function startToolDrag(event: DragEvent, kind: VisualElementKind): void {
  if (!event.dataTransfer) return;
  event.dataTransfer.setData(dragMime, kind);
  event.dataTransfer.effectAllowed = "copy";
  toolDragActive.value = true;
}

function dragOverCanvas(event: DragEvent): void {
  const transfer = event.dataTransfer;
  if (!transfer || !Array.from(transfer.types).includes(dragMime)) return;
  event.preventDefault();
  event.stopPropagation();
  transfer.dropEffect = "copy";
  toolDragActive.value = true;
}

function dropOnCanvas(event: DragEvent): void {
  const kind = event.dataTransfer?.getData(dragMime) as VisualElementKind | undefined;
  toolDragActive.value = false;
  if (!kind || !tools.some((tool) => tool.kind === kind) || !surface.value || !props.label) return;
  event.preventDefault();
  event.stopPropagation();
  const rect = surface.value.getBoundingClientRect();
  const x = clamped((event.clientX - rect.left) / rect.width * props.label.width, props.label.width - 1);
  const y = clamped((event.clientY - rect.top) / rect.height * props.label.height, props.label.height - 1);
  addTool(kind, x, y);
}

function commitPosition(axis: "x" | "y", event: Event): void {
  const input = event.currentTarget as HTMLInputElement;
  const field = selectedField.value;
  if (!field?.origin || !props.label) return;
  const requested = Number(input.value);
  if (!Number.isFinite(requested)) return;
  const target = clamped(Math.round(requested), axis === "x" ? props.label.width - 1 : props.label.height - 1);
  const edit = sourceEditForMove(
    props.source,
    field.origin.command.span,
    axis === "x" ? target - field.origin.region.x : 0,
    axis === "y" ? target - field.origin.region.y : 0,
    props.printDensity,
  );
  if (edit) emit("edit", edit);
}

function commitContent(event: Event): void {
  const field = selectedField.value;
  if (!field?.content) return;
  const value = (event.currentTarget as HTMLTextAreaElement).value.replace(/[\r\n]+/g, " ");
  if (value === field.content.value) return;
  const edit = sourceEditForContent(props.source, field.content, value);
  if (edit) emit("edit", edit);
}

function duplicateSelected(): void {
  const field = selectedField.value;
  if (!field) return;
  const edit = sourceEditForDuplicate(props.source, field, props.printDensity);
  if (edit) emitAndSelect(edit, field.kind);
}

function deleteSelected(): void {
  const field = selectedField.value;
  if (!field) return;
  const edit = sourceEditForDelete(props.source, field.sourceSpan);
  if (!edit) return;
  clearSelection();
  emit("edit", edit);
}

function fieldIcon(field: VisualField): Component {
  if (field.kind === "text") return IconFormatText;
  if (field.kind === "barcode") return IconBarcode;
  if (field.kind === "qr") return IconQrcode;
  if (field.kind === "graphic") return IconVectorLine;
  return IconShapeRectanglePlus;
}

function fitLabel(): void {
  zoom.value = 100;
}

function changeZoom(delta: number): void {
  zoom.value = Math.max(25, Math.min(250, zoom.value + delta));
}

function updateViewportSize(): void {
  viewportWidth.value = viewport.value?.clientWidth ?? 0;
  viewportHeight.value = viewport.value?.clientHeight ?? 0;
}

watch(() => [props.label?.width, props.label?.height], () => void nextTick(updateViewportSize));
watch(() => props.activeLabelIndex, clearSelection);

onMounted(() => {
  updateViewportSize();
  if (viewport.value) {
    resizeObserver = new ResizeObserver(updateViewportSize);
    resizeObserver.observe(viewport.value);
  }
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  window.removeEventListener("pointermove", continueFieldDrag);
  window.removeEventListener("pointerup", finishFieldDrag);
  document.body.style.cursor = "";
  document.body.style.userSelect = "";
});
</script>

<style scoped>
.designer-viewport {
  background-color: rgb(244 244 245);
  background-image: linear-gradient(rgb(24 24 27 / 0.035) 1px, transparent 1px), linear-gradient(90deg, rgb(24 24 27 / 0.035) 1px, transparent 1px);
  background-size: 20px 20px;
}

.designer-tool {
  position: relative;
  display: flex;
  min-height: 4.25rem;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  border: 1px solid rgb(228 228 231);
  border-radius: 0.65rem;
  color: rgb(82 82 91);
  font-size: 0.65rem;
  font-weight: 600;
  transition: border-color 150ms, background-color 150ms, color 150ms, transform 150ms;
}
.designer-tool:hover { border-color: rgb(161 161 170); background: rgb(250 250 250); color: rgb(24 24 27); transform: translateY(-1px); }
.designer-tool:active { cursor: grabbing; transform: translateY(0); }

.designer-tool-compact {
  display: inline-flex;
  height: 2rem;
  flex: 0 0 auto;
  align-items: center;
  gap: 0.35rem;
  border: 1px solid rgb(228 228 231);
  border-radius: 0.5rem;
  padding-inline: 0.55rem;
  color: rgb(82 82 91);
  font-size: 0.65rem;
  font-weight: 600;
}
.designer-tool-compact:hover { background: rgb(244 244 245); color: rgb(24 24 27); }

.designer-select {
  height: 1.75rem;
  border: 1px solid rgb(228 228 231);
  border-radius: 0.4rem;
  background: white;
  padding-inline: 0.35rem;
  color: rgb(82 82 91);
  font-size: 0.65rem;
}

.designer-icon-button, .designer-zoom-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.4rem;
  color: rgb(113 113 122);
}
.designer-icon-button { width: 1.8rem; height: 1.8rem; }
.designer-zoom-button { width: 1.75rem; height: 1.65rem; }
.designer-icon-button:hover, .designer-icon-button.active, .designer-zoom-button:hover { background: rgb(244 244 245); color: rgb(24 24 27); }

.designer-label-tab {
  border-radius: 0.35rem;
  padding: 0.25rem 0.55rem;
  color: rgb(113 113 122);
  font-size: 0.65rem;
}
.designer-label-tab.active { background: rgb(244 244 245); color: rgb(24 24 27); font-weight: 600; }

.designer-grid {
  z-index: 1;
  background-image: linear-gradient(rgb(37 99 235 / 0.12) 1px, transparent 1px), linear-gradient(90deg, rgb(37 99 235 / 0.12) 1px, transparent 1px);
}

.designer-field {
  z-index: 10;
  cursor: grab;
  border: 1px dashed transparent;
  background: transparent;
  transition: border-color 100ms, background-color 100ms, box-shadow 100ms;
}
.designer-field:hover { border-color: rgb(59 130 246 / 0.8); background: rgb(59 130 246 / 0.08); }
.designer-field.selected { z-index: 15; border: 2px solid rgb(37 99 235); background: rgb(59 130 246 / 0.1); box-shadow: 0 0 0 1px white, 0 2px 8px rgb(37 99 235 / 0.2); }
.designer-field.selected::before,
.designer-field.selected::after {
  content: "";
  position: absolute;
  width: 0.4rem;
  height: 0.4rem;
  border: 1px solid white;
  border-radius: 0.1rem;
  background: rgb(37 99 235);
}
.designer-field.selected::before { top: -0.3rem; left: -0.3rem; }
.designer-field.selected::after { right: -0.3rem; bottom: -0.3rem; }
.designer-field.dragging { cursor: grabbing; border-style: solid; background: rgb(59 130 246 / 0.16); transition: none; }
.designer-field.locked { cursor: pointer; }
.designer-field.locked.selected { border-color: rgb(245 158 11); background: rgb(245 158 11 / 0.09); box-shadow: 0 0 0 1px white; }

.designer-origin-marker {
  width: 0.55rem;
  height: 0.55rem;
  transform: translate(-50%, -50%);
  border: 2px solid white;
  border-radius: 9999px;
  background: rgb(37 99 235);
  box-shadow: 0 0 0 1px rgb(37 99 235), 0 1px 3px rgb(0 0 0 / 0.25);
}

.designer-inspector { display: none; }
.designer-inspector.has-selection {
  position: absolute;
  right: 0.75rem;
  bottom: 0.75rem;
  z-index: 40;
  display: flex;
  max-height: min(32rem, calc(100% - 1.5rem));
  overflow: hidden;
  border: 1px solid rgb(228 228 231);
  border-radius: 0.75rem;
  box-shadow: 0 20px 45px rgb(24 24 27 / 0.18);
}

.designer-property-section { margin-top: 1rem; border-top: 1px solid rgb(228 228 231); padding-top: 0.8rem; }
.designer-property-section h4 { margin-bottom: 0.55rem; color: rgb(113 113 122); font-size: 0.6rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }

.designer-property-label { color: rgb(82 82 91); font-size: 0.65rem; font-weight: 600; }
.designer-property-label > span { float: right; color: rgb(161 161 170); font-size: 0.55rem; font-weight: 400; }
.designer-property-label input {
  display: block;
  width: 100%;
  height: 2rem;
  margin-top: 0.3rem;
  border: 1px solid rgb(228 228 231);
  border-radius: 0.45rem;
  background: white;
  padding-inline: 0.5rem;
  color: rgb(39 39 42);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.7rem;
  outline: none;
}
.designer-property-label input:focus, .designer-content-input:focus { border-color: rgb(59 130 246); box-shadow: 0 0 0 2px rgb(59 130 246 / 0.12); }

.designer-content-input {
  width: 100%;
  resize: vertical;
  border: 1px solid rgb(228 228 231);
  border-radius: 0.5rem;
  background: white;
  padding: 0.5rem;
  color: rgb(39 39 42);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.68rem;
  line-height: 1rem;
  outline: none;
}

.designer-secondary-action, .designer-danger-action {
  display: inline-flex;
  width: 100%;
  min-height: 2rem;
  align-items: center;
  gap: 0.4rem;
  border-radius: 0.5rem;
  padding-inline: 0.65rem;
  font-size: 0.68rem;
  font-weight: 600;
}
.designer-secondary-action { border: 1px solid rgb(228 228 231); color: rgb(82 82 91); }
.designer-secondary-action:hover:not(:disabled) { background: rgb(244 244 245); color: rgb(24 24 27); }
.designer-secondary-action:disabled { cursor: not-allowed; opacity: 0.4; }
.designer-danger-action { justify-content: center; border: 1px solid rgb(254 205 211); color: rgb(190 18 60); }
.designer-danger-action:hover { background: rgb(255 241 242); }

.designer-tool:focus-visible,
.designer-tool-compact:focus-visible,
.designer-field:focus-visible,
.designer-icon-button:focus-visible,
.designer-zoom-button:focus-visible,
.designer-secondary-action:focus-visible,
.designer-danger-action:focus-visible {
  outline: 2px solid rgb(59 130 246);
  outline-offset: 2px;
}

@media (min-width: 1024px) {
  .designer-inspector,
  .designer-inspector.has-selection {
    position: static;
    z-index: auto;
    display: flex;
    max-height: none;
    overflow: visible;
    border-width: 0 0 0 1px;
    border-radius: 0;
    box-shadow: none;
  }
}

@media (max-width: 640px) {
  .designer-inspector.has-selection { right: 0.4rem; bottom: 0.4rem; width: calc(100% - 0.8rem); max-height: 55%; }
}

@media (prefers-color-scheme: dark) {
  .designer-viewport {
    background-color: rgb(24 24 27);
    background-image: linear-gradient(rgb(255 255 255 / 0.035) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255 / 0.035) 1px, transparent 1px);
  }
  .designer-tool, .designer-tool-compact, .designer-select { border-color: rgb(255 255 255 / 0.1); background: rgb(9 9 11); color: rgb(161 161 170); }
  .designer-tool:hover, .designer-tool-compact:hover { background: rgb(255 255 255 / 0.06); color: white; }
  .designer-icon-button:hover, .designer-icon-button.active, .designer-zoom-button:hover, .designer-label-tab.active { background: rgb(255 255 255 / 0.08); color: white; }
  .designer-inspector.has-selection { border-color: rgb(255 255 255 / 0.1); }
  .designer-property-section { border-color: rgb(255 255 255 / 0.1); }
  .designer-property-label input, .designer-content-input { border-color: rgb(255 255 255 / 0.1); background: rgb(24 24 27); color: rgb(244 244 245); }
  .designer-secondary-action { border-color: rgb(255 255 255 / 0.1); color: rgb(212 212 216); }
  .designer-secondary-action:hover:not(:disabled) { background: rgb(255 255 255 / 0.08); color: white; }
  .designer-danger-action { border-color: rgb(244 63 94 / 0.25); color: rgb(253 164 175); }
  .designer-danger-action:hover { background: rgb(244 63 94 / 0.1); }
}
</style>
