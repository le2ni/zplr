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
          <span>Drag fields to reposition them. Arrow keys move by the snap amount; Backspace deletes. Press ? for every shortcut.</span>
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
          <button class="designer-icon-button" :class="{ active: sidebarTab === 'layers' }" type="button" title="Open layers panel" :aria-pressed="sidebarTab === 'layers'" @click="openSidebar('layers')">
            <IconLayersOutline class="size-4" aria-hidden="true" /><span class="sr-only">Open layers panel</span>
          </button>
          <button class="designer-icon-button" type="button" title="Keyboard shortcuts" @click="openShortcuts">
            <IconKeyboardOutline class="size-4" aria-hidden="true" /><span class="sr-only">Keyboard shortcuts</span>
          </button>
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
        @pointerdown.self="clearSelection"
      >
        <div class="flex min-h-full min-w-full items-center justify-center p-7 sm:p-10" @pointerdown.self="clearSelection">
          <div
            v-if="label && previewUrl"
            ref="surface"
            class="designer-surface relative shrink-0 touch-none overflow-hidden bg-white shadow-2xl shadow-zinc-950/20 ring-1 ring-zinc-900/15 outline-none"
            :style="surfaceStyle"
            tabindex="0"
            aria-label="Editable rendered label. Select a field, then drag it or use keyboard shortcuts to edit it."
            data-testid="visual-label-canvas"
            @pointerdown.self="clearSelection"
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
              @click.stop="selectField(field, $event)"
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
        <span v-if="selectedField">{{ visualFieldLabel(selectedField.kind, selectedField.region.type) }} selected<span v-if="selectedField.movable"> · arrows move {{ snapSize }} dot{{ snapSize === 1 ? "" : "s" }}</span> · Backspace deletes</span>
        <span v-else>{{ fields.length }} editable visual field{{ fields.length === 1 ? "" : "s" }}</span>
        <span v-if="clipboardAnnouncement" class="ml-auto" role="status" aria-live="polite">{{ clipboardAnnouncement }}</span>
        <span v-else class="ml-auto hidden sm:inline">⌘C copy · ⌘V paste · ? shortcuts</span>
      </footer>
    </div>

    <aside class="designer-inspector w-72 shrink-0 flex-col border-l border-zinc-200 bg-white dark:border-white/10 dark:bg-zinc-950" :class="{ 'is-open': mobileSidebarOpen }" aria-label="Designer panels">
      <div class="designer-sidebar-tabs">
        <div class="flex items-center gap-0.5" role="tablist" aria-label="Designer side panels">
          <button class="designer-sidebar-tab" :class="{ active: sidebarTab === 'layers' }" type="button" role="tab" :aria-selected="sidebarTab === 'layers'" @click="sidebarTab = 'layers'">
            <IconLayersOutline class="size-4" aria-hidden="true" /> Layers
          </button>
          <button class="designer-sidebar-tab" :class="{ active: sidebarTab === 'properties' }" type="button" role="tab" :aria-selected="sidebarTab === 'properties'" @click="sidebarTab = 'properties'">
            <IconTuneVariant class="size-4" aria-hidden="true" /> Properties
          </button>
        </div>
        <button class="designer-icon-button ml-auto lg:hidden" type="button" title="Close designer panel" @click="mobileSidebarOpen = false">
          <IconClose class="size-4" aria-hidden="true" /><span class="sr-only">Close designer panel</span>
        </button>
      </div>

      <template v-if="sidebarTab === 'layers'">
        <div class="min-h-0 flex-1 overflow-y-auto" role="tabpanel" aria-label="Layers">
          <div class="border-b border-zinc-200 px-3 py-2.5 dark:border-white/10">
            <p class="text-[10px] leading-4 text-zinc-500">Top layers render last. Select a layer, then change its source-backed paint order.</p>
          </div>
          <ol v-if="layerFields.length" class="designer-layer-list" data-testid="visual-layers">
            <li v-for="(field, index) in layerFields" :key="field.id">
              <button
                class="designer-layer-row"
                :class="{ selected: isSelected(field) }"
                type="button"
                :aria-label="`Select ${layerName(field)} layer at ${Math.round(field.bounds.x)}, ${Math.round(field.bounds.y)}`"
                :aria-current="isSelected(field) ? 'true' : undefined"
                @click="selectLayer(field, $event)"
              >
                <span class="designer-layer-icon"><component :is="fieldIcon(field)" class="size-4" aria-hidden="true" /></span>
                <span class="min-w-0 flex-1 text-left">
                  <strong>{{ layerName(field) }}</strong>
                  <small>{{ layerDetails(field) }}</small>
                </span>
                <span class="designer-layer-index">{{ index === 0 ? "Top" : layerFields.length - index }}</span>
              </button>
            </li>
          </ol>
          <div v-else class="flex min-h-40 flex-col items-center justify-center px-6 text-center text-[11px] leading-5 text-zinc-500">
            <IconLayersOutline class="mb-3 size-8 text-zinc-300 dark:text-zinc-700" aria-hidden="true" />
            Rendered fields will appear here as layers.
          </div>
        </div>

        <div class="shrink-0 border-t border-zinc-200 p-3 dark:border-white/10">
          <div class="grid grid-cols-2 gap-2">
            <button class="designer-secondary-action justify-center" type="button" :disabled="!canBringForward" title="Bring forward (⌘/Ctrl + ])" @click="moveSelectedLayer('forward')">
              <IconArrowUp class="size-4" aria-hidden="true" /> Bring forward
            </button>
            <button class="designer-secondary-action justify-center" type="button" :disabled="!canSendBackward" title="Send backward (⌘/Ctrl + [)" @click="moveSelectedLayer('backward')">
              <IconArrowDown class="size-4" aria-hidden="true" /> Send backward
            </button>
          </div>
          <p class="mt-2 text-[9px] leading-4 text-zinc-500">Ordering is disabled across ZPL state commands to avoid changing field formatting.</p>
        </div>
      </template>

      <template v-else>
        <div v-if="selectedField" class="min-h-0 flex-1 overflow-y-auto p-3" role="tabpanel" aria-label="Properties">
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

        <div v-else class="flex min-h-0 flex-1 flex-col items-center justify-center px-6 text-center text-[11px] leading-5 text-zinc-500" role="tabpanel" aria-label="Properties">
          <IconSelection class="mb-3 size-8 text-zinc-300 dark:text-zinc-700" aria-hidden="true" />
          Select a field on the label or in Layers to edit its position and content.
        </div>

        <div v-if="selectedField" class="grid shrink-0 grid-cols-2 gap-2 border-t border-zinc-200 p-3 dark:border-white/10">
          <button class="designer-secondary-action justify-center" type="button" :disabled="!selectedField.origin" title="Duplicate (⌘/Ctrl + D)" @click="duplicateSelected">
            <IconContentCopy class="size-4" aria-hidden="true" /> Duplicate
          </button>
          <button class="designer-danger-action" type="button" title="Delete (Backspace)" @click="deleteSelected">
            <IconDeleteOutline class="size-4" aria-hidden="true" /> Delete
          </button>
        </div>
      </template>
    </aside>

    <div v-if="shortcutsOpen" class="designer-shortcuts-backdrop" @mousedown.self="closeShortcuts">
      <section class="designer-shortcuts-dialog" role="dialog" aria-modal="true" aria-labelledby="designer-shortcuts-title">
        <header class="flex h-12 items-center border-b border-zinc-200 px-4 dark:border-white/10">
          <IconKeyboardOutline class="mr-2 size-4 text-zinc-500" aria-hidden="true" />
          <h2 id="designer-shortcuts-title" class="text-sm font-semibold">Designer shortcuts</h2>
          <button ref="shortcutCloseButton" class="designer-icon-button ml-auto" type="button" title="Close shortcuts" @click="closeShortcuts">
            <IconClose class="size-4" aria-hidden="true" /><span class="sr-only">Close shortcuts</span>
          </button>
        </header>
        <div class="designer-shortcut-list">
          <div v-for="shortcut in shortcuts" :key="shortcut.action" class="designer-shortcut-row">
            <span>{{ shortcut.action }}</span>
            <span class="flex flex-wrap justify-end gap-1">
              <kbd v-for="key in shortcut.keys" :key="key">{{ key }}</kbd>
            </span>
          </div>
        </div>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, type Component, type CSSProperties } from "vue";
