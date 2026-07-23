<template>
  <section
    class="designer-root relative flex min-h-0 flex-1 overflow-hidden bg-zinc-100 dark:bg-zinc-900"
    :class="{ embedded }"
    aria-label="WYSIWYG label editor"
    @pointerdown.capture="captureInlineDataDoublePress"
  >
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
            WYSIWYG
            <span v-if="stale" class="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-medium text-amber-700 dark:bg-amber-400/15 dark:text-amber-300">Out of date</span>
          </h2>
          <p v-if="label" class="truncate text-[10px] text-zinc-500">{{ filename }} · {{ label.width }} × {{ label.height }} dots · {{ dpi }} dpi</p>
          <p v-else class="truncate text-[10px] text-zinc-500">{{ filename }}</p>
        </div>

        <div v-if="labelCount > 1" class="ml-2 hidden items-center gap-1 overflow-x-auto sm:flex" aria-label="WYSIWYG labels">
          <button
            v-for="index in labelCount"
            :key="index"
            class="designer-label-tab"
            :class="{ active: activeLabelIndex === index - 1 }"
            type="button"
            @click="emit('update:activeLabelIndex', index - 1)"
          >Label {{ index }}</button>
        </div>

        <div class="ml-auto flex min-w-0 max-w-full flex-wrap items-center justify-end gap-1">
          <button v-if="stale" class="designer-icon-button" type="button" title="Render updated source" @click="emit('render')">
            <IconRefresh class="size-4" aria-hidden="true" /><span class="sr-only">Render updated source</span>
          </button>
          <button v-if="labelCount > 1" class="designer-icon-button" type="button" title="Download all labels as ZIP" @click="emit('downloadAllPngs')">
            <IconDownloadMultipleOutline class="size-4" aria-hidden="true" /><span class="sr-only">Download all labels as ZIP</span>
          </button>
          <button class="designer-icon-button" type="button" :disabled="!label" title="Download PNG" @click="emit('downloadPng')">
            <IconDownloadOutline class="size-4" aria-hidden="true" /><span class="sr-only">Download PNG</span>
          </button>
          <label class="hidden items-center gap-1.5 text-[10px] text-zinc-500 sm:flex">
            Snap
            <span class="designer-select-wrap">
              <select v-model.number="snapSize" class="designer-select" aria-label="WYSIWYG grid snap">
                <option :value="1">Off</option>
                <option :value="5">5 dots</option>
                <option :value="10">10 dots</option>
                <option :value="20">20 dots</option>
              </select>
              <IconChevronDown class="designer-select-chevron" aria-hidden="true" />
            </span>
          </label>
          <details v-if="selectedFields.length" class="designer-arrange relative">
            <summary class="designer-icon-button w-auto! gap-1 px-2!" :title="`Arrange ${selectedFields.length} selected layer${selectedFields.length === 1 ? '' : 's'}`">
              <IconSelectionDrag class="size-4" aria-hidden="true" />
              <span class="hidden text-[10px] sm:inline">Arrange</span>
            </summary>
            <div class="designer-arrange-popover">
              <div class="flex items-center justify-between gap-3 border-b border-zinc-100 pb-2 dark:border-white/10">
                <strong>{{ selectedFields.length }} selected</strong>
                <label class="flex items-center gap-1.5 text-[10px] font-normal"><input v-model="alignToLabel" type="checkbox" /> Align to label</label>
              </div>
              <div class="mt-2 grid grid-cols-3 gap-1" aria-label="Alignment actions">
                <button type="button" :disabled="!allSelectedMovable" @click="arrangeSelection('left')">Left</button>
                <button type="button" :disabled="!allSelectedMovable" @click="arrangeSelection('center')">Center</button>
                <button type="button" :disabled="!allSelectedMovable" @click="arrangeSelection('right')">Right</button>
                <button type="button" :disabled="!allSelectedMovable" @click="arrangeSelection('top')">Top</button>
                <button type="button" :disabled="!allSelectedMovable" @click="arrangeSelection('middle')">Middle</button>
                <button type="button" :disabled="!allSelectedMovable" @click="arrangeSelection('bottom')">Bottom</button>
              </div>
              <div class="mt-2 grid grid-cols-2 gap-1">
                <button type="button" :disabled="selectedFields.length < 3 || !allSelectedMovable" @click="distributeSelection('horizontal')">Equal horizontal gaps</button>
                <button type="button" :disabled="selectedFields.length < 3 || !allSelectedMovable" @click="distributeSelection('vertical')">Equal vertical gaps</button>
              </div>
              <div class="mt-2 grid grid-cols-2 gap-1 border-t border-zinc-100 pt-2 dark:border-white/10">
                <button type="button" @click="toggleSelectedLock">{{ selectedFields.every((field) => field.locked) ? 'Unlock' : 'Lock' }}</button>
                <button type="button" :disabled="selectedFields.some((field) => field.locked)" @click="hideSelectedFields">Hide from output</button>
              </div>
            </div>
          </details>
          <details class="designer-arrange relative">
            <summary class="designer-icon-button" title="Snapping, rulers and guides">
              <IconTuneVariant class="size-4" aria-hidden="true" /><span class="sr-only">Snapping, rulers and guides</span>
            </summary>
            <div class="designer-arrange-popover designer-snap-popover">
              <strong>Canvas aids</strong>
              <label><input v-model="objectSnapEnabled" type="checkbox" /> Object snapping</label>
              <label><input v-model="rulersVisible" type="checkbox" /> Rulers</label>
              <label><input v-model="gridVisible" type="checkbox" /> Grid</label>
              <div v-if="manualGuides.length" class="mt-2 border-t border-zinc-100 pt-2 dark:border-white/10">
                <div v-for="guide in manualGuides" :key="guide.id" class="flex items-center gap-1">
                  <span class="min-w-0 flex-1">{{ guide.axis === 'x' ? 'Vertical' : 'Horizontal' }} {{ Math.round(guide.position) }}</span>
                  <button type="button" @click="removeManualGuide(guide.id)">Remove</button>
                </div>
              </div>
            </div>
          </details>
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
            <button class="min-w-12 border-x border-zinc-200 px-1.5 py-1 text-[10px] text-zinc-500 dark:border-white/10" type="button" title="Fit label" @click="fitLabel">{{ zoomLabel }}</button>
            <button class="designer-zoom-button" type="button" title="Zoom in" @click="changeZoom(10)"><IconMagnifyPlusOutline class="size-3.5" aria-hidden="true" /><span class="sr-only">Zoom in</span></button>
          </div>
        </div>
      </header>

      <div class="designer-compact-tools flex h-12 shrink-0 items-center gap-2 overflow-x-auto border-b border-zinc-200 bg-white px-2 dark:border-white/10 dark:bg-zinc-950" aria-label="Add label elements">
        <button
          v-for="tool in tools"
          :key="tool.kind"
          class="designer-tool-compact"
          type="button"
          draggable="true"
          :aria-label="`Add ${tool.name.toLowerCase()}`"
          :title="`Drag ${tool.name.toLowerCase()} onto the label`"
          @click="addToolAtCenter(tool.kind)"
          @dragstart="startToolDrag($event, tool.kind)"
          @dragend="toolDragActive = false"
        >
          <component :is="tool.icon" class="size-4" aria-hidden="true" />
          {{ tool.name }}
        </button>
      </div>

      <div
        ref="viewport"
        class="designer-viewport relative min-h-0 flex-1 overflow-auto"
        title="Two-finger scroll to pan; pinch or Ctrl/⌘ + scroll to zoom"
        @dragover="dragOverCanvas"
        @drop="dropOnCanvas"
        @wheel="handleViewportWheel"
        @pointerdown.self="clearSelection"
      >
        <div class="designer-canvas-stage flex min-h-full min-w-full items-center justify-center p-7 sm:p-10" @pointerdown.self="clearSelection">
          <div
            v-if="label && previewUrl"
            ref="surface"
            class="designer-surface relative shrink-0 touch-none overflow-hidden bg-white shadow-2xl shadow-zinc-950/20 ring-1 ring-zinc-900/15 outline-none"
            :style="surfaceStyle"
            tabindex="0"
            aria-label="Editable rendered label. Select a field, then drag it or use keyboard shortcuts to edit it."
            data-testid="visual-label-canvas"
            @pointerdown.self="beginMarquee"
          >
            <img :src="previewUrl" alt="Editable rendered ZPL label" class="pointer-events-none absolute inset-0 size-full select-none" draggable="false" />
            <div v-if="gridVisible" class="designer-grid pointer-events-none absolute inset-0" :style="gridStyle" aria-hidden="true"></div>
            <div
              v-for="guide in manualGuides"
              :key="guide.id"
              class="designer-manual-guide absolute z-20"
              :class="guide.axis === 'x' ? 'vertical' : 'horizontal'"
              :style="guideLineStyle(guide.axis, guide.position)"
              role="separator"
              :aria-label="`${guide.axis === 'x' ? 'Vertical' : 'Horizontal'} guide at ${Math.round(guide.position)} dots`"
              tabindex="0"
              @pointerdown.stop="beginGuideDrag($event, guide.id)"
              @dblclick.stop="removeManualGuide(guide.id)"
              @keydown.delete.prevent="removeManualGuide(guide.id)"
              @keydown.backspace.prevent="removeManualGuide(guide.id)"
            ></div>
            <div
              v-for="(guide, index) in activeSmartGuides"
              :key="`${guide.axis}-${guide.position}-${index}`"
              class="designer-smart-guide pointer-events-none absolute z-20"
              :class="[guide.axis === 'x' ? 'vertical' : 'horizontal', `kind-${guide.kind}`]"
              :data-snap-kind="guide.kind"
              :style="guideLineStyle(guide.axis, guide.position)"
              aria-hidden="true"
            ></div>
            <div v-if="marqueeStyle" class="designer-marquee pointer-events-none absolute z-30" :style="marqueeStyle" aria-hidden="true"></div>
            <div v-if="groupSelectionStyle" class="designer-group-selection pointer-events-none absolute z-20" :style="groupSelectionStyle" aria-hidden="true"></div>
            <div v-if="rulersVisible" class="designer-ruler designer-ruler-x absolute top-0 right-0 left-0 z-30" aria-label="Horizontal ruler" @dblclick="addGuideFromRuler($event, 'x')">
              <span v-for="tick in rulerXTicks" :key="tick" :style="rulerTickStyle('x', tick)"><small>{{ tick }}</small></span>
            </div>
            <div v-if="rulersVisible" class="designer-ruler designer-ruler-y absolute top-0 bottom-0 left-0 z-30" aria-label="Vertical ruler" @dblclick="addGuideFromRuler($event, 'y')">
              <span v-for="tick in rulerYTicks" :key="tick" :style="rulerTickStyle('y', tick)"><small>{{ tick }}</small></span>
            </div>
            <div
              v-for="field in fields"
              :key="field.id"
              class="designer-field absolute"
              :class="{ selected: isSelected(field), locked: field.locked || !field.movable, dragging: isDragging(field), resizing: isResizing(field), editing: isInlineEditing(field) }"
              :style="fieldStyle(field)"
              :role="isInlineEditing(field) ? undefined : 'button'"
              :tabindex="isInlineEditing(field) ? -1 : 0"
              :aria-label="isInlineEditing(field) ? undefined : `${visualFieldLabel(field.kind, field.region.type)} at ${Math.round(field.bounds.x)}, ${Math.round(field.bounds.y)}${field.locked || !field.movable ? ', position locked' : ''}`"
              :title="fieldTitle(field)"
              :data-visual-kind="field.kind"
              :data-field-id="field.id"
              @click.stop="finishFieldClick($event, field)"
              @dblclick.stop="beginInlineEdit(field, $event)"
              @pointermove="updateFieldCursor($event, field)"
              @pointerleave="resetFieldCursor"
              @pointerdown.stop="beginFieldInteraction($event, field)"
              @keydown.space.prevent.stop="selectField(field, $event)"
            >
              <input
                v-if="isInlineEditing(field) && field.kind !== 'text'"
                class="designer-inline-control designer-inline-data-editor"
                :style="inlineDataEditorStyle(field)"
                :value="inlineEdit?.value ?? ''"
                type="text"
                :aria-label="inlineDataEditorLabel(field)"
                autocomplete="off"
                spellcheck="false"
                @input="updateInlineText"
                @keydown="handleInlineTextKeydown"
                @select="syncInlineSelection"
                @click.stop
                @pointerdown.stop
                @pointermove.stop
                @dblclick.stop
                @blur="finishInlineEdit"
              />
              <span
                v-else-if="isInlineEditing(field)"
                class="designer-inline-control designer-inline-editor"
                :class="{ 'uses-rendered-caret': hasRenderedCaret(field) }"
                :style="inlineEditorStyle(field)"
                contenteditable="plaintext-only"
                role="textbox"
                aria-label="Edit text inline"
                spellcheck="false"
                @input="updateInlineText"
                @keydown="handleInlineTextKeydown"
                @click.stop="placeInlineCaret($event, field)"
                @pointerdown.stop
                @pointermove.stop
                @dblclick.stop
                @blur="finishInlineEdit"
              ></span>
              <span v-else class="sr-only">{{ visualFieldLabel(field.kind, field.region.type) }}</span>
            </div>
            <span
              v-if="inlineCaretStyle"
              class="designer-inline-caret"
              :style="inlineCaretStyle"
              :data-caret-offset="inlineEdit?.selectionStart"
              data-testid="inline-caret"
              aria-hidden="true"
            ></span>
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
            Add a complete <code>^XA</code>…<code>^XZ</code> label to use the WYSIWYG editor.
          </div>
        </div>

        <div v-if="showRenderLoading" class="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-zinc-100/50 backdrop-blur-[1px] dark:bg-zinc-900/50" role="status" aria-live="polite">
          <span class="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-500 shadow-sm dark:border-white/10 dark:bg-zinc-950">Updating WYSIWYG…</span>
        </div>

        <div v-if="toolDragActive" class="pointer-events-none absolute inset-3 z-20 rounded-xl border-2 border-dashed border-blue-400 bg-blue-50/40 dark:bg-blue-400/5" aria-hidden="true">
          <span class="absolute top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3 py-1 text-[10px] font-semibold text-white shadow">Drop on the label</span>
        </div>
      </div>

      <footer class="flex h-9 shrink-0 items-center gap-2 border-t border-zinc-200 bg-white px-3 text-[10px] text-zinc-500 dark:border-white/10 dark:bg-zinc-950">
        <IconSelectionDrag class="size-3.5" aria-hidden="true" />
        <span v-if="selectedField"><template v-if="selectedFields.length > 1">{{ selectedFields.length }} layers selected</template><template v-else>{{ visualFieldLabel(selectedField.kind, selectedField.region.type) }} selected</template><span v-if="allSelectedMovable"> · arrows move {{ snapSize }} dot{{ snapSize === 1 ? "" : "s" }}</span><span v-if="selectedFields.some((field) => field.locked)"> · locked</span><span v-else> · Backspace deletes</span></span>
        <span v-else>{{ fields.length }} editable visual field{{ fields.length === 1 ? "" : "s" }}</span>
        <span v-if="clipboardAnnouncement" class="ml-auto" role="status" aria-live="polite">{{ clipboardAnnouncement }}</span>
        <span v-else class="ml-auto hidden sm:inline">⌘C copy · ⌘V paste · ? shortcuts</span>
      </footer>
    </div>

    <aside class="designer-inspector w-72 shrink-0 flex-col border-l border-zinc-200 bg-white dark:border-white/10 dark:bg-zinc-950" :class="{ 'is-open': mobileSidebarOpen }" aria-label="WYSIWYG panels">
      <div class="designer-sidebar-tabs">
        <div class="flex items-center gap-0.5" role="tablist" aria-label="WYSIWYG side panels">
          <button class="designer-sidebar-tab" :class="{ active: sidebarTab === 'layers' }" type="button" role="tab" :aria-selected="sidebarTab === 'layers'" @click="sidebarTab = 'layers'">
            <IconLayersOutline class="size-4" aria-hidden="true" /> Layers
          </button>
          <button class="designer-sidebar-tab" :class="{ active: sidebarTab === 'properties' }" type="button" role="tab" :aria-selected="sidebarTab === 'properties'" @click="sidebarTab = 'properties'">
            <IconTuneVariant class="size-4" aria-hidden="true" /> Properties
          </button>
        </div>
        <button class="designer-panel-close designer-icon-button ml-auto" type="button" title="Close WYSIWYG panel" @click="mobileSidebarOpen = false">
          <IconClose class="size-4" aria-hidden="true" /><span class="sr-only">Close WYSIWYG panel</span>
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
                <IconLockOutline v-if="field.locked" class="size-3.5 shrink-0 text-amber-500" aria-label="Locked" />
                <span class="designer-layer-index">{{ index === 0 ? "Top" : layerFields.length - index }}</span>
              </button>
            </li>
          </ol>
          <div v-else class="flex min-h-40 flex-col items-center justify-center px-6 text-center text-[11px] leading-5 text-zinc-500">
            <IconLayersOutline class="mb-3 size-8 text-zinc-300 dark:text-zinc-700" aria-hidden="true" />
            Rendered fields will appear here as layers.
          </div>
          <section v-if="hiddenFields.length" class="designer-hidden-layers" aria-label="Hidden layers">
            <h3>Hidden from output</h3>
            <div v-for="field in hiddenFields" :key="field.id" class="designer-hidden-row">
              <span class="designer-layer-icon"><component :is="fieldIcon(field)" class="size-4" aria-hidden="true" /></span>
              <span class="min-w-0 flex-1">
                <strong>{{ visualFieldLabel(field.kind, field.bounds.width === field.bounds.height ? 'circle' : 'box') }}</strong>
                <small>{{ Math.round(field.bounds.x) }}, {{ Math.round(field.bounds.y) }}</small>
              </span>
              <button type="button" @click="unhideField(field)">Show</button>
            </div>
          </section>
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
          <div v-if="selectedFields.length" class="mt-2 grid grid-cols-2 gap-2">
            <button class="designer-secondary-action justify-center" type="button" @click="toggleSelectedLock">
              <IconLockOutline class="size-4" aria-hidden="true" /> {{ selectedFields.every((field) => field.locked) ? "Unlock" : "Lock" }}
            </button>
            <button class="designer-secondary-action justify-center" type="button" :disabled="selectedFields.some((field) => field.locked)" @click="hideSelectedFields">Hide</button>
          </div>
          <p class="mt-2 text-[9px] leading-4 text-zinc-500">Ordering is disabled across ZPL state commands to avoid changing field formatting.</p>
        </div>
      </template>

      <template v-else>
        <div v-if="selectedField" class="min-h-0 flex-1 overflow-y-auto p-3" role="tabpanel" aria-label="Properties">
          <div v-if="selectedFields.length > 1" class="mb-3 rounded-lg border border-blue-200 bg-blue-50 p-2 text-[10px] leading-4 text-blue-800 dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-200">
            {{ selectedFields.length }} layers selected. Position and content below apply to the primary layer; Arrange applies to the full selection.
          </div>
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
            <h4>{{ selectedFieldNumber ? "Fallback content" : "Content" }}</h4>
            <label class="sr-only" for="visual-field-content">Field content</label>
            <textarea
              id="visual-field-content"
              :value="selectedField.content.value"
              class="designer-content-input"
              rows="4"
              spellcheck="false"
              @input="commitContent"
              @keydown.stop
            ></textarea>
            <p v-if="selectedField.content.prefix" class="mt-1 font-mono text-[9px] text-zinc-500">ZPL prefix {{ selectedField.content.prefix }} is preserved.</p>
            <p v-if="selectedFieldNumber" class="mt-1 text-[9px] leading-4 text-zinc-500">Used when record <code>^FN{{ selectedFieldNumber }}</code> has no override.</p>
          </section>

          <section class="designer-property-section">
            <div class="flex items-center justify-between gap-2">
              <h4 class="mb-0!">Variable data</h4>
              <button class="text-[9px] font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-300" type="button" @click="emit('openDataManager')">Manage data</button>
            </div>
            <label class="designer-property-control mt-2" for="visual-data-binding">
              <span>Field binding</span>
              <select id="visual-data-binding" :value="selectedFieldNumber ?? ''" @change="commitDataBinding" @keydown.stop>
                <option value="">Not variable</option>
                <option v-for="column in variableColumns" :key="column.id" :value="column.fieldNumber">^FN{{ column.fieldNumber }} · {{ column.name }}</option>
                <option v-if="selectedFieldNumber && !selectedVariableColumn" :value="selectedFieldNumber">^FN{{ selectedFieldNumber }} · Missing column</option>
              </select>
            </label>
            <template v-if="selectedFieldNumber">
              <label class="designer-property-control mt-3" for="visual-record-value">
                <span>{{ activeRecordLabel || "Active record" }} value</span>
                <textarea
                  id="visual-record-value"
                  class="designer-content-input mt-1"
                  rows="3"
                  :value="selectedRecordValue"
                  :disabled="!selectedVariableColumn"
                  @input="commitRecordValue"
                  @keydown.stop
                ></textarea>
              </label>
              <p v-if="!selectedVariableColumn" class="designer-property-note text-amber-700! dark:text-amber-300!">This ZPL field is bound, but the active dataset has no matching column.</p>
              <p v-else class="designer-property-note">Inline edits update the active record; the source fallback remains unchanged.</p>
            </template>
            <p v-else-if="!variableColumns.length" class="designer-property-note">Create or import a dataset, then bind this layer to one of its columns.</p>
          </section>

          <section v-if="selectedBarcodeCommand" class="designer-property-section">
            <h4>Barcode</h4>
            <label class="designer-property-control" for="visual-barcode-type">
              <span>Barcode type</span>
              <select
                id="visual-barcode-type"
                :value="selectedBarcodeCommand.canonical"
                title="Choose a barcode symbology. Command parameters reset to its documented defaults."
                @change="commitBarcodeType"
                @keydown.stop
              >
                <option v-for="barcodeType in visualBarcodeTypes" :key="barcodeType.canonical" :value="barcodeType.canonical">
                  {{ barcodeType.title }} ({{ barcodeType.canonical }})
                </option>
              </select>
            </label>
            <p class="designer-property-note">Changing the symbology resets its command-specific fields to the documented defaults. Field data is preserved.</p>
          </section>

          <section
            v-for="group in propertyGroups"
            :key="group.id"
            class="designer-property-section designer-command-properties"
            :aria-labelledby="`${group.id}-title`"
          >
            <div class="designer-command-header">
              <div class="min-w-0">
                <h4 :id="`${group.id}-title`">{{ group.definition.title }}</h4>
                <code>{{ group.command.canonical }}</code>
              </div>
              <a
                class="designer-doc-link"
                :href="group.definition.reference"
                target="_blank"
                rel="noreferrer"
                :aria-label="`Open official documentation for ${group.definition.title}`"
                title="Open official Zebra documentation"
              ><IconOpenInNew class="size-3.5" aria-hidden="true" /></a>
            </div>
            <p class="designer-command-summary">{{ group.definition.summary }}</p>

            <div class="designer-property-controls">
              <div v-for="property in group.parameters" :key="property.id" class="designer-property-control">
                <label :for="property.id">
                  <span>{{ property.label }}</span>
                  <small aria-hidden="true">{{ property.definition.required ? "Required" : property.definition.key }}</small>
                </label>
                <select
                  v-if="property.inputKind === 'select'"
                  :id="property.id"
                  :value="property.value"
                  :required="property.definition.required"
                  :aria-describedby="`${property.id}-help`"
                  :title="property.definition.documentation"
                  @change="commitVisualProperty(property, $event)"
                  @keydown.stop
                >
                  <option v-if="!property.definition.required" value="">Default / inherited</option>
                  <option v-for="option in property.options" :key="option" :value="option">{{ option }}</option>
                </select>
                <input
                  v-else
                  :id="property.id"
                  :value="property.value"
                  :type="property.inputKind"
                  :min="property.min"
                  :max="property.max"
                  :step="property.step"
                  :required="property.definition.required"
                  :placeholder="property.definition.required ? 'Required' : 'Default / inherited'"
                  :list="property.inputKind === 'text' && property.suggestions.length ? `${property.id}-choices` : undefined"
                  :aria-describedby="`${property.id}-help`"
                  :title="property.definition.documentation"
                  @change="commitVisualProperty(property, $event)"
                  @keydown.stop
                />
                <datalist v-if="property.inputKind === 'text' && property.suggestions.length" :id="`${property.id}-choices`">
                  <option v-for="choice in property.suggestions" :key="choice" :value="choice"></option>
                </datalist>
                <details class="designer-property-help">
                  <summary><IconInformationOutline class="size-3.5" aria-hidden="true" /> Parameter info</summary>
                  <p :id="`${property.id}-help`">{{ property.definition.documentation }}</p>
                </details>
              </div>
            </div>
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
          <button class="designer-secondary-action justify-center" type="button" :disabled="selectedFields.some((field) => !field.origin || field.locked)" title="Duplicate (⌘/Ctrl + D)" @click="duplicateSelected">
            <IconContentCopy class="size-4" aria-hidden="true" /> Duplicate
          </button>
          <button class="designer-danger-action" type="button" :disabled="selectedFields.some((field) => field.locked)" title="Delete (Backspace)" @click="deleteSelected">
            <IconDeleteOutline class="size-4" aria-hidden="true" /> Delete
          </button>
        </div>
      </template>
    </aside>

    <div v-if="shortcutsOpen" class="designer-shortcuts-backdrop" @mousedown.self="closeShortcuts">
      <section class="designer-shortcuts-dialog" role="dialog" aria-modal="true" aria-labelledby="designer-shortcuts-title">
        <header class="flex h-12 items-center border-b border-zinc-200 px-4 dark:border-white/10">
          <IconKeyboardOutline class="mr-2 size-4 text-zinc-500" aria-hidden="true" />
          <h2 id="designer-shortcuts-title" class="text-sm font-semibold">WYSIWYG shortcuts</h2>
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
  IconChevronDown,
  IconClose,
  IconCodeTags,
  IconContentCopy,
  IconCursorMove,
  IconDeleteOutline,
  IconDownloadMultipleOutline,
  IconDownloadOutline,
  IconDrag,
  IconFormatText,
  IconGrid,
  IconInformationOutline,
  IconKeyboardOutline,
  IconLayersOutline,
  IconLockOutline,
  IconMagnifyMinusOutline,
  IconMagnifyPlusOutline,
  IconOpenInNew,
  IconQrcode,
  IconRefresh,
  IconSelection,
  IconSelectionDrag,
  IconShapeRectanglePlus,
  IconTuneVariant,
  IconVectorLine,
  IconVectorSquareEdit,
} from "@iconify-prerendered/vue-mdi";
import type { PrintDensity, RenderedLabel, SourceSpan, TextCaretStop } from "../../src/index.web";
import {
  collectVisualFields,
  sourceEditForContent,
  sourceEditForInsert,
  sourceEditForLayerSwap,
  sourceEditForMove,
  sourceEditForPasteFields,
  sourceEditForResize,
  sourceTransactionForDeleteFields,
  sourceEditTransaction,
  sourceOffsetAfterEdits,
  visualResizeMode,
  visualFieldLabel,
  type SourceChange,
  type VisualElementKind,
  type VisualField,
  type VisualBounds,
} from "../visualEditorSource";
import {
  snapMovingBounds,
  sourceTransactionForAlignment,
  sourceTransactionForDistribution,
  sourceTransactionForMoveFields,
  unionVisualBounds,
  type ManualGuide,
  type SnapGuide,
  type VisualAlignment,
} from "../visualEditorLayout";
import {
  collectHiddenVisualFields,
  sourceEditForFieldLock,
  sourceEditForUnhideField,
  sourceTransactionForHideFields,
  type HiddenVisualField,
} from "../zplrFieldMetadata";
import {
  sourceEditForBarcodeType,
  sourceEditForVisualProperty,
  visualBarcodeCommand,
  visualBarcodeTypes,
  visualPropertyGroups,
  type VisualPropertyParameter,
} from "../visualEditorProperties";
import {
  fieldNumberForVisualField,
  sourceEditForVariableBinding,
  type VariableColumn,
} from "../variableData";