import {
  IconArrowDown,
  IconArrowUp,
  IconBarcode,
  IconClose,
  IconCodeTags,
  IconContentCopy,
  IconCursorMove,
  IconDeleteOutline,
  IconDrag,
  IconFormatText,
  IconGrid,
  IconKeyboardOutline,
  IconLayersOutline,
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
  sourceEditForLayerSwap,
  sourceEditForMove,
  sourceEditForPaste,
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
const visualClipboardMime = "application/x-zplr-visual-field";
const shortcuts: readonly { action: string; keys: readonly string[] }[] = [
  { action: "Move by snap amount", keys: ["Arrow keys"] },
  { action: "Move by 10 snap steps", keys: ["Shift", "Arrow keys"] },
  { action: "Copy selected layer", keys: ["⌘/Ctrl", "C"] },
  { action: "Paste copied layer", keys: ["⌘/Ctrl", "V"] },
  { action: "Delete selected layer", keys: ["Backspace / Delete"] },
  { action: "Duplicate selected layer", keys: ["⌘/Ctrl", "D"] },
  { action: "Bring layer forward", keys: ["⌘/Ctrl", "]"] },
  { action: "Send layer backward", keys: ["⌘/Ctrl", "["] },
  { action: "Deselect", keys: ["Esc"] },
  { action: "Toggle grid", keys: ["G"] },
  { action: "Fit label", keys: ["0"] },
  { action: "Zoom", keys: ["+ / −"] },
  { action: "Open this shortcut list", keys: ["?"] },
];

const viewport = ref<HTMLElement | null>(null);
const surface = ref<HTMLElement | null>(null);
const shortcutCloseButton = ref<HTMLButtonElement | null>(null);
const viewportWidth = ref(0);
const viewportHeight = ref(0);
const zoom = ref(100);
const snapSize = ref(10);
const gridVisible = ref(true);
const toolDragActive = ref(false);
const sidebarTab = ref<"layers" | "properties">("layers");
const mobileSidebarOpen = ref(false);
const shortcutsOpen = ref(false);
const clipboardAnnouncement = ref("");
const selectionAnchor = ref<number>();
const selectionKind = ref<VisualField["kind"]>();
const fields = computed(() => collectVisualFields(props.source, props.label?.highlightRegions ?? []));
const sourceOrderedFields = computed(() => [...fields.value].sort((left, right) => left.sourceSpan.start - right.sourceSpan.start));
const layerFields = computed(() => [...sourceOrderedFields.value].reverse());
const selectedField = computed(() => fields.value.find((field) =>
  (field.origin?.command.span.start ?? field.sourceSpan.start) === selectionAnchor.value &&
  field.kind === selectionKind.value
));
const selectedPosition = computed(() => ({
  x: Math.round(selectedField.value?.origin?.region.x ?? selectedField.value?.bounds.x ?? 0),
  y: Math.round(selectedField.value?.origin?.region.y ?? selectedField.value?.bounds.y ?? 0),
}));
const selectedSourceIndex = computed(() => selectedField.value
  ? sourceOrderedFields.value.findIndex((field) => field.id === selectedField.value?.id)
  : -1);
const forwardLayer = computed(() => sourceOrderedFields.value[selectedSourceIndex.value + 1]);
const backwardLayer = computed(() => sourceOrderedFields.value[selectedSourceIndex.value - 1]);
const canBringForward = computed(() => selectedField.value !== undefined && forwardLayer.value !== undefined &&
  sourceEditForLayerSwap(props.source, selectedField.value, forwardLayer.value) !== undefined);
const canSendBackward = computed(() => selectedField.value !== undefined && backwardLayer.value !== undefined &&
  sourceEditForLayerSwap(props.source, selectedField.value, backwardLayer.value) !== undefined);

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

interface VisualClipboardItem {
  source: string;
  field: VisualField;
  pasteCount: number;
}

const dragState = ref<DragState>();
let resizeObserver: ResizeObserver | undefined;
let shortcutReturnFocus: HTMLElement | null = null;
let pendingDesignerFocus: "selection" | "surface" | undefined;
let visualClipboard: VisualClipboardItem | undefined;
let clipboardAnnouncementTimer: number | undefined;

function selectionOffset(field: VisualField): number {
  return field.origin?.command.span.start ?? field.sourceSpan.start;
}

function focusInteractionTarget(event?: Event): void {
  if (event?.currentTarget instanceof HTMLElement) event.currentTarget.focus({ preventScroll: true });
}

function selectField(field: VisualField, event?: Event): void {
  selectionAnchor.value = selectionOffset(field);
  selectionKind.value = field.kind;
  sidebarTab.value = "properties";
  mobileSidebarOpen.value = true;
  focusInteractionTarget(event);
}

function selectLayer(field: VisualField, event?: Event): void {
  selectionAnchor.value = selectionOffset(field);
  selectionKind.value = field.kind;
  focusInteractionTarget(event);
}

function clearSelection(event?: Event): void {
  selectionAnchor.value = undefined;
  selectionKind.value = undefined;
  sidebarTab.value = "layers";
  if (event) void nextTick(() => surface.value?.focus({ preventScroll: true }));
}

function openSidebar(tab: "layers" | "properties"): void {
  sidebarTab.value = tab;
  mobileSidebarOpen.value = true;
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
  selectField(field, event);
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
  if (edit) {
    pendingDesignerFocus = "selection";
    emit("edit", edit);
  }
}

function moveSelected(deltaX: number, deltaY: number): void {
  const field = selectedField.value;
  if (!field?.origin) return;
  const edit = sourceEditForMove(props.source, field.origin.command.span, deltaX, deltaY, props.printDensity);
  if (edit) {
    pendingDesignerFocus = "selection";
    emit("edit", edit);
  }
}

function handledShortcut(event: KeyboardEvent): void {
  event.preventDefault();
  event.stopPropagation();
}

function isEditableTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (
    target.matches("input, textarea, select") ||
    target.isContentEditable
  );
}

function announceClipboard(message: string): void {
  clipboardAnnouncement.value = message;
  if (clipboardAnnouncementTimer !== undefined) window.clearTimeout(clipboardAnnouncementTimer);
  clipboardAnnouncementTimer = window.setTimeout(() => {
    clipboardAnnouncement.value = "";
    clipboardAnnouncementTimer = undefined;
  }, 1_800);
}

function validClipboardSpan(value: unknown, sourceLength: number): value is SourceSpan {
  if (!value || typeof value !== "object") return false;
  const span = value as Partial<SourceSpan>;
  return Number.isInteger(span.start) && Number.isInteger(span.end) &&
    span.start! >= 0 && span.end! > span.start! && span.end! <= sourceLength;
}

function parseVisualClipboard(raw: string): VisualClipboardItem | undefined {
  if (!raw || raw.length > 9_000_000) return undefined;
  try {
    const parsed = JSON.parse(raw) as { version?: unknown; source?: unknown; field?: Partial<VisualField> };
    if (parsed.version !== 1 || typeof parsed.source !== "string" || parsed.source.length > 8_000_000 || !parsed.field) return undefined;
    const field = parsed.field;
    const originSpan = field.origin?.command?.span;
    if (
      !validClipboardSpan(field.sourceSpan, parsed.source.length) ||
      !validClipboardSpan(originSpan, parsed.source.length) ||
      typeof field.kind !== "string" ||
      !["text", "barcode", "qr", "box", "circle", "ellipse", "graphic"].includes(field.kind)
    ) return undefined;
    return { source: parsed.source, field: field as VisualField, pasteCount: 0 };
  } catch {
    return undefined;
  }
}