const props = defineProps<{
  source: string;
  filename: string;
  label?: RenderedLabel<HTMLCanvasElement>;
  previewUrl?: string;
  rendering: boolean;
  showRenderLoading?: boolean;
  renderFailure?: string;
  activeLabelIndex: number;
  labelCount: number;
  printDensity: PrintDensity;
  selectedSourceOffset?: number;
  sourceSelectionActive?: boolean;
  stale?: boolean;
  embedded?: boolean;
  variableColumns?: readonly VariableColumn[];
  fieldValues?: Readonly<Record<string, string>>;
  activeRecordLabel?: string;
  guides?: readonly ManualGuide[];
}>();

const emit = defineEmits<{
  edit: [edit: SourceChange];
  selectSource: [span: SourceSpan];
  syncSourceSelection: [span?: SourceSpan];
  render: [];
  downloadPng: [];
  downloadAllPngs: [];
  updateFieldValue: [fieldNumber: string, value: string];
  openDataManager: [];
  "update:guides": [guides: ManualGuide[]];
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
  { action: "Select multiple layers", keys: ["Shift / ⌘", "Click"] },
  { action: "Select every layer", keys: ["⌘/Ctrl", "A"] },
  { action: "Move by snap amount", keys: ["Arrow keys"] },
  { action: "Move by 10 snap steps", keys: ["Shift", "Arrow keys"] },
  { action: "Edit selected field data inline", keys: ["Enter / double-click"] },
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
  { action: "Pan canvas", keys: ["Two-finger scroll"] },
  { action: "Zoom around pointer", keys: ["Pinch / Ctrl/⌘ + scroll"] },
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
const objectSnapEnabled = ref(true);
const rulersVisible = ref(true);
const alignToLabel = ref(false);
const toolDragActive = ref(false);
const sidebarTab = ref<"layers" | "properties">("layers");
const mobileSidebarOpen = ref(false);
const shortcutsOpen = ref(false);
const clipboardAnnouncement = ref("");
const visualSelectionOwnsFocus = ref(false);
interface SelectionKey {
  anchor: number;
  kind: VisualField["kind"];
}
const selectionKeys = ref<SelectionKey[]>([]);
const primarySelectionKey = ref<SelectionKey>();
const manualGuides = ref<ManualGuide[]>([]);
const activeSmartGuides = ref<readonly SnapGuide[]>([]);
const fields = computed(() => collectVisualFields(props.source, props.label?.highlightRegions ?? []));
const hiddenFields = computed(() => collectHiddenVisualFields(props.source)
  .filter((field) => field.labelIndex === props.activeLabelIndex));
const sourceOrderedFields = computed(() => [...fields.value].sort((left, right) => left.sourceSpan.start - right.sourceSpan.start));
const layerFields = computed(() => [...sourceOrderedFields.value].reverse());
const selectedFields = computed(() => selectionKeys.value.flatMap((key) => {
  const field = fields.value.find((candidate) => selectionOffset(candidate) === key.anchor && candidate.kind === key.kind);
  return field ? [field] : [];
}));
const selectedField = computed(() => {
  const primary = primarySelectionKey.value;
  return (primary && selectedFields.value.find((field) =>
    selectionOffset(field) === primary.anchor && field.kind === primary.kind)) ?? selectedFields.value.at(-1);
});
const selectionBounds = computed(() => unionVisualBounds(selectedFields.value));
const allSelectedMovable = computed(() => selectedFields.value.length > 0 &&
  selectedFields.value.every((field) => field.movable && !field.locked));
const propertyGroups = computed(() => visualPropertyGroups(selectedField.value));
const selectedBarcodeCommand = computed(() => visualBarcodeCommand(selectedField.value));
const variableColumns = computed(() => props.variableColumns ?? []);
const selectedFieldNumber = computed(() => fieldNumberForVisualField(selectedField.value));
const selectedVariableColumn = computed(() => {
  const fieldNumber = selectedFieldNumber.value;
  return fieldNumber ? variableColumns.value.find((column) => normalizedFieldNumber(column.fieldNumber) === fieldNumber) : undefined;
});
const selectedRecordValue = computed(() => selectedFieldNumber.value ? props.fieldValues?.[selectedFieldNumber.value] ?? "" : "");
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
const dpi = computed(() => ({ 6: 150, 8: 203, 12: 300, 24: 600 })[props.printDensity]);

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
const rulerStep = computed(() => {
  const candidates = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1_000, 2_000, 5_000];
  return candidates.find((candidate) => candidate * canvasScale.value >= 42) ?? 10_000;
});
const rulerXTicks = computed(() => rulerTicks(props.label?.width ?? 0));
const rulerYTicks = computed(() => rulerTicks(props.label?.height ?? 0));
const zoomLabel = computed(() => zoom.value === 100 ? "Fit" : `${Math.round(zoom.value)}%`);