function handleVisualCopy(event: ClipboardEvent): void {
  if (shortcutsOpen.value || isEditableTarget(event.target)) return;
  const field = selectedField.value;
  if (!field?.origin) return;
  visualClipboard = { source: props.source, field, pasteCount: 0 };
  const fieldSource = props.source.slice(field.sourceSpan.start, field.sourceSpan.end);
  if (event.clipboardData) {
    event.clipboardData.setData("text/plain", fieldSource);
    try {
      event.clipboardData.setData(visualClipboardMime, JSON.stringify({ version: 1, source: props.source, field }));
    } catch {
      // Some browsers only allow standard clipboard MIME types. The in-memory
      // clipboard still provides visual paste for the current Designer session.
    }
  }
  event.preventDefault();
  announceClipboard(`${visualFieldLabel(field.kind, field.region.type)} copied`);
}

function handleVisualPaste(event: ClipboardEvent): void {
  if (shortcutsOpen.value || isEditableTarget(event.target)) return;
  let item = visualClipboard;
  if (!item && event.clipboardData) item = parseVisualClipboard(event.clipboardData.getData(visualClipboardMime));
  if (!item) return;
  const pasteCount = item.pasteCount + 1;
  const edit = sourceEditForPaste(
    props.source,
    props.activeLabelIndex,
    item.source,
    item.field,
    props.printDensity,
    pasteCount * 20,
  );
  if (!edit) return;
  event.preventDefault();
  item.pasteCount = pasteCount;
  visualClipboard = item;
  emitAndSelect(edit, item.field.kind);
  announceClipboard(`${visualFieldLabel(item.field.kind, item.field.region?.type)} pasted`);
}

function handleDesignerKeydown(event: KeyboardEvent): void {
  if (event.isComposing) return;
  const helpKey = event.key === "?" || (event.shiftKey && (event.key === "/" || event.code === "Slash"));
  if (shortcutsOpen.value) {
    if (event.key === "Escape") {
      handledShortcut(event);
      closeShortcuts();
    } else if (helpKey) {
      handledShortcut(event);
      closeShortcuts();
    }
    return;
  }
  if (isEditableTarget(event.target)) return;

  const modifier = event.metaKey || event.ctrlKey;
  const selected = selectedField.value;
  if (modifier && event.key.toLowerCase() === "d" && selected) {
    handledShortcut(event);
    duplicateSelected();
  } else if (modifier && event.key === "]" && selected) {
    handledShortcut(event);
    moveSelectedLayer("forward");
  } else if (modifier && event.key === "[" && selected) {
    handledShortcut(event);
    moveSelectedLayer("backward");
  } else if (!modifier && !event.altKey && selected && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
    if (!selected.movable) return;
    handledShortcut(event);
    const step = snapSize.value * (event.shiftKey ? 10 : 1);
    moveSelected(
      event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0,
      event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0,
    );
  } else if (!modifier && selected && (event.key === "Delete" || event.key === "Backspace")) {
    handledShortcut(event);
    deleteSelected();
  } else if (!modifier && event.key === "Escape") {
    handledShortcut(event);
    clearSelection();
  } else if (!modifier && !event.altKey && event.key.toLowerCase() === "g") {
    handledShortcut(event);
    gridVisible.value = !gridVisible.value;
  } else if (!modifier && !event.altKey && event.key === "0") {
    handledShortcut(event);
    fitLabel();
  } else if (!modifier && !event.altKey && (event.key === "+" || event.key === "=")) {
    handledShortcut(event);
    changeZoom(10);
  } else if (!modifier && !event.altKey && (event.key === "-" || event.key === "_")) {
    handledShortcut(event);
    changeZoom(-10);
  } else if (!modifier && !event.altKey && helpKey) {
    handledShortcut(event);
    openShortcuts();
  }
}

function emitAndSelect(edit: SourceEdit, kind?: VisualField["kind"]): void {
  if (edit.selectOriginAt !== undefined) {
    selectionAnchor.value = edit.selectOriginAt;
    if (kind) selectionKind.value = kind;
  }
  pendingDesignerFocus = "selection";
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
  pendingDesignerFocus = "surface";
  clearSelection();
  emit("edit", edit);
}

function layerName(field: VisualField): string {
  const content = field.content?.value.trim();
  if (!content) return visualFieldLabel(field.kind, field.region.type);
  return content.length > 28 ? `${content.slice(0, 27)}…` : content;
}

function layerDetails(field: VisualField): string {
  const type = visualFieldLabel(field.kind, field.region.type);
  return `${type} · ${Math.round(field.bounds.x)}, ${Math.round(field.bounds.y)}`;
}

function moveSelectedLayer(direction: "forward" | "backward"): void {
  const field = selectedField.value;
  const adjacent = direction === "forward" ? forwardLayer.value : backwardLayer.value;
  if (!field || !adjacent) return;
  const edit = sourceEditForLayerSwap(props.source, field, adjacent);
  if (edit) emitAndSelect(edit, field.kind);
}