interface DragState {
  fields: readonly VisualField[];
  bounds: VisualBounds;
  startX: number;
  startY: number;
  deltaX: number;
  deltaY: number;
}

type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

interface ResizeState {
  field: VisualField;
  handle: ResizeHandle;
  startX: number;
  startY: number;
  bounds: VisualBounds;
}

interface InlineEditState {
  fieldId: string;
  commandStart: number;
  command: "^FD" | "^FV";
  prefix: string;
  originalValue: string;
  value: string;
  fieldNumber?: string;
  selectionStart: number;
  selectionEnd: number;
}

interface MarqueeState {
  startClientX: number;
  startClientY: number;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  additive: boolean;
}

interface GuideDragState {
  id: string;
  axis: "x" | "y";
}

interface VisualClipboardItem {
  source: string;
  fields: readonly VisualField[];
  primaryFieldId?: string;
  pasteCount: number;
}

const dragState = ref<DragState>();
const resizeState = ref<ResizeState>();
const inlineEdit = ref<InlineEditState>();
const marqueeState = ref<MarqueeState>();
const guideDragState = ref<GuideDragState>();
let resizeObserver: ResizeObserver | undefined;
let shortcutReturnFocus: HTMLElement | null = null;
let pendingDesignerFocus: "selection" | "surface" | undefined;
let visualClipboard: VisualClipboardItem | undefined;
let clipboardAnnouncementTimer: number | undefined;
let guideSequence = 0;
let pressedFieldId: string | undefined;
let pressedFieldResetTimer: number | undefined;
let pendingDataDoublePress: { fieldId: string; clientX: number; clientY: number; at: number } | undefined;
let pendingInlineOpenTimer: number | undefined;

function selectionOffset(field: VisualField): number {
  return field.origin?.command.span.start ?? field.sourceSpan.start;
}

function selectionKey(field: VisualField): SelectionKey {
  return { anchor: selectionOffset(field), kind: field.kind };
}

function sameSelection(left: SelectionKey, right: SelectionKey): boolean {
  return left.anchor === right.anchor && left.kind === right.kind;
}

function hasSelection(field: VisualField): boolean {
  const key = selectionKey(field);
  return selectionKeys.value.some((candidate) => sameSelection(candidate, key));
}

function focusInteractionTarget(event?: Event): void {
  if (event?.currentTarget instanceof HTMLElement) event.currentTarget.focus({ preventScroll: true });
}

function selectField(field: VisualField, event?: Event, preserveExisting = false): void {
  visualSelectionOwnsFocus.value = true;
  const key = selectionKey(field);
  const mouse = event instanceof MouseEvent ? event : undefined;
  const toggle = Boolean(mouse?.shiftKey || mouse?.metaKey || mouse?.ctrlKey);
  const existingIndex = selectionKeys.value.findIndex((candidate) => sameSelection(candidate, key));
  if (toggle) {
    if (existingIndex >= 0) selectionKeys.value = selectionKeys.value.filter((_, index) => index !== existingIndex);
    else selectionKeys.value = [...selectionKeys.value, key];
  } else if (!(preserveExisting && existingIndex >= 0) && !(existingIndex >= 0 && selectionKeys.value.length > 1)) {
    selectionKeys.value = [key];
  }
  if (selectionKeys.value.some((candidate) => sameSelection(candidate, key))) primarySelectionKey.value = key;
  else primarySelectionKey.value = selectionKeys.value.at(-1);
  sidebarTab.value = "properties";
  mobileSidebarOpen.value = true;
  if (primarySelectionKey.value) emit("syncSourceSelection", field.sourceSpan);
  else emit("syncSourceSelection", undefined);
  focusInteractionTarget(event);
}

function selectLayer(field: VisualField, event?: Event): void {
  selectField(field, event, true);
  sidebarTab.value = "layers";
}

function clearSelection(event?: Event, syncSource = true): void {
  visualSelectionOwnsFocus.value = true;
  selectionKeys.value = [];
  primarySelectionKey.value = undefined;
  sidebarTab.value = "layers";
  // Transfer focus before Monaco's selection is collapsed. Waiting until the
  // next tick lets its still-focused cursor briefly become authoritative and
  // reselect a stale visual field.
  if (event) surface.value?.focus({ preventScroll: true });
  if (syncSource) emit("syncSourceSelection", undefined);
}

function syncSelectionFromSource(): void {
  if (!props.sourceSelectionActive || visualSelectionOwnsFocus.value) return;
  const offset = props.selectedSourceOffset;
  if (offset === undefined) return;
  const field = fields.value
    .filter(({ sourceSpan }) => offset >= sourceSpan.start && offset <= sourceSpan.end)
    .sort((left, right) =>
      (left.sourceSpan.end - left.sourceSpan.start) - (right.sourceSpan.end - right.sourceSpan.start)
    )[0];
  if (!field) {
    clearSelection(undefined, false);
    // This deselection came from Monaco, so the next source cursor movement
    // must remain authoritative. Marking it as a visual deselection would
    // make later source clicks unable to select their rendered field.
    visualSelectionOwnsFocus.value = false;
    return;
  }
  const key = selectionKey(field);
  selectionKeys.value = [key];
  primarySelectionKey.value = key;
}

function openSidebar(tab: "layers" | "properties"): void {
  sidebarTab.value = tab;
  mobileSidebarOpen.value = true;
}

function isSelected(field: VisualField): boolean {
  return hasSelection(field);
}

function isDragging(field: VisualField): boolean {
  return dragState.value?.fields.some((candidate) => candidate.id === field.id) ?? false;
}

function isResizing(field: VisualField): boolean {
  return resizeState.value?.field.id === field.id;
}

function isInlineEditing(field: VisualField): boolean {
  return inlineEdit.value?.fieldId === field.id;
}

function fieldTitle(field: VisualField): string {
  const move = field.locked
    ? "This layer is locked"
    : field.movable
    ? `Drag ${visualFieldLabel(field.kind, field.region.type).toLowerCase()} to move`
    : "This field has no directly editable ^FO or ^FT origin";
  const resize = visualResizeMode(field) ? " · resize from an edge or corner" : "";
  if (!field.content) return `${move}${resize}`;
  const dataType = field.kind === "text" ? "text" : "field data";
  return `Double-click to edit ${dataType} · ${move}${resize}`;
}

function inlineDataEditorLabel(field: VisualField): string {
  return `Edit ${visualFieldLabel(field.kind, field.region.type).toLowerCase()} data inline`;
}

function snap(value: number): number {
  return snapSize.value <= 1 ? Math.round(value) : Math.round(value / snapSize.value) * snapSize.value;
}

function clamped(value: number, maximum: number): number {
  return Math.max(0, Math.min(maximum, value));
}

function visualBoundsFor(field: VisualField): VisualBounds {
  if (isResizing(field)) return resizeState.value!.bounds;
  const offsetX = isDragging(field) ? dragState.value?.deltaX ?? 0 : 0;
  const offsetY = isDragging(field) ? dragState.value?.deltaY ?? 0 : 0;
  return { ...field.bounds, x: field.bounds.x + offsetX, y: field.bounds.y + offsetY };
}

function boundsStyle(bounds: VisualBounds, rounded = false): CSSProperties {
  const rawWidth = Math.max(1, bounds.width * canvasScale.value);
  const rawHeight = Math.max(1, bounds.height * canvasScale.value);
  const width = Math.max(8, rawWidth);
  const height = Math.max(8, rawHeight);
  return {
    left: `${bounds.x * canvasScale.value - (width - rawWidth) / 2}px`,
    top: `${bounds.y * canvasScale.value - (height - rawHeight) / 2}px`,
    width: `${width}px`,
    height: `${height}px`,
    borderRadius: rounded ? "9999px" : undefined,
  };
}

const marqueeStyle = computed<CSSProperties | undefined>(() => {
  const state = marqueeState.value;
  if (!state) return undefined;
  return boundsStyle({
    x: Math.min(state.startX, state.currentX),
    y: Math.min(state.startY, state.currentY),
    width: Math.abs(state.currentX - state.startX),
    height: Math.abs(state.currentY - state.startY),
  });
});

const groupSelectionStyle = computed<CSSProperties | undefined>(() => {
  if (selectedFields.value.length < 2 || !selectionBounds.value) return undefined;
  const bounds = dragState.value?.bounds && dragState.value.fields.length > 1
    ? {
        ...dragState.value.bounds,
        x: dragState.value.bounds.x + dragState.value.deltaX,
        y: dragState.value.bounds.y + dragState.value.deltaY,
      }
    : selectionBounds.value;
  return boundsStyle(bounds);
});

function fieldStyle(field: VisualField): CSSProperties {
  const style = boundsStyle(visualBoundsFor(field), field.region.type === "circle" || field.region.type === "ellipse");
  const labelArea = Math.max(1, (props.label?.width ?? 1) * (props.label?.height ?? 1));
  const fieldArea = Math.max(1, field.bounds.width * field.bounds.height);
  // Large background boxes often contain every other field. Give smaller hit
  // regions a higher stacking priority so their real geometry remains
  // selectable instead of being intercepted by a full-label box overlay.
  const hitPriority = 10 + Math.round((1 - Math.min(1, fieldArea / labelArea)) * 50);
  return { ...style, zIndex: isSelected(field) ? 1_000 : hitPriority };
}

function inlineEditorStyle(field: VisualField): CSSProperties {
  const height = Math.max(8, field.bounds.height * canvasScale.value);
  return {
    fontSize: `${Math.max(11, Math.min(48, height * 0.68))}px`,
  };
}

function inlineDataEditorStyle(field: VisualField): CSSProperties {
  const label = props.label;
  const state = inlineEdit.value;
  if (!label || !state) return {};
  const bounds = visualBoundsFor(field);
  const rawFieldWidth = Math.max(1, bounds.width * canvasScale.value);
  const rawFieldHeight = Math.max(1, bounds.height * canvasScale.value);
  const fieldWidth = Math.max(8, rawFieldWidth);
  const fieldHeight = Math.max(8, rawFieldHeight);
  const fieldLeft = bounds.x * canvasScale.value - (fieldWidth - rawFieldWidth) / 2;
  const fieldTop = bounds.y * canvasScale.value - (fieldHeight - rawFieldHeight) / 2;
  const surfaceWidth = label.width * canvasScale.value;
  const surfaceHeight = label.height * canvasScale.value;
  const contentWidth = Math.min(360, Math.max(160, state.value.length * 8 + 24));
  const width = Math.min(Math.max(80, surfaceWidth - 16), Math.max(contentWidth, rawFieldWidth));
  const height = 32;
  const globalLeft = Math.max(8, Math.min(surfaceWidth - width - 8, fieldLeft + (fieldWidth - width) / 2));
  const globalTop = Math.max(8, Math.min(surfaceHeight - height - 8, fieldTop + (fieldHeight - height) / 2));
  return {
    left: `${globalLeft - fieldLeft}px`,
    top: `${globalTop - fieldTop}px`,
    width: `${width}px`,
    height: `${height}px`,
  };
}

function hasRenderedCaret(field: VisualField): boolean {
  return (field.region.textCaretStops?.length ?? 0) > 0;
}

function caretStopDistanceSquared(stop: TextCaretStop, x: number, y: number): number {
  const deltaX = stop.endX - stop.x;
  const deltaY = stop.endY - stop.y;
  const lengthSquared = deltaX * deltaX + deltaY * deltaY;
  const progress = lengthSquared <= 0
    ? 0
    : Math.max(0, Math.min(1, ((x - stop.x) * deltaX + (y - stop.y) * deltaY) / lengthSquared));
  const nearestX = stop.x + deltaX * progress;
  const nearestY = stop.y + deltaY * progress;
  return (x - nearestX) ** 2 + (y - nearestY) ** 2;
}

function renderedCaretOffsetAt(field: VisualField, clientX: number, clientY: number): number | undefined {
  const stops = field.region.textCaretStops;
  const label = props.label;
  const element = surface.value;
  if (!stops?.length || !label || !element) return undefined;
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return undefined;
  const x = (clientX - rect.left) / rect.width * label.width;
  const y = (clientY - rect.top) / rect.height * label.height;
  let best = stops[0]!;
  let bestDistance = caretStopDistanceSquared(best, x, y);
  for (const stop of stops.slice(1)) {
    const distance = caretStopDistanceSquared(stop, x, y);
    if (distance <= bestDistance) {
      best = stop;
      bestDistance = distance;
    }
  }
  return best.offset;
}

const inlineCaretStyle = computed<CSSProperties | undefined>(() => {
  const state = inlineEdit.value;
  if (!state || state.selectionStart !== state.selectionEnd) return undefined;
  const field = fields.value.find(({ id }) => id === state.fieldId);
  const stops = field?.region.textCaretStops;
  if (!stops?.length) return undefined;
  const stop = stops.find(({ offset }) => offset === state.selectionStart) ??
    [...stops].sort((left, right) =>
      Math.abs(left.offset - state.selectionStart) - Math.abs(right.offset - state.selectionStart))[0];
  if (!stop) return undefined;
  const startX = stop.x * canvasScale.value;
  const startY = stop.y * canvasScale.value;
  const deltaX = (stop.endX - stop.x) * canvasScale.value;
  const deltaY = (stop.endY - stop.y) * canvasScale.value;
  const length = Math.max(8, Math.hypot(deltaX, deltaY));
  const rotation = Math.atan2(deltaY, deltaX) * 180 / Math.PI - 90;
  return {
    left: `${startX}px`,
    top: `${startY}px`,
    height: `${length}px`,
    transform: `translateX(-50%) rotate(${rotation}deg)`,
  };
});

const originMarkerStyle = computed<CSSProperties | undefined>(() => {
  const field = selectedField.value;
  if (!field?.origin) return undefined;
  const displayed = visualBoundsFor(field);
  const offsetX = displayed.x - field.bounds.x;
  const offsetY = displayed.y - field.bounds.y;
  return {
    left: `${(field.origin.region.x + offsetX) * canvasScale.value}px`,
    top: `${(field.origin.region.y + offsetY) * canvasScale.value}px`,
  };
});

function resizeCursor(handle: ResizeHandle): string {
  if (handle === "n" || handle === "s") return "ns-resize";
  if (handle === "e" || handle === "w") return "ew-resize";
  if (handle === "ne" || handle === "sw") return "nesw-resize";
  return "nwse-resize";
}

function resizeHandleAt(event: PointerEvent, field: VisualField): ResizeHandle | undefined {
  if (!visualResizeMode(field) || field.locked || inlineEdit.value) return undefined;
  const target = event.currentTarget;
  if (!(target instanceof HTMLElement)) return undefined;
  const rect = target.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return undefined;
  const edge = Math.min(7, Math.max(2.5, Math.min(rect.width, rect.height) / 4));
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const west = x <= edge;
  const east = x >= rect.width - edge;
  const north = y <= edge;
  const south = y >= rect.height - edge;
  if (north && west) return "nw";
  if (north && east) return "ne";
  if (south && east) return "se";
  if (south && west) return "sw";
  if (north) return "n";
  if (east) return "e";
  if (south) return "s";
  if (west) return "w";
  return undefined;
}

function updateFieldCursor(event: PointerEvent, field: VisualField): void {
  if (dragState.value || resizeState.value || isInlineEditing(field)) return;
  const target = event.currentTarget;
  if (!(target instanceof HTMLElement)) return;
  const handle = resizeHandleAt(event, field);
  target.style.cursor = handle ? resizeCursor(handle) : "";
}

function resetFieldCursor(event: PointerEvent): void {
  if (event.currentTarget instanceof HTMLElement) event.currentTarget.style.cursor = "";
}

function captureInlineDataDoublePress(event: PointerEvent): void {
  if (event.button !== 0 || inlineEdit.value ||
    (event.target instanceof Element && event.target.closest(".designer-inline-control"))) return;
  const directFieldId = event.target instanceof Element
    ? event.target.closest<HTMLElement>(".designer-field")?.dataset.fieldId
    : undefined;
  const directField = directFieldId ? fields.value.find(({ id }) => id === directFieldId) : undefined;
  const directDataField = directField?.kind !== "text" && directField?.content ? directField : undefined;
  const now = performance.now();
  const previous = pendingDataDoublePress;
  const repeated = previous && now - previous.at <= 500 &&
    Math.hypot(event.clientX - previous.clientX, event.clientY - previous.clientY) <= 8;
  const fieldId = repeated ? previous.fieldId : event.detail >= 2 ? directDataField?.id : undefined;
  if (!fieldId) {
    pendingDataDoublePress = directDataField
      ? { fieldId: directDataField.id, clientX: event.clientX, clientY: event.clientY, at: now }
      : undefined;
    return;
  }
  pendingDataDoublePress = undefined;
  event.preventDefault();
  event.stopPropagation();
  if (pendingInlineOpenTimer !== undefined) window.clearTimeout(pendingInlineOpenTimer);
  // Let the browser finish pointerup/click/dblclick before focusing an input
  // that did not exist when the gesture started. This is required by Firefox
  // and WebKit and also survives a first click opening the properties panel.
  pendingInlineOpenTimer = window.setTimeout(() => {
    pendingInlineOpenTimer = undefined;
    const field = fields.value.find(({ id }) => id === fieldId);
    if (field?.content && field.kind !== "text") beginInlineEdit(field);
  }, 0);
}

function beginFieldInteraction(event: PointerEvent, field: VisualField): void {
  pressedFieldId = field.id;
  if (pressedFieldResetTimer !== undefined) window.clearTimeout(pressedFieldResetTimer);
  const handle = resizeHandleAt(event, field);
  if (handle) beginFieldResize(event, field, handle);
  else beginFieldDrag(event, field);
}