function openShortcuts(): void {
  shortcutReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  shortcutsOpen.value = true;
  void nextTick(() => shortcutCloseButton.value?.focus());
}

function closeShortcuts(): void {
  shortcutsOpen.value = false;
  const returnFocus = shortcutReturnFocus;
  shortcutReturnFocus = null;
  void nextTick(() => returnFocus?.focus());
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

function restoreDesignerFocus(): void {
  if (!pendingDesignerFocus || props.rendering) return;
  void nextTick(() => {
    const target = pendingDesignerFocus === "selection"
      ? surface.value?.querySelector<HTMLElement>(".designer-field.selected")
      : surface.value;
    if (!target) return;
    pendingDesignerFocus = undefined;
    target.focus({ preventScroll: true });
  });
}

watch(() => [props.label?.width, props.label?.height], () => void nextTick(updateViewportSize));
watch(() => props.activeLabelIndex, () => clearSelection());
watch([selectedField, () => props.rendering], restoreDesignerFocus);

onMounted(() => {
  updateViewportSize();
  window.addEventListener("keydown", handleDesignerKeydown);
  window.addEventListener("copy", handleVisualCopy);
  window.addEventListener("paste", handleVisualPaste);
  if (viewport.value) {
    resizeObserver = new ResizeObserver(updateViewportSize);
    resizeObserver.observe(viewport.value);
  }
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  window.removeEventListener("keydown", handleDesignerKeydown);
  window.removeEventListener("copy", handleVisualCopy);
  window.removeEventListener("paste", handleVisualPaste);
  if (clipboardAnnouncementTimer !== undefined) window.clearTimeout(clipboardAnnouncementTimer);
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
.designer-inspector.is-open {
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

.designer-sidebar-tabs {
  display: flex;
  height: 3rem;
  flex: 0 0 auto;
  align-items: center;
  gap: 0.2rem;
  border-bottom: 1px solid rgb(228 228 231);
  padding-inline: 0.5rem;
}

.designer-sidebar-tab {
  display: inline-flex;
  height: 2rem;
  align-items: center;
  gap: 0.35rem;
  border-radius: 0.45rem;
  padding-inline: 0.55rem;
  color: rgb(113 113 122);
  font-size: 0.68rem;
  font-weight: 600;
}
.designer-sidebar-tab:hover { color: rgb(39 39 42); }
.designer-sidebar-tab.active { background: rgb(244 244 245); color: rgb(24 24 27); }

.designer-layer-list { padding: 0.4rem; }
.designer-layer-list > li + li { margin-top: 0.2rem; }
.designer-layer-row {
  display: flex;
  width: 100%;
  min-height: 3.25rem;
  align-items: center;
  gap: 0.55rem;
  border: 1px solid transparent;
  border-radius: 0.55rem;
  padding: 0.4rem 0.45rem;
  color: rgb(82 82 91);
}
.designer-layer-row:hover { background: rgb(244 244 245); color: rgb(24 24 27); }
.designer-layer-row.selected { border-color: rgb(191 219 254); background: rgb(239 246 255); color: rgb(30 64 175); }
.designer-layer-icon {
  display: inline-flex;
  width: 2rem;
  height: 2rem;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: 0.45rem;
  background: rgb(244 244 245);
  color: rgb(82 82 91);
}
.designer-layer-row.selected .designer-layer-icon { background: white; color: rgb(37 99 235); }
.designer-layer-row strong { display: block; overflow: hidden; text-overflow: ellipsis; color: inherit; font-size: 0.68rem; line-height: 1rem; white-space: nowrap; }
.designer-layer-row small { display: block; overflow: hidden; text-overflow: ellipsis; color: rgb(113 113 122); font-size: 0.58rem; line-height: 0.9rem; white-space: nowrap; }
.designer-layer-index { flex: 0 0 auto; color: rgb(113 113 122); font-size: 0.55rem; font-weight: 600; text-transform: uppercase; }

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

.designer-shortcuts-backdrop {
  position: absolute;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgb(24 24 27 / 0.28);
  padding: 1rem;
  backdrop-filter: blur(2px);
}
.designer-shortcuts-dialog {
  width: min(27rem, 100%);
  overflow: hidden;
  border: 1px solid rgb(228 228 231);
  border-radius: 0.8rem;
  background: white;
  box-shadow: 0 24px 60px rgb(24 24 27 / 0.25);
}
.designer-shortcut-list { padding: 0.55rem 1rem 0.8rem; }
.designer-shortcut-row {
  display: flex;
  min-height: 2.25rem;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border-bottom: 1px solid rgb(244 244 245);
  color: rgb(82 82 91);
  font-size: 0.7rem;
}
.designer-shortcut-row:last-child { border-bottom: 0; }
.designer-shortcut-row kbd {
  min-width: 1.55rem;
  border: 1px solid rgb(212 212 216);
  border-bottom-width: 2px;
  border-radius: 0.35rem;
  background: rgb(250 250 250);
  padding: 0.16rem 0.35rem;
  color: rgb(63 63 70);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.6rem;
  text-align: center;
}

.designer-tool:focus-visible,
.designer-tool-compact:focus-visible,
.designer-field:focus-visible,
.designer-layer-row:focus-visible,
.designer-sidebar-tab:focus-visible,
.designer-icon-button:focus-visible,
.designer-zoom-button:focus-visible,
.designer-secondary-action:focus-visible,
.designer-danger-action:focus-visible {
  outline: 2px solid rgb(59 130 246);
  outline-offset: 2px;
}

@media (min-width: 1024px) {
  .designer-inspector,
  .designer-inspector.is-open {
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
  .designer-inspector.is-open { right: 0.4rem; bottom: 0.4rem; width: calc(100% - 0.8rem); max-height: 65%; }
}

@media (prefers-color-scheme: dark) {
  .designer-viewport {
    background-color: rgb(24 24 27);
    background-image: linear-gradient(rgb(255 255 255 / 0.035) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255 / 0.035) 1px, transparent 1px);
  }
  .designer-tool, .designer-tool-compact, .designer-select { border-color: rgb(255 255 255 / 0.1); background: rgb(9 9 11); color: rgb(161 161 170); }
  .designer-tool:hover, .designer-tool-compact:hover { background: rgb(255 255 255 / 0.06); color: white; }
  .designer-icon-button:hover, .designer-icon-button.active, .designer-zoom-button:hover, .designer-label-tab.active { background: rgb(255 255 255 / 0.08); color: white; }
  .designer-inspector.is-open { border-color: rgb(255 255 255 / 0.1); }
  .designer-sidebar-tabs { border-color: rgb(255 255 255 / 0.1); }
  .designer-sidebar-tab:hover { color: white; }
  .designer-sidebar-tab.active { background: rgb(255 255 255 / 0.08); color: white; }
  .designer-layer-row:hover { background: rgb(255 255 255 / 0.06); color: white; }
  .designer-layer-row.selected { border-color: rgb(59 130 246 / 0.35); background: rgb(59 130 246 / 0.12); color: rgb(147 197 253); }
  .designer-layer-icon { background: rgb(255 255 255 / 0.06); color: rgb(161 161 170); }
  .designer-layer-row.selected .designer-layer-icon { background: rgb(59 130 246 / 0.15); color: rgb(147 197 253); }
  .designer-layer-row small, .designer-layer-index { color: rgb(161 161 170); }
  .designer-property-section { border-color: rgb(255 255 255 / 0.1); }
  .designer-property-label input, .designer-content-input { border-color: rgb(255 255 255 / 0.1); background: rgb(24 24 27); color: rgb(244 244 245); }
  .designer-secondary-action { border-color: rgb(255 255 255 / 0.1); color: rgb(212 212 216); }
  .designer-secondary-action:hover:not(:disabled) { background: rgb(255 255 255 / 0.08); color: white; }
  .designer-danger-action { border-color: rgb(244 63 94 / 0.25); color: rgb(253 164 175); }
  .designer-danger-action:hover { background: rgb(244 63 94 / 0.1); }
  .designer-shortcuts-dialog { border-color: rgb(255 255 255 / 0.1); background: rgb(9 9 11); }
  .designer-shortcut-row { border-color: rgb(255 255 255 / 0.06); color: rgb(212 212 216); }
  .designer-shortcut-row kbd { border-color: rgb(255 255 255 / 0.16); background: rgb(255 255 255 / 0.06); color: rgb(228 228 231); }
}
</style>