function finishFieldClick(event: MouseEvent, field: VisualField): void {
  const pressed = pressedFieldId;
  pressedFieldId = undefined;
  if (pressedFieldResetTimer !== undefined) window.clearTimeout(pressedFieldResetTimer);
  pressedFieldResetTimer = undefined;
  // Selecting an overlapping field can change stacking order between pointer
  // down and click. Ignore a click retargeted to the field underneath.
  if (pressed && pressed !== field.id) return;
  if (!pressed || event.detail === 0) selectField(field, event);
}

function canvasPoint(event: Pick<PointerEvent, "clientX" | "clientY">): { x: number; y: number } | undefined {
  if (!surface.value || !props.label) return undefined;
  const rect = surface.value.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return undefined;
  return {
    x: clamped((event.clientX - rect.left) / rect.width * props.label.width, props.label.width),
    y: clamped((event.clientY - rect.top) / rect.height * props.label.height, props.label.height),
  };
}

function rulerTicks(maximum: number): number[] {
  if (maximum <= 0) return [];
  const step = rulerStep.value;
  const count = Math.min(250, Math.floor(maximum / step));
  return Array.from({ length: count + 1 }, (_, index) => index * step);
}

function guideLineStyle(axis: "x" | "y", position: number): CSSProperties {
  return axis === "x"
    ? { left: `${position * canvasScale.value}px` }
    : { top: `${position * canvasScale.value}px` };
}

function rulerTickStyle(axis: "x" | "y", position: number): CSSProperties {
  return axis === "x"
    ? { left: `${position * canvasScale.value}px` }
    : { top: `${position * canvasScale.value}px` };
}

function newGuideId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  guideSequence += 1;
  return `guide-${Date.now().toString(36)}-${guideSequence.toString(36)}`;
}

function addGuideFromRuler(event: MouseEvent, axis: "x" | "y"): void {
  const point = canvasPoint(event);
  if (!point) return;
  manualGuides.value = [...manualGuides.value, {
    id: newGuideId(),
    axis,
    position: snap(axis === "x" ? point.x : point.y),
  }];
}

function removeManualGuide(id: string): void {
  manualGuides.value = manualGuides.value.filter((guide) => guide.id !== id);
}

function beginGuideDrag(event: PointerEvent, id: string): void {
  if (event.button !== 0) return;
  const guide = manualGuides.value.find((candidate) => candidate.id === id);
  if (!guide) return;
  event.preventDefault();
  guideDragState.value = { id, axis: guide.axis };
  window.addEventListener("pointermove", continueGuideDrag);
  window.addEventListener("pointerup", finishGuideDrag, { once: true });
  document.body.style.cursor = guide.axis === "x" ? "col-resize" : "row-resize";
  document.body.style.userSelect = "none";
}

function continueGuideDrag(event: PointerEvent): void {
  const state = guideDragState.value;
  const point = canvasPoint(event);
  if (!state || !point) return;
  event.preventDefault();
  const position = snap(state.axis === "x" ? point.x : point.y);
  manualGuides.value = manualGuides.value.map((guide) => guide.id === state.id ? { ...guide, position } : guide);
}

function finishGuideDrag(): void {
  window.removeEventListener("pointermove", continueGuideDrag);
  guideDragState.value = undefined;
  document.body.style.cursor = "";
  document.body.style.userSelect = "";
}

function beginMarquee(event: PointerEvent): void {
  if (event.button !== 0 || inlineEdit.value || resizeState.value || dragState.value) return;
  const point = canvasPoint(event);
  if (!point) return;
  event.preventDefault();
  const additive = event.shiftKey || event.metaKey || event.ctrlKey;
  if (!additive) clearSelection(undefined, false);
  marqueeState.value = {
    startClientX: event.clientX,
    startClientY: event.clientY,
    startX: point.x,
    startY: point.y,
    currentX: point.x,
    currentY: point.y,
    additive,
  };
  window.addEventListener("pointermove", continueMarquee);
  window.addEventListener("pointerup", finishMarquee, { once: true });
}

function continueMarquee(event: PointerEvent): void {
  const state = marqueeState.value;
  const point = canvasPoint(event);
  if (!state || !point) return;
  event.preventDefault();
  state.currentX = point.x;
  state.currentY = point.y;
}

function finishMarquee(event: PointerEvent): void {
  const state = marqueeState.value;
  window.removeEventListener("pointermove", continueMarquee);
  marqueeState.value = undefined;
  if (!state) return;
  const moved = Math.hypot(event.clientX - state.startClientX, event.clientY - state.startClientY) >= 3;
  if (!moved) {
    if (!state.additive) clearSelection(event);
    return;
  }
  const left = Math.min(state.startX, state.currentX);
  const right = Math.max(state.startX, state.currentX);
  const top = Math.min(state.startY, state.currentY);
  const bottom = Math.max(state.startY, state.currentY);
  const selected = fields.value.filter(({ bounds }) =>
    bounds.x < right && bounds.x + bounds.width > left && bounds.y < bottom && bounds.y + bounds.height > top);
  const previous = state.additive ? selectionKeys.value : [];
  const combined = [...previous];
  for (const field of selected) {
    const key = selectionKey(field);
    if (!combined.some((candidate) => sameSelection(candidate, key))) combined.push(key);
  }
  selectionKeys.value = combined;
  primarySelectionKey.value = combined.at(-1);
  sidebarTab.value = "layers";
  if (selectedField.value) emit("syncSourceSelection", selectedField.value.sourceSpan);
  void nextTick(() => surface.value?.focus({ preventScroll: true }));
}

function beginFieldDrag(event: PointerEvent, field: VisualField): void {
  selectField(field, event, true);
  const moving = hasSelection(field) ? selectedFields.value : [field];
  const bounds = unionVisualBounds(moving);
  if (!bounds || moving.some((candidate) => !candidate.movable || candidate.locked) ||
    event.button !== 0 || inlineEdit.value || resizeState.value) return;
  event.preventDefault();
  dragState.value = { fields: [...moving], bounds, startX: event.clientX, startY: event.clientY, deltaX: 0, deltaY: 0 };
  window.addEventListener("pointermove", continueFieldDrag);
  window.addEventListener("pointerup", finishFieldDrag, { once: true });
  document.body.style.cursor = "grabbing";
  document.body.style.userSelect = "none";
}

function beginFieldResize(event: PointerEvent, field: VisualField, handle: ResizeHandle): void {
  if (!visualResizeMode(field) || field.locked || event.button !== 0 || !props.label || !surface.value) return;
  event.preventDefault();
  selectField(field, event);
  inlineEdit.value = undefined;
  resizeState.value = {
    field,
    handle,
    startX: event.clientX,
    startY: event.clientY,
    bounds: { ...field.bounds },
  };
  window.addEventListener("pointermove", continueFieldResize);
  window.addEventListener("pointerup", finishFieldResize, { once: true });
  document.body.style.cursor = resizeCursor(handle);
  document.body.style.userSelect = "none";
}

function freeResizeBounds(state: ResizeState, deltaX: number, deltaY: number): VisualBounds {
  const label = props.label!;
  const start = state.field.bounds;
  let left = start.x;
  let top = start.y;
  let right = start.x + start.width;
  let bottom = start.y + start.height;
  if (state.handle.includes("w")) left = Math.min(right - 1, clamped(snap(start.x + deltaX), label.width - 1));
  if (state.handle.includes("e")) right = Math.max(left + 1, clamped(snap(start.x + start.width + deltaX), label.width));
  if (state.handle.includes("n")) top = Math.min(bottom - 1, clamped(snap(start.y + deltaY), label.height - 1));
  if (state.handle.includes("s")) bottom = Math.max(top + 1, clamped(snap(start.y + start.height + deltaY), label.height));
  return { x: left, y: top, width: right - left, height: bottom - top };
}

function uniformResizeBounds(state: ResizeState, deltaX: number, deltaY: number): VisualBounds {
  const label = props.label!;
  const start = state.field.bounds;
  const horizontal = (state.handle.includes("w") ? -deltaX : deltaX) / Math.max(1, start.width);
  const vertical = (state.handle.includes("n") ? -deltaY : deltaY) / Math.max(1, start.height);
  const changesWidth = state.handle.includes("w") || state.handle.includes("e");
  const changesHeight = state.handle.includes("n") || state.handle.includes("s");
  const directional = changesWidth && !changesHeight
    ? horizontal
    : changesHeight && !changesWidth
      ? vertical
      : Math.abs(horizontal) >= Math.abs(vertical) ? horizontal : vertical;
  let scale = Math.max(1 / Math.max(start.width, start.height), 1 + directional);
  const availableWidth = state.handle.includes("w") ? start.x + start.width : label.width - start.x;
  const availableHeight = state.handle.includes("n") ? start.y + start.height : label.height - start.y;
  scale = Math.min(scale, availableWidth / start.width, availableHeight / start.height);
  const width = Math.max(1, snap(start.width * scale));
  const height = Math.max(1, snap(start.height * scale));
  return {
    x: state.handle.includes("w") ? start.x + start.width - width : start.x,
    y: state.handle.includes("n") ? start.y + start.height - height : start.y,
    width,
    height,
  };
}

function continueFieldResize(event: PointerEvent): void {
  const state = resizeState.value;
  if (!state || !props.label || !surface.value) return;
  event.preventDefault();
  const rect = surface.value.getBoundingClientRect();
  const deltaX = (event.clientX - state.startX) / rect.width * props.label.width;
  const deltaY = (event.clientY - state.startY) / rect.height * props.label.height;
  state.bounds = visualResizeMode(state.field) === "uniform"
    ? uniformResizeBounds(state, deltaX, deltaY)
    : freeResizeBounds(state, deltaX, deltaY);
}

function finishFieldResize(): void {
  const state = resizeState.value;
  window.removeEventListener("pointermove", continueFieldResize);
  document.body.style.cursor = "";
  document.body.style.userSelect = "";
  resizeState.value = undefined;
  if (!state) return;
  const edit = sourceEditForResize(props.source, state.field, state.bounds, props.printDensity);
  if (edit) {
    pendingDesignerFocus = "selection";
    emit("edit", edit);
  }
}

function setInlineSelection(editor: HTMLElement, start: number, end = start): void {
  const state = inlineEdit.value;
  if (!state) return;
  const value = editor instanceof HTMLInputElement ? editor.value : editor.textContent ?? "";
  const selectionStart = Math.max(0, Math.min(value.length, Math.trunc(start)));
  const selectionEnd = Math.max(selectionStart, Math.min(value.length, Math.trunc(end)));
  if (editor instanceof HTMLInputElement) {
    editor.setSelectionRange(selectionStart, selectionEnd);
    state.selectionStart = selectionStart;
    state.selectionEnd = selectionEnd;
    return;
  }
  if (!(editor.firstChild instanceof Text) || editor.childNodes.length !== 1) editor.textContent = value;
  const text = editor.firstChild instanceof Text
    ? editor.firstChild
    : editor.appendChild(document.createTextNode(""));
  const range = document.createRange();
  range.setStart(text, selectionStart);
  range.setEnd(text, selectionEnd);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
  state.selectionStart = selectionStart;
  state.selectionEnd = selectionEnd;
}

function selectionOffsetWithin(editor: HTMLElement, node: Node, offset: number): number | undefined {
  if (node !== editor && !editor.contains(node)) return undefined;
  try {
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.setEnd(node, offset);
    return range.toString().length;
  } catch {
    return undefined;
  }
}

function syncInlineSelection(): void {
  const state = inlineEdit.value;
  const editor = surface.value?.querySelector<HTMLElement>(".designer-inline-control");
  if (!state || !editor) return;
  if (editor instanceof HTMLInputElement) {
    state.selectionStart = editor.selectionStart ?? editor.value.length;
    state.selectionEnd = editor.selectionEnd ?? state.selectionStart;
    return;
  }
  const selection = window.getSelection();
  if (!selection?.rangeCount) return;
  const range = selection.getRangeAt(0);
  const start = selectionOffsetWithin(editor, range.startContainer, range.startOffset);
  const end = selectionOffsetWithin(editor, range.endContainer, range.endOffset);
  if (start === undefined || end === undefined) return;
  state.selectionStart = Math.min(start, end);
  state.selectionEnd = Math.max(start, end);
}

function placeInlineCaret(event: MouseEvent, field: VisualField): void {
  const selection = window.getSelection();
  if (selection && !selection.isCollapsed) {
    syncInlineSelection();
    return;
  }
  const offset = renderedCaretOffsetAt(field, event.clientX, event.clientY);
  const editor = event.currentTarget as HTMLElement;
  if (offset !== undefined) setInlineSelection(editor, offset);
  else syncInlineSelection();
}

function beginInlineEdit(field: VisualField, event?: Event): void {
  if (!field.content) return;
  if (inlineEdit.value?.fieldId === field.id) return;
  selectField(field, event);
  const fieldNumber = fieldNumberForVisualField(field);
  const value = fieldNumber ? props.fieldValues?.[fieldNumber] ?? field.content.value : field.content.value;
  const requestedOffset = event instanceof MouseEvent
    ? renderedCaretOffsetAt(field, event.clientX, event.clientY)
    : undefined;
  const initialOffset = Math.max(0, Math.min(value.length, requestedOffset ?? value.length));
  inlineEdit.value = {
    fieldId: field.id,
    commandStart: field.content.commandSpan.start,
    command: field.content.command,
    prefix: field.content.prefix,
    originalValue: value,
    value,
    fieldNumber,
    selectionStart: initialOffset,
    selectionEnd: initialOffset,
  };
  void nextTick(() => {
    const editor = surface.value?.querySelector<HTMLElement>(".designer-inline-control");
    if (!editor) return;
    if (editor instanceof HTMLInputElement) editor.value = value;
    else editor.textContent = value;
    editor.focus({ preventScroll: true });
    setInlineSelection(editor, initialOffset);
  });
}

function updateInlineText(event: Event): void {
  const editState = inlineEdit.value;
  if (!editState) return;
  const editor = event.currentTarget as HTMLElement;
  const rawValue = editor instanceof HTMLInputElement ? editor.value : editor.textContent ?? "";
  const value = rawValue.replace(/[\r\n]+/g, " ");
  if (editor instanceof HTMLInputElement) editor.value = value;
  else if (editor.textContent !== value) editor.textContent = value;
  editState.value = value;
  syncInlineSelection();
  if (editState.fieldNumber) {
    emit("updateFieldValue", editState.fieldNumber, value);
    return;
  }
  const edit = sourceEditForContent(props.source, {
    value: editState.value,
    command: editState.command,
    prefix: editState.prefix,
    commandSpan: { start: editState.commandStart, end: editState.commandStart },
  }, value);
  if (edit) emit("edit", edit);
}

function finishInlineEdit(): void {
  if (!inlineEdit.value) return;
  inlineEdit.value = undefined;
  void nextTick(() => surface.value?.querySelector<HTMLElement>(".designer-field.selected")?.focus({ preventScroll: true }));
}

function cancelInlineEdit(): void {
  const editState = inlineEdit.value;
  if (!editState) return;
  if (editState.fieldNumber) {
    emit("updateFieldValue", editState.fieldNumber, editState.originalValue);
    inlineEdit.value = undefined;
    return;
  }
  const edit = sourceEditForContent(props.source, {
    value: editState.value,
    command: editState.command,
    prefix: editState.prefix,
    commandSpan: { start: editState.commandStart, end: editState.commandStart },
  }, editState.originalValue);
  inlineEdit.value = undefined;
  if (edit) emit("edit", edit);
}

function handleInlineTextKeydown(event: KeyboardEvent): void {
  event.stopPropagation();
  if (event.isComposing) return;
  if (event.key === "Enter") {
    event.preventDefault();
    finishInlineEdit();
  } else if (event.key === "Escape") {
    event.preventDefault();
    cancelInlineEdit();
  }
}

function continueFieldDrag(event: PointerEvent): void {
  const state = dragState.value;
  if (!state || !props.label || !surface.value) return;
  event.preventDefault();
  const rect = surface.value.getBoundingClientRect();
  const rawX = (event.clientX - state.startX) / rect.width * props.label.width;
  const rawY = (event.clientY - state.startY) / rect.height * props.label.height;
  const primary = selectedField.value ?? state.fields[0]!;
  const originX = primary.origin?.region.x ?? primary.bounds.x;
  const originY = primary.origin?.region.y ?? primary.bounds.y;
  let deltaX = snapSize.value <= 1 ? rawX : snap(originX + rawX) - originX;
  let deltaY = snapSize.value <= 1 ? rawY : snap(originY + rawY) - originY;
  activeSmartGuides.value = [];
  if (objectSnapEnabled.value) {
    const selectedIds = new Set(state.fields.map(({ id }) => id));
    const candidates: SnapGuide[] = [
      { axis: "x", position: 0, kind: "label" },
      { axis: "x", position: props.label.width / 2, kind: "label" },
      { axis: "x", position: props.label.width, kind: "label" },
      { axis: "y", position: 0, kind: "label" },
      { axis: "y", position: props.label.height / 2, kind: "label" },
      { axis: "y", position: props.label.height, kind: "label" },
      ...manualGuides.value.map(({ axis, position }) => ({ axis, position, kind: "manual" as const })),
    ];
    for (const candidate of fields.value) {
      if (selectedIds.has(candidate.id)) continue;
      candidates.push(
        { axis: "x", position: candidate.bounds.x, kind: "object" },
        { axis: "x", position: candidate.bounds.x + candidate.bounds.width / 2, kind: "object" },
        { axis: "x", position: candidate.bounds.x + candidate.bounds.width, kind: "object" },
        { axis: "y", position: candidate.bounds.y, kind: "object" },
        { axis: "y", position: candidate.bounds.y + candidate.bounds.height / 2, kind: "object" },
        { axis: "y", position: candidate.bounds.y + candidate.bounds.height, kind: "object" },
      );
    }
    const snapped = snapMovingBounds(state.bounds, rawX, rawY, candidates, 6 / Math.max(0.01, canvasScale.value));
    if (snapped.guides.length) {
      deltaX = snapped.deltaX;
      deltaY = snapped.deltaY;
      activeSmartGuides.value = snapped.guides;
    }
  }
  state.deltaX = Math.max(-state.bounds.x, Math.min(props.label.width - state.bounds.x - state.bounds.width, deltaX));
  state.deltaY = Math.max(-state.bounds.y, Math.min(props.label.height - state.bounds.y - state.bounds.height, deltaY));
}

function finishFieldDrag(): void {
  const state = dragState.value;
  window.removeEventListener("pointermove", continueFieldDrag);
  document.body.style.cursor = "";
  document.body.style.userSelect = "";
  dragState.value = undefined;
  activeSmartGuides.value = [];
  pressedFieldResetTimer = window.setTimeout(() => {
    pressedFieldId = undefined;
    pressedFieldResetTimer = undefined;
  }, 0);
  if (!state || (state.deltaX === 0 && state.deltaY === 0)) return;
  const edit = sourceTransactionForMoveFields(
    props.source,
    state.fields,
    () => ({ x: state.deltaX, y: state.deltaY }),
    props.printDensity,
    selectedField.value,
  );
  if (edit) {
    pendingDesignerFocus = "selection";
    emitAndSelect(edit);
  }
}

function moveSelected(deltaX: number, deltaY: number): void {
  const field = selectedField.value;
  if (!field || !allSelectedMovable.value) return;
  const edit = sourceTransactionForMoveFields(
    props.source,
    selectedFields.value,
    () => ({ x: deltaX, y: deltaY }),
    props.printDensity,
    field,
  );
  if (edit) {
    pendingDesignerFocus = "selection";
    emitAndSelect(edit);
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
  if (pressedFieldResetTimer !== undefined) window.clearTimeout(pressedFieldResetTimer);
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
    const parsed = JSON.parse(raw) as {
      version?: unknown;
      source?: unknown;
      field?: Partial<VisualField>;
      fields?: Array<Partial<VisualField>>;
      primaryFieldId?: unknown;
    };
    if ((parsed.version !== 1 && parsed.version !== 2) || typeof parsed.source !== "string" || parsed.source.length > 8_000_000) return undefined;
    const requested = parsed.version === 1 ? [parsed.field] : parsed.fields;
    if (!requested?.length || requested.length > 1_000) return undefined;
    const fields: VisualField[] = [];
    for (const field of requested) {
      const originSpan = field?.origin?.command?.span;
      if (
        !field ||
        !validClipboardSpan(field.sourceSpan, parsed.source.length) ||
        !validClipboardSpan(originSpan, parsed.source.length) ||
        typeof field.kind !== "string" ||
        !["text", "barcode", "qr", "box", "circle", "ellipse", "graphic"].includes(field.kind)
      ) return undefined;
      fields.push(field as VisualField);
    }
    return {
      source: parsed.source,
      fields,
      primaryFieldId: typeof parsed.primaryFieldId === "string" ? parsed.primaryFieldId : fields.at(-1)?.id,
      pasteCount: 0,
    };
  } catch {
    return undefined;
  }
}

function handleVisualCopy(event: ClipboardEvent): void {
  if (shortcutsOpen.value || isEditableTarget(event.target)) return;
  const field = selectedField.value;
  const copiedFields = selectedFields.value;
  if (!field?.origin || copiedFields.length === 0 || copiedFields.some((candidate) => !candidate.origin)) return;
  visualClipboard = { source: props.source, fields: [...copiedFields], primaryFieldId: field.id, pasteCount: 0 };
  const fieldSource = copiedFields
    .map((candidate) => props.source.slice(candidate.sourceSpan.start, candidate.sourceSpan.end))
    .join("\n");
  if (event.clipboardData) {
    event.clipboardData.setData("text/plain", fieldSource);
    try {
      event.clipboardData.setData(visualClipboardMime, JSON.stringify({
        version: 2,
        source: props.source,
        fields: copiedFields,
        primaryFieldId: field.id,
      }));
    } catch {
      // Some browsers only allow standard clipboard MIME types. The in-memory
      // clipboard still provides visual paste for the current Designer session.
    }
  }
  event.preventDefault();
  announceClipboard(copiedFields.length === 1
    ? `${visualFieldLabel(field.kind, field.region.type)} copied`
    : `${copiedFields.length} layers copied`);
}

function handleVisualPaste(event: ClipboardEvent): void {
  if (shortcutsOpen.value || isEditableTarget(event.target)) return;
  let item = visualClipboard;
  if (!item && event.clipboardData) item = parseVisualClipboard(event.clipboardData.getData(visualClipboardMime));
  if (!item) return;
  const pasteCount = item.pasteCount + 1;
  const edit = sourceEditForPasteFields(
    props.source,
    props.activeLabelIndex,
    item.source,
    item.fields,
    props.printDensity,
    pasteCount * 20,
    item.primaryFieldId,
  );
  if (!edit) return;
  event.preventDefault();
  item.pasteCount = pasteCount;
  visualClipboard = item;
  emitAndSelect(edit, item.fields[0]?.kind);
  announceClipboard(item.fields.length === 1
    ? `${visualFieldLabel(item.fields[0]!.kind, item.fields[0]!.region?.type)} pasted`
    : `${item.fields.length} layers pasted`);
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
  if (event.target instanceof Element && !event.target.closest(".designer-root")) return;

  const modifier = event.metaKey || event.ctrlKey;
  const selected = selectedField.value;
  if (modifier && event.key.toLowerCase() === "a") {
    handledShortcut(event);
    selectionKeys.value = fields.value.map(selectionKey);
    primarySelectionKey.value = selectionKeys.value.at(-1);
    sidebarTab.value = "layers";
    if (selectedField.value) emit("syncSourceSelection", selectedField.value.sourceSpan);
  } else if (modifier && event.key.toLowerCase() === "d" && selected) {
    handledShortcut(event);
    duplicateSelected();
  } else if (modifier && event.key === "]" && selected) {
    handledShortcut(event);
    moveSelectedLayer("forward");
  } else if (modifier && event.key === "[" && selected) {
    handledShortcut(event);
    moveSelectedLayer("backward");
  } else if (!modifier && !event.altKey && selected && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
    if (!allSelectedMovable.value) return;
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
  } else if (!modifier && event.key === "Enter" && selected?.content) {
    handledShortcut(event);
    beginInlineEdit(selected);
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

function emitAndSelect(edit: SourceChange, kind?: VisualField["kind"]): void {
  if ("edits" in edit && edit.selectOriginAts?.length) {
    const previousKinds = selectedFields.value.map((field) => field.kind);
    selectionKeys.value = edit.selectOriginAts.map((anchor, index) => ({
      anchor,
      kind: edit.selectKinds?.[index] ?? previousKinds[index] ?? kind ?? selectedField.value?.kind ?? "text",
    }));
    const primary = edit.primarySelectOriginAt ?? edit.selectOriginAts.at(-1)!;
    primarySelectionKey.value = selectionKeys.value.find(({ anchor }) => anchor === primary) ?? selectionKeys.value.at(-1);
  } else if (!("edits" in edit) && edit.selectOriginAt !== undefined) {
    const key = { anchor: edit.selectOriginAt, kind: kind ?? selectedField.value?.kind ?? "text" };
    selectionKeys.value = [key];
    primarySelectionKey.value = key;
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

function normalizedFieldNumber(value: string): string {
  return value.replace(/^0+(?=\d)/, "");
}

function commitDataBinding(event: Event): void {
  const field = selectedField.value;
  if (!field) return;
  const value = (event.currentTarget as HTMLSelectElement).value;
  const column = variableColumns.value.find((candidate) =>
    normalizedFieldNumber(candidate.fieldNumber) === normalizedFieldNumber(value));
  const edit = sourceEditForVariableBinding(props.source, field, value || undefined, column?.name);
  if (edit) emitAndSelect(edit, field.kind);
}

function commitRecordValue(event: Event): void {
  const fieldNumber = selectedFieldNumber.value;
  if (!fieldNumber || !selectedVariableColumn.value) return;
  const value = (event.currentTarget as HTMLTextAreaElement).value.replace(/[\r\n]+/g, " ");
  emit("updateFieldValue", fieldNumber, value);
}

function commitVisualProperty(property: VisualPropertyParameter, event: Event): void {
  const control = event.currentTarget as HTMLInputElement | HTMLSelectElement;
  if (control.value === property.value) return;
  const edit = sourceEditForVisualProperty(props.source, property, control.value);
  if (edit) emit("edit", edit);
  else control.value = property.value;
}

function commitBarcodeType(event: Event): void {
  const control = event.currentTarget as HTMLSelectElement;
  const command = selectedBarcodeCommand.value;
  if (!command || control.value === command.canonical) return;
  const edit = sourceEditForBarcodeType(props.source, command.span, control.value);
  if (edit) emit("edit", edit);
  else control.value = command.canonical;
}

function duplicateSelected(): void {
  const field = selectedField.value;
  if (!field || selectedFields.value.length === 0 || selectedFields.value.some((candidate) => !candidate.origin || candidate.locked)) return;
  const edit = sourceEditForPasteFields(
    props.source,
    props.activeLabelIndex,
    props.source,
    selectedFields.value,
    props.printDensity,
    20,
    field.id,
  );
  if (edit) emitAndSelect(edit, field.kind);
}

function deleteSelected(): void {
  if (selectedFields.value.length === 0 || selectedFields.value.some((field) => field.locked)) return;
  const edit = sourceTransactionForDeleteFields(props.source, selectedFields.value);
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

function arrangeSelection(alignment: VisualAlignment): void {
  if (!props.label || !allSelectedMovable.value || !selectionBounds.value) return;
  const target = alignToLabel.value || selectedFields.value.length === 1
    ? { x: 0, y: 0, width: props.label.width, height: props.label.height }
    : selectionBounds.value;
  const edit = sourceTransactionForAlignment(
    props.source,
    selectedFields.value,
    alignment,
    target,
    props.printDensity,
    selectedField.value,
  );
  if (edit) emitAndSelect(edit);
}

function distributeSelection(axis: "horizontal" | "vertical"): void {
  if (!allSelectedMovable.value) return;
  const edit = sourceTransactionForDistribution(
    props.source,
    selectedFields.value,
    axis,
    props.printDensity,
    selectedField.value,
  );
  if (edit) emitAndSelect(edit);
}

function toggleSelectedLock(): void {
  if (selectedFields.value.length === 0) return;
  const shouldLock = selectedFields.value.some((field) => !field.locked);
  const edits = selectedFields.value.flatMap((field) => {
    if (field.locked === shouldLock) return [];
    const edit = sourceEditForFieldLock(props.source, field, shouldLock);
    return edit ? [edit] : [];
  });
  if (edits.length === 0) return;
  const origins = selectedFields.value.map((field) => sourceOffsetAfterEdits(selectionOffset(field), edits));
  const primary = selectedField.value
    ? sourceOffsetAfterEdits(selectionOffset(selectedField.value), edits)
    : origins.at(-1);
  const transaction = sourceEditTransaction(edits, {
    origins,
    primary,
    kinds: selectedFields.value.map(({ kind }) => kind),
  });
  if (transaction) emitAndSelect(transaction);
}

function hideSelectedFields(): void {
  if (selectedFields.value.length === 0 || selectedFields.value.some((field) => field.locked)) return;
  const transaction = sourceTransactionForHideFields(props.source, selectedFields.value);
  if (!transaction) return;
  clearSelection();
  emit("edit", transaction);
}

function unhideField(field: HiddenVisualField): void {
  emitAndSelect(sourceEditForUnhideField(field), field.kind);
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

function fieldIcon(field: Pick<VisualField, "kind">): Component {
  if (field.kind === "text") return IconFormatText;
  if (field.kind === "barcode") return IconBarcode;
  if (field.kind === "qr") return IconQrcode;
  if (field.kind === "graphic") return IconVectorLine;
  return IconShapeRectanglePlus;
}

function fitLabel(): void {
  zoom.value = 100;
}

function boundedZoom(value: number): number {
  return Math.round(Math.max(25, Math.min(250, value)) * 10) / 10;
}

async function zoomAtPoint(nextZoom: number, clientX: number, clientY: number): Promise<void> {
  const viewportElement = viewport.value;
  const surfaceElement = surface.value;
  const bounded = boundedZoom(nextZoom);
  if (!viewportElement || !surfaceElement || bounded === zoom.value) return;
  const before = surfaceElement.getBoundingClientRect();
  if (before.width <= 0 || before.height <= 0) {
    zoom.value = bounded;
    return;
  }
  const anchorX = (clientX - before.left) / before.width;
  const anchorY = (clientY - before.top) / before.height;
  zoom.value = bounded;
  await nextTick();
  const after = surfaceElement.getBoundingClientRect();
  viewportElement.scrollLeft += after.left + anchorX * after.width - clientX;
  viewportElement.scrollTop += after.top + anchorY * after.height - clientY;
}

function changeZoom(delta: number): void {
  const viewportElement = viewport.value;
  if (!viewportElement) {
    zoom.value = boundedZoom(zoom.value + delta);
    return;
  }
  const rect = viewportElement.getBoundingClientRect();
  void zoomAtPoint(zoom.value + delta, rect.left + rect.width / 2, rect.top + rect.height / 2);
}

function wheelDeltaPixels(event: WheelEvent, axis: "x" | "y"): number {
  const delta = axis === "x" ? event.deltaX : event.deltaY;
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) return delta * 16;
  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
    const viewportElement = viewport.value;
    return delta * (axis === "x" ? viewportElement?.clientWidth ?? 1 : viewportElement?.clientHeight ?? 1);
  }
  return delta;
}

function handleViewportWheel(event: WheelEvent): void {
  const viewportElement = viewport.value;
  if (!viewportElement) return;
  event.preventDefault();
  const deltaX = wheelDeltaPixels(event, "x");
  const deltaY = wheelDeltaPixels(event, "y");
  if (event.ctrlKey || event.metaKey) {
    const boundedDelta = Math.max(-50, Math.min(50, deltaY));
    const nextZoom = zoom.value * 2 ** (-boundedDelta / 100);
    void zoomAtPoint(nextZoom, event.clientX, event.clientY);
    return;
  }
  const shiftToHorizontal = event.shiftKey && Math.abs(deltaX) < Math.abs(deltaY);
  viewportElement.scrollLeft += shiftToHorizontal ? deltaY : deltaX;
  viewportElement.scrollTop += shiftToHorizontal ? 0 : deltaY;
}

function updateViewportSize(): void {
  viewportWidth.value = viewport.value?.clientWidth ?? 0;
  viewportHeight.value = viewport.value?.clientHeight ?? 0;
}

function restoreDesignerFocus(): void {
  if (!pendingDesignerFocus || props.rendering) return;
  void nextTick(() => {
    if (selectedField.value) emit("syncSourceSelection", selectedField.value.sourceSpan);
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
watch([() => props.selectedSourceOffset, fields], syncSelectionFromSource, { immediate: true });
watch(() => props.sourceSelectionActive, (active) => {
  if (!active) return;
  visualSelectionOwnsFocus.value = false;
  syncSelectionFromSource();
});
watch(() => props.guides, (guides) => {
  const next = (guides ?? []).map((guide) => ({ ...guide }));
  if (JSON.stringify(next) !== JSON.stringify(manualGuides.value)) manualGuides.value = next;
}, { deep: true, immediate: true });
watch(manualGuides, (guides) => {
  const next = guides.map((guide) => ({ ...guide }));
  if (JSON.stringify(next) !== JSON.stringify(props.guides ?? [])) emit("update:guides", next);
}, { deep: true });

onMounted(() => {
  updateViewportSize();
  window.addEventListener("keydown", handleDesignerKeydown);
  window.addEventListener("copy", handleVisualCopy);
  window.addEventListener("paste", handleVisualPaste);
  document.addEventListener("selectionchange", syncInlineSelection);
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
  document.removeEventListener("selectionchange", syncInlineSelection);
  if (clipboardAnnouncementTimer !== undefined) window.clearTimeout(clipboardAnnouncementTimer);
  if (pendingInlineOpenTimer !== undefined) window.clearTimeout(pendingInlineOpenTimer);
  window.removeEventListener("pointermove", continueFieldDrag);
  window.removeEventListener("pointerup", finishFieldDrag);
  window.removeEventListener("pointermove", continueFieldResize);
  window.removeEventListener("pointerup", finishFieldResize);
  window.removeEventListener("pointermove", continueMarquee);
  window.removeEventListener("pointerup", finishMarquee);
  window.removeEventListener("pointermove", continueGuideDrag);
  window.removeEventListener("pointerup", finishGuideDrag);
  document.body.style.cursor = "";
  document.body.style.userSelect = "";
});
</script>

<style scoped>
.designer-viewport {
  overscroll-behavior: contain;
  background-color: rgb(244 244 245);
  background-image: linear-gradient(rgb(24 24 27 / 0.035) 1px, transparent 1px), linear-gradient(90deg, rgb(24 24 27 / 0.035) 1px, transparent 1px);
  background-size: 20px 20px;
}
.designer-canvas-stage {
  box-sizing: border-box;
  width: max-content;
  height: max-content;
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

.designer-root.embedded .designer-toolbox { display: none; }

.designer-select-wrap { position: relative; display: inline-flex; align-items: center; }
.designer-select {
  height: 1.75rem;
  appearance: none;
  border: 1px solid rgb(228 228 231);
  border-radius: 0.4rem;
  background: white;
  padding: 0 1.65rem 0 0.45rem;
  color: rgb(82 82 91);
  font-size: 0.65rem;
}
.designer-select-chevron { position: absolute; top: 50%; right: 0.4rem; width: 0.85rem; height: 0.85rem; transform: translateY(-50%); pointer-events: none; color: rgb(82 82 91); }

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
.designer-icon-button:disabled { cursor: not-allowed; opacity: 0.35; }

.designer-arrange > summary { list-style: none; }
.designer-arrange > summary::-webkit-details-marker { display: none; }
.designer-arrange[open] > summary { background: rgb(244 244 245); color: rgb(24 24 27); }
.designer-arrange-popover {
  position: absolute;
  top: calc(100% + 0.4rem);
  right: 0;
  z-index: 55;
  width: 16rem;
  border: 1px solid rgb(228 228 231);
  border-radius: 0.65rem;
  background: white;
  padding: 0.65rem;
  color: rgb(82 82 91);
  font-size: 0.65rem;
  box-shadow: 0 14px 35px rgb(24 24 27 / 0.18);
}
.designer-arrange-popover button {
  min-height: 1.8rem;
  border: 1px solid rgb(228 228 231);
  border-radius: 0.4rem;
  padding: 0.25rem 0.4rem;
  font-size: 0.6rem;
  font-weight: 600;
}
.designer-arrange-popover button:hover:not(:disabled) { background: rgb(244 244 245); color: rgb(24 24 27); }
.designer-arrange-popover button:disabled { cursor: not-allowed; opacity: 0.35; }
.designer-snap-popover { width: 13rem; }
.designer-snap-popover > label { display: flex; align-items: center; gap: 0.45rem; margin-top: 0.55rem; }

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

.designer-manual-guide, .designer-smart-guide { background: rgb(236 72 153 / 0.9); }
.designer-manual-guide.vertical, .designer-smart-guide.vertical { top: 0; bottom: 0; width: 1px; cursor: col-resize; }
.designer-manual-guide.horizontal, .designer-smart-guide.horizontal { right: 0; left: 0; height: 1px; cursor: row-resize; }
.designer-manual-guide::after {
  position: absolute;
  width: 9px;
  height: 9px;
  border: 1px solid white;
  border-radius: 9999px;
  background: rgb(236 72 153);
  content: "";
}
.designer-manual-guide.vertical::after { top: 13px; left: 0; transform: translateX(-50%); }
.designer-manual-guide.horizontal::after { top: 0; left: 13px; transform: translateY(-50%); }
.designer-smart-guide { background: rgb(16 185 129 / 0.95); box-shadow: 0 0 0 1px rgb(255 255 255 / 0.5); }
.designer-smart-guide.kind-label { background: rgb(59 130 246 / 0.95); }
.designer-smart-guide.kind-object { background: rgb(16 185 129 / 0.95); }
.designer-smart-guide.kind-manual { background: rgb(236 72 153 / 0.95); }
.designer-marquee { border: 1px solid rgb(37 99 235); background: rgb(59 130 246 / 0.12); }
.designer-group-selection { border: 1px dashed rgb(37 99 235); box-shadow: 0 0 0 1px rgb(255 255 255 / 0.75); }
.designer-ruler {
  pointer-events: auto;
  overflow: hidden;
  background: rgb(255 255 255 / 0.82);
  color: rgb(82 82 91);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 7px;
  backdrop-filter: blur(2px);
}
.designer-ruler-x { height: 13px; border-bottom: 1px solid rgb(161 161 170 / 0.55); cursor: crosshair; }
.designer-ruler-y { width: 13px; border-right: 1px solid rgb(161 161 170 / 0.55); cursor: crosshair; }
.designer-ruler > span { position: absolute; }
.designer-ruler-x > span { top: 0; height: 100%; border-left: 1px solid rgb(113 113 122 / 0.65); }
.designer-ruler-y > span { left: 0; width: 100%; border-top: 1px solid rgb(113 113 122 / 0.65); }
.designer-ruler-x small { position: absolute; top: 1px; left: 2px; }
.designer-ruler-y small { position: absolute; top: 2px; left: 1px; writing-mode: vertical-rl; }

.designer-field {
  z-index: 10;
  cursor: grab;
  border: 1px dashed transparent;
  background: transparent;
  transition: border-color 100ms, background-color 100ms, box-shadow 100ms;
}
.designer-field:hover { border-color: rgb(59 130 246 / 0.8); background: rgb(59 130 246 / 0.08); }
.designer-field.selected { z-index: 15; border: 1px solid rgb(37 99 235); background: rgb(59 130 246 / 0.1); box-shadow: none; }
.designer-field.selected:focus-visible { outline: none; }
.designer-field.dragging { cursor: grabbing; border-style: solid; background: rgb(59 130 246 / 0.16); transition: none; }
.designer-field.resizing { cursor: default; border-style: solid; background: rgb(59 130 246 / 0.14); transition: none; }
.designer-field.locked { cursor: pointer; }
.designer-field.locked.selected { border-color: rgb(245 158 11); background: rgb(245 158 11 / 0.09); }

.designer-inline-editor {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: block;
  min-width: 100%;
  min-height: 100%;
  overflow: visible;
  border: 0;
  background: transparent;
  padding: 0;
  color: transparent;
  caret-color: rgb(37 99 235);
  font-family: ui-sans-serif, system-ui, sans-serif;
  line-height: 1;
  outline: none;
  white-space: pre;
  cursor: text;
  user-select: text;
}
.designer-inline-editor::selection { background: rgb(59 130 246 / 0.22); }
.designer-inline-editor.uses-rendered-caret { caret-color: transparent; }
.designer-inline-data-editor {
  position: absolute;
  z-index: 3;
  box-sizing: border-box;
  border: 1px solid rgb(37 99 235);
  border-radius: 0.35rem;
  background: rgb(255 255 255 / 0.98);
  padding: 0 0.5rem;
  color: rgb(24 24 27);
  caret-color: rgb(37 99 235);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.75rem;
  line-height: 1;
  outline: none;
  box-shadow: 0 4px 12px rgb(24 24 27 / 0.18);
}
.designer-inline-data-editor::selection { background: rgb(59 130 246 / 0.22); }
.designer-inline-caret {
  position: absolute;
  z-index: 1100;
  width: 2px;
  transform-origin: 50% 0;
  pointer-events: none;
  border-radius: 9999px;
  background: rgb(37 99 235);
  box-shadow: 0 0 0 1px rgb(255 255 255 / 0.65);
  animation: designer-caret-blink 1.05s steps(1, end) infinite;
}
@keyframes designer-caret-blink { 50% { opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .designer-inline-caret { animation: none; } }

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
.designer-hidden-layers { border-top: 1px solid rgb(228 228 231); padding: 0.65rem; }
.designer-hidden-layers h3 { margin-bottom: 0.4rem; color: rgb(113 113 122); font-size: 0.58rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }
.designer-hidden-row { display: flex; align-items: center; gap: 0.5rem; border-radius: 0.5rem; padding: 0.35rem; color: rgb(82 82 91); }
.designer-hidden-row strong, .designer-hidden-row small { display: block; font-size: 0.62rem; line-height: 0.9rem; }
.designer-hidden-row small { color: rgb(113 113 122); }
.designer-hidden-row button { border: 1px solid rgb(228 228 231); border-radius: 0.35rem; padding: 0.2rem 0.4rem; font-size: 0.58rem; font-weight: 600; }
.designer-hidden-row button:hover { background: rgb(244 244 245); }

.designer-property-section { margin-top: 1rem; border-top: 1px solid rgb(228 228 231); padding-top: 0.8rem; }
.designer-property-section h4 { margin-bottom: 0.55rem; color: rgb(113 113 122); font-size: 0.6rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }

.designer-property-label { color: rgb(82 82 91); font-size: 0.65rem; font-weight: 600; }
.designer-property-label > span { float: right; color: rgb(113 113 122); font-size: 0.55rem; font-weight: 400; }
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

.designer-property-note, .designer-command-summary {
  margin-top: 0.45rem;
  color: rgb(113 113 122);
  font-size: 0.6rem;
  line-height: 0.95rem;
}

.designer-command-header {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}
.designer-command-header h4 { margin-bottom: 0.15rem; color: rgb(82 82 91); }
.designer-command-header code { color: rgb(37 99 235); font-size: 0.6rem; }
.designer-doc-link {
  display: inline-flex;
  width: 1.75rem;
  height: 1.75rem;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  margin-left: auto;
  border: 1px solid rgb(228 228 231);
  border-radius: 0.4rem;
  color: rgb(113 113 122);
}
.designer-doc-link:hover { background: rgb(244 244 245); color: rgb(24 24 27); }
.designer-command-summary { margin-top: 0.55rem; }
.designer-property-controls { margin-top: 0.75rem; }
.designer-property-control + .designer-property-control {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgb(244 244 245);
}
.designer-property-control > label,
label.designer-property-control > span {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
  color: rgb(82 82 91);
  font-size: 0.65rem;
  font-weight: 600;
}
.designer-property-control > label small {
  flex: 0 0 auto;
  color: rgb(161 161 170);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.55rem;
  font-weight: 400;
}
.designer-property-control > input,
.designer-property-control > select {
  display: block;
  width: 100%;
  min-height: 2rem;
  margin-top: 0.3rem;
  border: 1px solid rgb(228 228 231);
  border-radius: 0.45rem;
  background: white;
  padding-inline: 0.5rem;
  color: rgb(39 39 42);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.68rem;
  outline: none;
}
.designer-property-control > input:focus,
.designer-property-control > select:focus {
  border-color: rgb(59 130 246);
  box-shadow: 0 0 0 2px rgb(59 130 246 / 0.12);
}
.designer-property-help { margin-top: 0.3rem; color: rgb(113 113 122); font-size: 0.58rem; }
.designer-property-help summary {
  display: inline-flex;
  cursor: pointer;
  list-style: none;
  align-items: center;
  gap: 0.25rem;
  border-radius: 0.25rem;
  color: rgb(113 113 122);
  font-weight: 600;
}
.designer-property-help summary::-webkit-details-marker { display: none; }
.designer-property-help summary:hover { color: rgb(37 99 235); }
.designer-property-help p {
  margin-top: 0.35rem;
  border-left: 2px solid rgb(191 219 254);
  padding-left: 0.5rem;
  color: rgb(82 82 91);
  font-size: 0.58rem;
  line-height: 0.95rem;
}

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
.designer-danger-action:hover:not(:disabled) { background: rgb(255 241 242); }
.designer-danger-action:disabled { cursor: not-allowed; opacity: 0.4; }

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
.designer-doc-link:focus-visible, .designer-property-help summary:focus-visible {
  outline: 2px solid rgb(59 130 246);
  outline-offset: 2px;
}

@media (min-width: 768px) {
  .designer-root.embedded .designer-inspector {
    position: static;
    z-index: auto;
    display: none;
    width: min(16rem, 45%);
    max-height: none;
    overflow: visible;
    border-width: 0 0 0 1px;
    border-radius: 0;
    box-shadow: none;
  }
  .designer-root.embedded .designer-inspector.is-open { display: flex; }
}

@media (min-width: 1024px) {
  .designer-compact-tools, .designer-panel-close { display: none; }

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

  .designer-root.embedded .designer-compact-tools { display: flex; }
  .designer-root.embedded .designer-panel-close { display: inline-flex; }
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
  .designer-select-chevron { color: rgb(161 161 170); }
  .designer-tool:hover, .designer-tool-compact:hover { background: rgb(255 255 255 / 0.06); color: white; }
  .designer-icon-button:hover, .designer-icon-button.active, .designer-zoom-button:hover, .designer-label-tab.active { background: rgb(255 255 255 / 0.08); color: white; }
  .designer-arrange[open] > summary { background: rgb(255 255 255 / 0.08); color: white; }
  .designer-arrange-popover { border-color: rgb(255 255 255 / 0.1); background: rgb(9 9 11); color: rgb(212 212 216); }
  .designer-arrange-popover button, .designer-hidden-row button { border-color: rgb(255 255 255 / 0.1); }
  .designer-arrange-popover button:hover:not(:disabled), .designer-hidden-row button:hover { background: rgb(255 255 255 / 0.08); color: white; }
  .designer-ruler { background: rgb(9 9 11 / 0.82); color: rgb(212 212 216); }
  .designer-inline-data-editor { border-color: rgb(96 165 250); background: rgb(24 24 27 / 0.98); color: rgb(244 244 245); caret-color: rgb(147 197 253); }
  .designer-inspector.is-open { border-color: rgb(255 255 255 / 0.1); }
  .designer-sidebar-tabs { border-color: rgb(255 255 255 / 0.1); }
  .designer-sidebar-tab:hover { color: white; }
  .designer-sidebar-tab.active { background: rgb(255 255 255 / 0.08); color: white; }
  .designer-layer-row:hover { background: rgb(255 255 255 / 0.06); color: white; }
  .designer-layer-row.selected { border-color: rgb(59 130 246 / 0.35); background: rgb(59 130 246 / 0.12); color: rgb(147 197 253); }
  .designer-layer-icon { background: rgb(255 255 255 / 0.06); color: rgb(161 161 170); }
  .designer-layer-row.selected .designer-layer-icon { background: rgb(59 130 246 / 0.15); color: rgb(147 197 253); }
  .designer-layer-row small, .designer-layer-index { color: rgb(161 161 170); }
  .designer-hidden-layers { border-color: rgb(255 255 255 / 0.1); }
  .designer-hidden-row { color: rgb(212 212 216); }
  .designer-property-section { border-color: rgb(255 255 255 / 0.1); }
  .designer-property-label > span { color: rgb(161 161 170); }
  .designer-property-label input, .designer-content-input, .designer-property-control > input, .designer-property-control > select { border-color: rgb(255 255 255 / 0.1); background: rgb(24 24 27); color: rgb(244 244 245); }
  .designer-command-header h4, .designer-property-control > label, label.designer-property-control > span, .designer-property-help p { color: rgb(212 212 216); }
  .designer-property-control + .designer-property-control { border-color: rgb(255 255 255 / 0.06); }
  .designer-doc-link { border-color: rgb(255 255 255 / 0.1); color: rgb(161 161 170); }
  .designer-doc-link:hover { background: rgb(255 255 255 / 0.08); color: white; }
  .designer-property-help p { border-color: rgb(59 130 246 / 0.45); }
  .designer-secondary-action { border-color: rgb(255 255 255 / 0.1); color: rgb(212 212 216); }
  .designer-secondary-action:hover:not(:disabled) { background: rgb(255 255 255 / 0.08); color: white; }
  .designer-danger-action { border-color: rgb(244 63 94 / 0.25); color: rgb(253 164 175); }
  .designer-danger-action:hover { background: rgb(244 63 94 / 0.1); }
  .designer-shortcuts-dialog { border-color: rgb(255 255 255 / 0.1); background: rgb(9 9 11); }
  .designer-shortcut-row { border-color: rgb(255 255 255 / 0.06); color: rgb(212 212 216); }
  .designer-shortcut-row kbd { border-color: rgb(255 255 255 / 0.16); background: rgb(255 255 255 / 0.06); color: rgb(228 228 231); }
}
</style>
