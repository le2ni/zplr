<template>
  <div
    class="ide-shell flex h-dvh min-h-[560px] flex-col overflow-hidden bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100"
    @dragover.prevent
    @drop.prevent="handleDrop"
  >
    <a
      href="#zpl-source"
      class="sr-only z-50 rounded bg-white px-4 py-2 text-zinc-950 shadow focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
    >
      Skip to ZPL source
    </a>

    <header class="flex h-14 shrink-0 items-center border-b border-zinc-200 bg-white px-3 dark:border-white/10 dark:bg-zinc-950 sm:px-4">
      <a href="/" class="flex shrink-0 items-center gap-2.5 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500" aria-label="ZPLr home">
        <img src="../assets/logo.svg" alt="" class="h-7 w-auto dark:invert" />
      </a>

      <div class="mx-3 h-5 w-px bg-zinc-200 dark:bg-white/10" aria-hidden="true"></div>
      <div class="min-w-0">
        <h1 class="truncate text-sm font-semibold text-zinc-900 dark:text-white">ZPL Editor</h1>
        <p class="hidden truncate text-[11px] text-zinc-500 sm:block">
          {{ filename }}<span v-if="isDirty" aria-label="unsaved changes"> · Edited</span>
        </p>
      </div>

      <div class="editor-view-switch ml-4 hidden md:inline-flex" aria-label="Editor view">
        <button :class="{ active: editorView === 'source' }" type="button" :aria-pressed="editorView === 'source'" @click="showEditorView('source')">
          <IconApplicationBraces class="size-3.5" aria-hidden="true" /> Source
        </button>
        <button :class="{ active: editorView === 'visual' }" type="button" :aria-pressed="editorView === 'visual'" @click="showEditorView('visual')">
          <IconVectorSquareEdit class="size-3.5" aria-hidden="true" /> Designer
        </button>
      </div>

      <div class="ml-auto flex items-center gap-0.5 sm:gap-1">
        <button class="toolbar-button hidden md:inline-flex" type="button" title="New label" @click="newDocument">
          <IconFileOutline class="size-4" aria-hidden="true" />
          <span>New</span>
        </button>
        <button class="toolbar-button hidden md:inline-flex" type="button" title="Open ZPL file (⌘O)" @click="openFilePicker">
          <IconFolderOpenOutline class="size-4" aria-hidden="true" />
          <span>Open</span>
        </button>
        <button class="toolbar-button inline-flex" type="button" title="Save ZPL file (⌘S)" @click="downloadZpl">
          <IconContentSaveOutline class="size-4" aria-hidden="true" />
          <span class="hidden sm:inline">Save</span>
        </button>
        <button class="toolbar-button hidden xl:inline-flex" type="button" title="Save all open files as ZIP (⌘⇧S)" @click="downloadWorkspace">
          <IconFolderZipOutline class="size-4" aria-hidden="true" />
          <span>Save all</span>
        </button>
        <span class="mx-1 hidden h-5 w-px bg-zinc-200 sm:block dark:bg-white/10" aria-hidden="true"></span>
        <button class="toolbar-button hidden sm:inline-flex" type="button" title="Undo" @click="editorComponent?.undo()">
          <IconUndoVariant class="size-4" aria-hidden="true" />
          <span class="sr-only">Undo</span>
        </button>
        <button class="toolbar-button hidden sm:inline-flex" type="button" title="Redo" @click="editorComponent?.redo()">
          <IconRedoVariant class="size-4" aria-hidden="true" />
          <span class="sr-only">Redo</span>
        </button>
        <button class="toolbar-button hidden sm:inline-flex" type="button" title="Find in source" @click="editorComponent?.find()">
          <IconMagnify class="size-4" aria-hidden="true" />
          <span class="sr-only">Find in source</span>
        </button>
        <button class="toolbar-button inline-flex" type="button" title="Format ZPL (⌘⇧F)" @click="formatDocument">
          <IconFormatAlignLeft class="size-4" aria-hidden="true" />
          <span class="hidden lg:inline">Format</span>
        </button>
        <button class="toolbar-button hidden md:inline-flex" type="button" title="Command palette (⌘P)" @click="editorComponent?.commandPalette()">
          <IconConsoleLine class="size-4" aria-hidden="true" />
          <span class="hidden xl:inline">Palette</span>
        </button>
        <button class="toolbar-button inline-flex" type="button" title="Editor settings (⌘,)" @click="settingsOpen = true">
          <IconCogOutline class="size-4" aria-hidden="true" />
          <span class="sr-only">Editor settings</span>
        </button>
        <button class="ml-1 inline-flex h-8 items-center gap-1.5 rounded-lg bg-zinc-900 px-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200" type="button" title="Render now (⌘Enter)" @click="renderNow">
          <IconPlay class="size-4" aria-hidden="true" />
          <span class="hidden sm:inline">Render</span>
        </button>
      </div>
    </header>

    <nav class="flex h-10 shrink-0 items-center border-b border-zinc-200 bg-zinc-50 px-2 md:hidden dark:border-white/10 dark:bg-zinc-900" aria-label="Editor panes">
      <button class="mobile-pane-tab" :class="{ active: editorView === 'source' && mobilePane === 'code' }" type="button" @click="showEditorSource">
        <IconCodeTags class="size-4" aria-hidden="true" /> Source
      </button>
      <button class="mobile-pane-tab" :class="{ active: editorView === 'visual' }" type="button" @click="showEditorView('visual')">
        <IconVectorSquareEdit class="size-4" aria-hidden="true" /> Designer
      </button>
      <button class="mobile-pane-tab" :class="{ active: editorView === 'source' && mobilePane === 'preview' }" type="button" @click="showEditorPreview">
        <IconImageOutline class="size-4" aria-hidden="true" /> Preview
        <span v-if="errorCount" class="rounded-full bg-rose-100 px-1.5 text-[10px] text-rose-700 dark:bg-rose-400/15 dark:text-rose-300">{{ errorCount }}</span>
      </button>
    </nav>

    <div v-show="editorView === 'source'" ref="workbench" class="flex min-h-0 flex-1 overflow-hidden">
      <aside class="hidden w-60 shrink-0 flex-col border-r border-zinc-200 bg-zinc-50/70 lg:flex dark:border-white/10 dark:bg-zinc-900/50" aria-label="Workspace sidebar">
        <div class="grid h-10 shrink-0 grid-cols-2 border-b border-zinc-200 px-2 dark:border-white/10">
          <button class="sidebar-tab" :class="{ active: sidebarMode === 'files' }" type="button" @click="sidebarMode = 'files'">Files</button>
          <button class="sidebar-tab" :class="{ active: sidebarMode === 'commands' }" type="button" @click="sidebarMode = 'commands'">Commands</button>
        </div>

        <div v-if="sidebarMode === 'files'" class="min-h-0 flex-1 overflow-y-auto py-2">
          <section>
            <div class="sidebar-heading">
              <span>Open editors</span>
              <div class="flex items-center gap-0.5">
                <button class="icon-button-small" type="button" title="New label" @click="newDocument"><IconPlus class="size-3.5" aria-hidden="true" /><span class="sr-only">New label</span></button>
                <button class="icon-button-small" type="button" title="Open file" @click="openFilePicker"><IconFolderOpenOutline class="size-3.5" aria-hidden="true" /><span class="sr-only">Open file</span></button>
              </div>
            </div>
            <div
              v-for="document in documents"
              :key="document.id"
              class="open-editor-row group"
              :class="{ active: document.id === activeDocumentId }"
            >
              <button
                class="open-editor-main"
                type="button"
                :title="document.filename"
                @click="activateDocument(document.id)"
                @dblclick="renameDocument(document.id)"
              >
                <IconFileDocumentOutline class="size-4 shrink-0 text-zinc-500" aria-hidden="true" />
                <span class="min-w-0 flex-1 truncate">{{ document.filename }}</span>
                <span v-if="document.source !== document.savedSource" class="size-2 shrink-0 rounded-full bg-zinc-500" title="Edited"></span>
              </button>
              <button class="open-editor-action" type="button" :title="`Duplicate ${document.filename}`" @click="duplicateDocument(document.id)">
                <IconContentCopy class="size-3" aria-hidden="true" /><span class="sr-only">Duplicate {{ document.filename }}</span>
              </button>
              <button class="open-editor-action" type="button" :title="`Close ${document.filename}`" @click="closeDocument(document.id)">
                <IconClose class="size-3.5" aria-hidden="true" /><span class="sr-only">Close {{ document.filename }}</span>
              </button>
            </div>
          </section>

          <section class="mt-3 border-t border-zinc-200 pt-2 dark:border-white/10">
            <div class="sidebar-heading"><span>Examples</span></div>
            <button v-for="sample in samples" :key="sample.id" class="file-row" :class="{ selected: selectedSample === sample.id }" type="button" @click="loadSample(sample.id)">
              <IconFileOutline class="size-4 text-zinc-500" aria-hidden="true" />
              <span class="min-w-0 flex-1 truncate">{{ sample.name }}</span>
            </button>
          </section>

          <section class="mt-3 border-t border-zinc-200 pt-2 dark:border-white/10">
            <div class="sidebar-heading">
              <span>Outline</span>
              <span class="font-normal text-zinc-500">{{ documentOutline.length }}</span>
            </div>
            <p v-if="!documentOutline.length" class="px-3 py-4 text-xs leading-5 text-zinc-500">Add a <code>^XA</code>…<code>^XZ</code> format to see its structure.</p>
            <button v-for="item in documentOutline.slice(0, 100)" :key="`${item.span.start}-${item.command}`" class="outline-row" type="button" :title="item.name" @click="focusSpan(item.span)">
              <span class="w-8 shrink-0 text-right font-mono text-[10px] text-zinc-500">{{ item.line }}</span>
              <span class="w-8 shrink-0 font-mono text-xs font-semibold" :class="categoryTextClass(item.category)">{{ item.command }}</span>
              <span class="min-w-0 flex-1 truncate text-zinc-500">{{ item.name }}</span>
            </button>
          </section>
        </div>

        <div v-else class="flex min-h-0 flex-1 flex-col">
          <template v-if="selectedCommandInfo">
            <div class="shrink-0 border-b border-zinc-200 p-3 dark:border-white/10">
              <button class="command-back" type="button" @click="selectedCommand = undefined">
                <span aria-hidden="true">←</span> All commands
              </button>
              <div class="mt-2 flex items-start gap-2">
                <code class="rounded bg-white px-1.5 py-1 text-sm font-bold shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-950 dark:ring-white/10" :class="categoryTextClass(selectedCommandInfo.capability.category)">{{ selectedCommandInfo.capability.canonical }}</code>
                <div class="min-w-0">
                  <h2 class="text-xs font-semibold leading-5 text-zinc-800 dark:text-zinc-100">{{ selectedCommandInfo.definition.title }}</h2>
                  <p class="text-[10px] text-zinc-500">{{ selectedCommandInfo.capability.category }} · {{ selectedCommandInfo.capability.scope }} · {{ selectedCommandInfo.capability.status }}</p>
                </div>
              </div>
            </div>

            <div class="min-h-0 flex-1 overflow-y-auto px-3 py-3">
              <p class="text-[11px] leading-5 text-zinc-600 dark:text-zinc-400">{{ selectedCommandInfo.definition.summary }}</p>

              <section v-for="(signature, signatureIndex) in selectedCommandInfo.definition.signatures" :key="signature.syntax" class="command-doc-section">
                <h3 class="command-doc-heading">Syntax<span v-if="selectedCommandInfo.definition.signatures.length > 1"> {{ signatureIndex + 1 }}</span></h3>
                <code class="command-syntax">{{ signature.syntax }}</code>
                <p v-if="signature.label" class="mt-1 text-[10px] leading-4 text-zinc-500">{{ signature.label }}</p>

                <div v-if="signature.parameters.length" class="mt-3 space-y-3">
                  <article v-for="parameter in signature.parameters" :key="`${signature.syntax}-${parameter.slot}-${parameter.component}-${parameter.key}`">
                    <div class="flex items-baseline gap-1.5">
                      <code class="rounded bg-zinc-100 px-1 py-0.5 text-[10px] font-bold text-zinc-700 dark:bg-white/10 dark:text-zinc-200">{{ parameter.key }}</code>
                      <h4 class="text-[10px] font-semibold text-zinc-700 dark:text-zinc-200">{{ parameter.name }}</h4>
                      <span v-if="parameter.required" class="text-[9px] text-rose-600 dark:text-rose-300">required</span>
                    </div>
                    <p class="mt-1 text-[10px] leading-4 text-zinc-500">{{ parameter.documentation }}</p>
                    <div v-if="parameter.choices.length" class="mt-1.5 flex flex-wrap gap-1" aria-label="Suggested values">
                      <code v-for="choice in parameter.choices.slice(0, 12)" :key="choice" class="command-choice">{{ choice }}</code>
                    </div>
                  </article>
                </div>
                <p v-else class="mt-2 text-[10px] text-zinc-500">No parameters.</p>
              </section>

              <a :href="selectedCommandInfo.definition.reference" target="_blank" rel="noreferrer" class="mt-4 flex items-center gap-2 rounded-md py-1 text-[10px] font-medium text-zinc-500 transition hover:text-zinc-900 dark:hover:text-white">
                <IconBookOpenVariant class="size-3.5" aria-hidden="true" /> Official command reference
                <IconOpenInNew class="ml-auto size-3" aria-hidden="true" />
              </a>
            </div>

            <div class="shrink-0 border-t border-zinc-200 p-2 dark:border-white/10">
              <button class="command-insert-primary" type="button" @click="insertCommand(selectedCommandInfo.capability.canonical)">
                <IconPlus class="size-3.5" aria-hidden="true" /> Insert parameter snippet
              </button>
            </div>
          </template>

          <template v-else>
            <div class="shrink-0 border-b border-zinc-200 p-2 dark:border-white/10">
              <label class="relative block">
                <span class="sr-only">Search all ZPL commands and parameters</span>
                <IconMagnify class="pointer-events-none absolute top-2 left-2 size-4 text-zinc-500" aria-hidden="true" />
                <input v-model.trim="commandQuery" class="h-8 w-full rounded-md border border-zinc-200 bg-white pr-2 pl-8 text-xs outline-none placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 dark:border-white/10 dark:bg-zinc-950 dark:focus:ring-white/10" :placeholder="`Search ${zplLanguageCoverage.commands} commands…`" />
              </label>
              <p class="mt-2 px-1 text-[10px] text-zinc-500">Inspect docs or insert a parameter-aware snippet.</p>
            </div>
            <div class="min-h-0 flex-1 overflow-y-auto py-1">
              <div v-for="capability in visibleCapabilities" :key="capability.canonical" class="command-entry">
                <button class="command-row" type="button" :title="`Open ${capability.canonical} documentation`" @click="selectedCommand = capability.canonical">
                  <span class="w-9 shrink-0 font-mono text-xs font-bold" :class="categoryTextClass(capability.category)">{{ capability.canonical }}</span>
                  <span class="min-w-0 flex-1">
                    <span class="block truncate text-xs font-medium text-zinc-700 dark:text-zinc-200">{{ getZplCommandDefinition(capability.canonical)?.title ?? capability.name }}</span>
                    <span class="mt-0.5 block text-[10px] text-zinc-500">{{ capability.category }} · {{ capability.scope }}</span>
                  </span>
                  <span class="size-1.5 shrink-0 rounded-full" :class="statusDotClass(capability.status)" :title="capability.status"></span>
                </button>
                <button class="command-insert" type="button" :title="`Insert ${capability.canonical} snippet`" @click="insertCommand(capability.canonical)">
                  <IconPlus class="size-3.5" aria-hidden="true" /><span class="sr-only">Insert {{ capability.canonical }}</span>
                </button>
              </div>
              <p v-if="!visibleCapabilities.length" class="px-3 py-6 text-center text-xs text-zinc-500">No matching command or parameter.</p>
            </div>
          </template>
        </div>

        <div v-if="sidebarMode === 'files' || !selectedCommandInfo" class="shrink-0 border-t border-zinc-200 px-3 py-2 dark:border-white/10">
          <a href="https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands.html" target="_blank" rel="noreferrer" class="flex items-center gap-2 rounded-md py-1 text-xs text-zinc-500 transition hover:text-zinc-900 dark:hover:text-white">
            <IconBookOpenVariant class="size-4" aria-hidden="true" /> Official ZPL reference
            <IconOpenInNew class="ml-auto size-3" aria-hidden="true" />
          </a>
        </div>
      </aside>

      <main id="zpl-source" class="code-pane flex min-w-0 flex-1 flex-col bg-white dark:bg-zinc-950" :class="{ 'mobile-hidden': mobilePane !== 'code' }">
        <div class="flex h-9 shrink-0 items-end overflow-x-auto border-b border-zinc-200 bg-zinc-50/70 px-2 dark:border-white/10 dark:bg-zinc-900/50" aria-label="Open editor tabs">
          <div
            v-for="document in documents"
            :key="document.id"
            class="editor-tab group"
            :class="{ active: document.id === activeDocumentId }"
            @dblclick="renameDocument(document.id)"
          >
            <button class="flex h-full min-w-0 items-center gap-2 pl-3" type="button" :title="document.filename" @click="activateDocument(document.id)">
              <IconFileDocumentOutline class="size-3.5 shrink-0 text-zinc-500" aria-hidden="true" />
              <span class="max-w-44 truncate">{{ document.filename }}</span>
              <span v-if="document.source !== document.savedSource" class="size-1.5 shrink-0 rounded-full bg-zinc-500" aria-label="Edited"></span>
            </button>
            <button class="tab-close-button" type="button" :title="`Close ${document.filename}`" @click="closeDocument(document.id)">
              <IconClose class="size-3.5" aria-hidden="true" /><span class="sr-only">Close {{ document.filename }}</span>
            </button>
          </div>
        </div>

        <div class="flex h-9 shrink-0 items-center justify-between border-b border-zinc-100 px-3 text-[11px] text-zinc-500 dark:border-white/5">
          <span class="truncate">workspace <span class="mx-1 text-zinc-300">/</span> {{ filename }}</span>
          <div class="flex items-center gap-1">
            <button class="icon-button-small" type="button" title="Find" @click="editorComponent?.find()"><IconMagnify class="size-3.5" aria-hidden="true" /><span class="sr-only">Find</span></button>
            <button class="icon-button-small" type="button" title="Show ZPL completions" @click="editorComponent?.triggerSuggest()"><IconCodeTags class="size-3.5" aria-hidden="true" /><span class="sr-only">Show ZPL completions</span></button>
            <button class="icon-button-small" type="button" title="Format document" @click="formatDocument"><IconFormatAlignLeft class="size-3.5" aria-hidden="true" /><span class="sr-only">Format document</span></button>
          </div>
        </div>

        <div class="min-h-[180px] flex-1">
          <MonacoEditor
            ref="editorComponent"
            v-model="source"
            :document-id="activeDocumentId"
            :workspace-documents="documents"
            :filename="filename"
            :capabilities="commandCapabilities"
            :diagnostics="diagnostics"
            :preferences="editorPreferences"
            :cursor-position="editorCursor"
            :highlight-range="highlightRange"
            @update:workspace-document="updateWorkspaceDocument"
            @activate:workspace-document="activateDocument"
            @update:cursor-position="editorCursor = $event"
            @update:cursor-state="cursorState = $event"
          />
        </div>

        <section v-if="problemsOpen" class="flex h-44 shrink-0 flex-col border-t border-zinc-200 bg-white dark:border-white/10 dark:bg-zinc-950" aria-label="Problems">
          <div class="flex h-9 shrink-0 items-center border-b border-zinc-100 px-3 dark:border-white/5">
            <span class="text-[11px] font-semibold tracking-wide text-zinc-700 uppercase dark:text-zinc-300">Problems</span>
            <span class="ml-2 rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-500 dark:bg-white/5">{{ diagnostics.length }}</span>
            <div class="ml-auto flex items-center gap-3 text-[10px] text-zinc-500">
              <span v-if="errorCount" class="text-rose-600 dark:text-rose-300">{{ errorCount }} errors</span>
              <span v-if="warningCount" class="text-amber-600 dark:text-amber-300">{{ warningCount }} warnings</span>
              <button class="icon-button-small" type="button" title="Close problems" @click="problemsOpen = false"><IconClose class="size-3.5" aria-hidden="true" /><span class="sr-only">Close problems</span></button>
            </div>
          </div>
          <div class="min-h-0 flex-1 overflow-y-auto">
            <div v-if="!diagnostics.length" class="flex h-full items-center justify-center gap-2 text-xs text-zinc-500">
              <IconCheckCircleOutline class="size-4 text-emerald-600" aria-hidden="true" /> No problems detected
            </div>
            <button v-for="(diagnostic, index) in diagnostics" :key="diagnosticKey(diagnostic, index)" class="diagnostic-row" type="button" :disabled="!diagnostic.span" @click="focusSpan(diagnostic.span)">
              <IconAlertCircleOutline v-if="diagnostic.severity === 'error'" class="mt-0.5 size-3.5 shrink-0 text-rose-600" aria-hidden="true" />
              <IconAlertCircleOutline v-else-if="diagnostic.severity === 'warning'" class="mt-0.5 size-3.5 shrink-0 text-amber-600" aria-hidden="true" />
              <IconInformationOutline v-else class="mt-0.5 size-3.5 shrink-0 text-sky-600" aria-hidden="true" />
              <span class="min-w-0 flex-1 truncate"><span class="font-medium text-zinc-700 dark:text-zinc-200">{{ diagnostic.message }}</span> <span class="ml-1 font-mono text-zinc-500">{{ diagnostic.code }}</span></span>
              <span v-if="diagnostic.span" class="shrink-0 font-mono text-[10px] text-zinc-500">Ln {{ lineAt(diagnostic.span.start) }}</span>
            </button>
          </div>
        </section>
      </main>

      <div
        class="splitter hidden w-1.5 shrink-0 cursor-col-resize bg-zinc-100 transition hover:bg-zinc-300 md:block dark:bg-zinc-900 dark:hover:bg-zinc-700"
        role="separator"
        aria-label="Resize source and preview panes"
        aria-orientation="vertical"
        :aria-valuenow="Math.round(splitPercent)"
        aria-valuemin="35"
        aria-valuemax="72"
        tabindex="0"
        @pointerdown="startResize"
        @keydown="resizeWithKeyboard"
      ></div>

      <aside class="preview-pane flex min-w-0 flex-1 flex-col border-l border-zinc-200 bg-zinc-50 dark:border-white/10 dark:bg-zinc-900/60" :class="{ 'mobile-hidden': mobilePane !== 'preview' }" aria-label="Label preview">
        <div class="flex min-h-12 shrink-0 flex-wrap items-center gap-2 border-b border-zinc-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-zinc-950">
          <div class="min-w-0">
            <h2 class="flex items-center gap-2 text-xs font-semibold text-zinc-900 dark:text-white">
              Preview
              <span v-if="previewStale" class="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-medium text-amber-700 dark:bg-amber-400/15 dark:text-amber-300">Out of date</span>
              <span v-else-if="autoRender" class="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-medium text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300">Live</span>
            </h2>
            <p v-if="activeLabel" class="truncate text-[10px] text-zinc-500">{{ activeLabel.width }} × {{ activeLabel.height }} dots · {{ dpi }} dpi</p>
            <p v-else class="text-[10px] text-zinc-500">No renderable label</p>
          </div>
          <div class="ml-auto flex items-center gap-1">
            <label class="sr-only" for="density-select">Print density</label>
            <select id="density-select" v-model.number="printDensity" class="compact-select" title="Print density">
              <option :value="6">150 dpi</option>
              <option :value="8">203 dpi</option>
              <option :value="12">300 dpi</option>
              <option :value="24">600 dpi</option>
            </select>
            <button class="toolbar-button inline-flex" :class="{ 'bg-zinc-100 text-zinc-900 dark:bg-white/10 dark:text-white': previewSettingsOpen }" type="button" title="Printer and preview settings" :aria-expanded="previewSettingsOpen" @click="previewSettingsOpen = !previewSettingsOpen">
              <IconTuneVariant class="size-4" aria-hidden="true" /><span class="sr-only">Printer and preview settings</span>
            </button>
            <button v-if="labels.length > 1" class="toolbar-button inline-flex" type="button" title="Download all labels as ZIP" @click="downloadAllPngs">
              <IconDownloadMultipleOutline class="size-4" aria-hidden="true" /><span class="sr-only">Download all labels as ZIP</span>
            </button>
            <button class="toolbar-button inline-flex" type="button" :disabled="!activeLabel" title="Download PNG" @click="downloadPng">
              <IconDownloadOutline class="size-4" aria-hidden="true" /><span class="hidden xl:inline">PNG</span>
            </button>
          </div>
        </div>

        <div v-if="previewSettingsOpen" class="shrink-0 border-b border-zinc-200 bg-white px-3 py-3 dark:border-white/10 dark:bg-zinc-950">
          <div class="grid grid-cols-2 gap-3">
            <label class="text-[10px] font-medium text-zinc-500">
              Label size
              <select v-model="sizeMode" class="compact-select mt-1 w-full">
                <option value="zpl">From ^PW / ^LL</option>
                <option value="custom">Custom dots</option>
              </select>
            </label>
            <label class="text-[10px] font-medium text-zinc-500">
              Render mode
              <select v-model="strictMode" class="compact-select mt-1 w-full">
                <option :value="false">Compatible</option>
                <option :value="true">Strict diagnostics</option>
              </select>
            </label>
            <label v-if="sizeMode === 'custom'" class="text-[10px] font-medium text-zinc-500">
              Width (dots)
              <input v-model.number="overrideWidth" class="compact-input mt-1 w-full" type="number" min="1" max="8192" step="1" />
            </label>
            <label v-if="sizeMode === 'custom'" class="text-[10px] font-medium text-zinc-500">
              Height (dots)
              <input v-model.number="overrideHeight" class="compact-input mt-1 w-full" type="number" min="1" max="8192" step="1" />
            </label>
          </div>
          <div class="mt-3 flex items-center justify-between border-t border-zinc-100 pt-3 dark:border-white/5">
            <label class="flex items-center gap-2 text-[10px] font-medium text-zinc-600 dark:text-zinc-300">
              <input v-model="autoRender" class="size-3.5 accent-zinc-900 dark:accent-white" type="checkbox" />
              Render automatically while typing
            </label>
            <button v-if="!autoRender || previewStale" class="rounded-md bg-zinc-900 px-2.5 py-1.5 text-[10px] font-semibold text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-950" type="button" @click="renderNow">Render now</button>
          </div>
        </div>

        <div v-if="labels.length > 1" class="flex h-9 shrink-0 items-center gap-1 overflow-x-auto border-b border-zinc-200 bg-white px-2 dark:border-white/10 dark:bg-zinc-950">
          <button v-for="(_, index) in labels" :key="index" class="label-tab" :class="{ active: activeLabelIndex === index }" type="button" @click="activeLabelIndex = index">Label {{ index + 1 }}</button>
        </div>

        <div class="preview-grid relative min-h-0 flex-1 overflow-auto p-5 sm:p-7" tabindex="0" aria-label="Scrollable rendered label canvas">
          <button v-if="previewStale && !rendering" class="absolute top-3 right-3 z-10 rounded-lg border border-amber-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-amber-700 shadow-sm hover:bg-amber-50 dark:border-amber-400/20 dark:bg-zinc-950 dark:text-amber-300" type="button" @click="renderNow">Render updated source</button>
          <div v-if="rendering" class="absolute inset-0 z-10 flex items-center justify-center bg-zinc-50/70 backdrop-blur-[1px] dark:bg-zinc-900/70" role="status" aria-live="polite">
            <span class="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-500 shadow-sm dark:border-white/10 dark:bg-zinc-950">Rendering label…</span>
          </div>
          <div v-if="renderFailure" class="mx-auto max-w-md rounded-xl border border-rose-200 bg-white p-4 text-sm text-rose-700 shadow-sm dark:border-rose-400/20 dark:bg-zinc-950 dark:text-rose-200">{{ renderFailure }}</div>
          <div v-else-if="previewUrl" class="flex min-h-full min-w-full items-center justify-center">
            <img
              :src="previewUrl"
              alt="Rendered ZPL label"
              class="block cursor-crosshair bg-white shadow-xl shadow-zinc-900/15 ring-1 ring-zinc-900/10"
              :class="{ 'max-h-full max-w-full object-contain': fitPreview }"
              :style="previewImageStyle"
              @click="selectRenderedField"
            />
          </div>
          <div v-else class="flex min-h-full items-center justify-center text-center text-xs leading-5 text-zinc-500">
            Enter a complete <code class="mx-1">^XA</code>…<code class="mx-1">^XZ</code> label to preview it.
          </div>
        </div>

        <div class="flex h-10 shrink-0 items-center border-t border-zinc-200 bg-white px-3 dark:border-white/10 dark:bg-zinc-950">
          <div class="flex items-center rounded-md border border-zinc-200 dark:border-white/10">
            <button class="zoom-button" type="button" title="Zoom out" @click="zoom = Math.max(25, zoom - 10)"><IconMagnifyMinusOutline class="size-3.5" aria-hidden="true" /><span class="sr-only">Zoom out</span></button>
            <button class="min-w-12 border-x border-zinc-200 px-2 py-1 text-[10px] text-zinc-500 dark:border-white/10" type="button" :aria-pressed="fitPreview" @click="fitPreview = !fitPreview">{{ fitPreview ? "Fit" : `${zoom}%` }}</button>
            <button class="zoom-button" type="button" title="Zoom in" @click="zoom = Math.min(200, zoom + 10)"><IconMagnifyPlusOutline class="size-3.5" aria-hidden="true" /><span class="sr-only">Zoom in</span></button>
          </div>
          <button class="ml-2 text-[10px] text-zinc-500 hover:text-zinc-900 dark:hover:text-white" type="button" @click="fitPreview = !fitPreview"><IconFitToScreenOutline class="mr-1 inline size-3.5" aria-hidden="true" />Fit label</button>
          <span class="ml-auto text-[10px] text-zinc-500">Click a field to reveal its source</span>
        </div>

        <div class="grid shrink-0 grid-cols-3 border-t border-zinc-200 bg-white dark:border-white/10 dark:bg-zinc-950">
          <div class="preview-stat"><span>Labels</span><strong>{{ labels.length }}</strong></div>
          <div class="preview-stat border-x border-zinc-200 dark:border-white/10"><span>Commands</span><strong>{{ parsedCommandCount }}</strong></div>
          <div class="preview-stat"><span>Raster</span><strong>{{ activeLabel ? formatBytes(activeLabel.raster.data.byteLength) : "—" }}</strong></div>
        </div>
      </aside>
    </div>

    <VisualEditor
      v-if="editorView === 'visual'"
      :source="source"
      :filename="filename"
      :label="activeLabel"
      :preview-url="previewUrl"
      :rendering="rendering"
      :render-failure="renderFailure"
      :active-label-index="activeLabelIndex"
      :label-count="labels.length"
      :print-density="printDensity"
      @edit="applyVisualEdit"
      @select-source="focusSpan"
      @update:active-label-index="activeLabelIndex = $event"
    />

    <div v-if="settingsOpen" class="fixed inset-0 z-40 flex justify-end bg-zinc-950/15 backdrop-blur-[1px]" @mousedown.self="settingsOpen = false">
      <section class="m-3 flex w-[min(24rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl shadow-zinc-950/20 dark:border-white/10 dark:bg-zinc-950" role="dialog" aria-modal="true" aria-labelledby="editor-settings-title">
        <header class="flex h-12 shrink-0 items-center border-b border-zinc-200 px-4 dark:border-white/10">
          <IconCogOutline class="mr-2 size-4 text-zinc-500" aria-hidden="true" />
          <h2 id="editor-settings-title" class="text-sm font-semibold">Editor settings</h2>
          <button class="icon-button-small ml-auto" type="button" title="Close settings" @click="settingsOpen = false"><IconClose class="size-4" aria-hidden="true" /><span class="sr-only">Close settings</span></button>
        </header>

        <div class="min-h-0 flex-1 overflow-y-auto p-4">
          <div class="space-y-4">
            <label class="settings-field">
              <span><strong>Editor theme</strong><small>The clean light theme remains the default.</small></span>
              <select v-model="editorPreferences.theme" class="settings-select">
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">System</option>
              </select>
            </label>
            <label class="settings-field items-center">
              <span><strong>Font size</strong><small>{{ editorPreferences.fontSize }} px</small></span>
              <input v-model.number="editorPreferences.fontSize" class="w-32 accent-zinc-900" type="range" min="10" max="24" step="1" />
            </label>
            <label class="settings-field">
              <span><strong>Whitespace</strong><small>Choose when spaces and tabs are visible.</small></span>
              <select v-model="editorPreferences.renderWhitespace" class="settings-select">
                <option value="none">Hidden</option>
                <option value="selection">Selection</option>
                <option value="boundary">Boundary</option>
                <option value="trailing">Trailing</option>
                <option value="all">All</option>
              </select>
            </label>
            <label class="settings-toggle">
              <span><strong>Word wrap</strong><small>Wrap long field-data lines.</small></span>
              <input v-model="editorPreferences.wordWrap" type="checkbox" />
            </label>
            <label class="settings-toggle">
              <span><strong>Minimap</strong><small>Show the document overview.</small></span>
              <input v-model="editorPreferences.minimap" type="checkbox" />
            </label>
          </div>

          <div class="mt-6 border-t border-zinc-200 pt-4 dark:border-white/10">
            <h3 class="text-[11px] font-bold tracking-wide text-zinc-500 uppercase">Keyboard</h3>
            <dl class="mt-2 grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 text-xs">
              <dt>Command palette</dt><dd><kbd>⌘ P</kbd> / <kbd>F1</kbd></dd>
              <dt>Save / save all</dt><dd><kbd>⌘ S</kbd> · <kbd>⌘ ⇧ S</kbd></dd>
              <dt>New / open file</dt><dd><kbd>⌘ N</kbd> · <kbd>⌘ O</kbd></dd>
              <dt>Switch file</dt><dd><kbd>Ctrl Tab</kbd></dd>
              <dt>Format document</dt><dd><kbd>⌘ ⇧ F</kbd></dd>
              <dt>Render label</dt><dd><kbd>⌘ Enter</kbd></dd>
              <dt>Quick fix</dt><dd><kbd>⌥ Enter</kbd></dd>
              <dt>Move designer field</dt><dd><kbd>← ↑ ↓ →</kbd> · <kbd>⇧</kbd> 10 dots</dd>
            </dl>
          </div>
        </div>

        <footer class="flex h-12 shrink-0 items-center justify-between border-t border-zinc-200 px-4 dark:border-white/10">
          <button class="text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white" type="button" @click="resetEditorPreferences">Reset defaults</button>
          <button class="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-950" type="button" @click="settingsOpen = false">Done</button>
        </footer>
      </section>
    </div>

    <footer class="flex h-6 shrink-0 items-center bg-zinc-900 px-2 text-[10px] text-zinc-300 dark:bg-white dark:text-zinc-700">
      <button class="status-button" type="button" @click="problemsOpen = !problemsOpen">
        <IconAlertCircleOutline class="size-3" aria-hidden="true" />
        <span>{{ errorCount }}</span>
        <span class="ml-1 text-zinc-400 dark:text-zinc-500">△ {{ warningCount }}</span>
      </button>
      <span class="ml-3 hidden sm:inline">{{ documents.length }} open<span v-if="dirtyDocumentCount"> · {{ dirtyDocumentCount }} unsaved</span></span>
      <span class="ml-auto">Ln {{ cursorState.line }}, Col {{ cursorState.column }}</span>
      <span v-if="cursorState.selectionLength" class="ml-3 hidden sm:inline">{{ cursorState.selectionLength }} selected</span>
      <span class="ml-3 hidden sm:inline">UTF-8</span>
      <button class="status-button ml-3" type="button" @click="sidebarMode = 'commands'">ZPL II</button>
      <span class="ml-3 hidden md:inline">{{ zplLanguageCoverage.commands }} commands · {{ zplLanguageCoverage.parameters }} parameters</span>
      <span class="ml-3 flex items-center gap-1 text-emerald-300 dark:text-emerald-700"><span class="size-1.5 rounded-full bg-current"></span> Local-only</span>
    </footer>

    <input ref="fileInput" class="sr-only" type="file" accept=".zpl,.prn,text/plain" multiple aria-label="Open ZPL files" @change="handleFileInput" />
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";
import {
  IconAlertCircleOutline,
  IconApplicationBraces,
  IconBookOpenVariant,
  IconCheckCircleOutline,
  IconClose,
  IconCodeTags,
  IconCogOutline,
  IconConsoleLine,
  IconContentCopy,
  IconContentSaveOutline,
  IconDownloadMultipleOutline,
  IconDownloadOutline,
  IconFileDocumentOutline,
  IconFileOutline,
  IconFitToScreenOutline,
  IconFolderOpenOutline,
  IconFolderZipOutline,
  IconFormatAlignLeft,
  IconImageOutline,
  IconInformationOutline,
  IconMagnify,
  IconMagnifyMinusOutline,
  IconMagnifyPlusOutline,
  IconOpenInNew,
  IconPlay,
  IconPlus,
  IconRedoVariant,
  IconTuneVariant,
  IconUndoVariant,
  IconVectorSquareEdit,
} from "@iconify-prerendered/vue-mdi";
import { zipSync } from "fflate";
import shippingSample from "../../fixtures/zplr.zpl?raw";
import retailSample from "../../fixtures/retail-upc-ean.zpl?raw";
import assetSample from "../../fixtures/asset-matrix-pdf417.zpl?raw";
import storedSample from "../../fixtures/stored-resources.zpl?raw";
import {
  commandCapabilities,
  findHighlightRegionAtPoint,
  parseDocument,
  renderZpl,
  type CommandCapabilityStatus,
  type CommandCategory,
  type PrintDensity,
  type RenderedLabel,
  type SourceSpan,
  type ZplDiagnostic,
} from "../../src/index.web";
import type MonacoEditorComponent from "./MonacoEditor.vue";
import type { EditorCursorState, EditorPreferences } from "./MonacoEditor.vue";
import type { SourceEdit } from "../visualEditorSource";
import {
  getZplCommandDefinition,
  validateZplParameters,
  zplLanguageCoverage,
} from "../zplLanguage";

const MonacoEditor = defineAsyncComponent(() => import("./MonacoEditor.vue"));
const VisualEditor = defineAsyncComponent(() => import("./VisualEditor.vue"));
type MonacoEditorApi = InstanceType<typeof MonacoEditorComponent>;
type SampleId = (typeof samples)[number]["id"];
type EditorView = "source" | "visual";

const samples = [
  { id: "shipping", name: "Shipping label", filename: "shipping-label.zpl", source: shippingSample },
  { id: "retail", name: "Retail UPC / EAN", filename: "retail-barcode.zpl", source: retailSample },
  { id: "asset", name: "Data Matrix / PDF417", filename: "asset-label.zpl", source: assetSample },
  { id: "stored", name: "Stored resources", filename: "stored-resources.zpl", source: storedSample },
] as const;

interface WorkspaceDocument {
  id: string;
  filename: string;
  source: string;
  savedSource: string;
  cursorPosition: number;
  sampleId?: SampleId;
}

interface StoredWorkspace {
  version: 2;
  activeDocumentId: string;
  documents: WorkspaceDocument[];
  view?: EditorView;
  preferences?: EditorPreferences;
  preview?: PreviewPreferences;
}

interface PreviewPreferences {
  printDensity: PrintDensity;
  autoRender: boolean;
  strict: boolean;
  sizeMode: "zpl" | "custom";
  width: number;
  height: number;
}

const defaultEditorPreferences: EditorPreferences = {
  theme: "light",
  fontSize: 13,
  wordWrap: true,
  minimap: true,
  renderWhitespace: "selection",
};
const defaultPreviewPreferences: PreviewPreferences = {
  printDensity: 8,
  autoRender: true,
  strict: false,
  sizeMode: "zpl",
  width: 812,
  height: 1218,
};
const workspaceKey = "zplr.editor.workspace.v2";
const legacyWorkspaceKey = "zplr.editor.workspace.v1";
const initialWorkspace = restoreWorkspace();
const documents = ref<WorkspaceDocument[]>(initialWorkspace?.documents ?? [
  createWorkspaceDocument(shippingSample, "shipping-label.zpl", { sampleId: "shipping" }),
]);
const activeDocumentId = ref(initialWorkspace?.activeDocumentId ?? documents.value[0]!.id);
const editorView = ref<EditorView>(initialWorkspace?.view ?? "source");
const activeDocument = computed<WorkspaceDocument>(() =>
  documents.value.find((document) => document.id === activeDocumentId.value) ?? documents.value[0]!
);
const source = computed<string>({
  get: () => activeDocument.value.source,
  set: (value) => { activeDocument.value.source = value; },
});
const filename = computed<string>({
  get: () => activeDocument.value.filename,
  set: (value) => { activeDocument.value.filename = value; },
});
const selectedSample = computed<SampleId | "custom">(() =>
  activeDocument.value.sampleId ?? samples.find((sample) => sample.source === source.value)?.id ?? "custom"
);
const editorPreferences = ref<EditorPreferences>({
  ...defaultEditorPreferences,
  ...initialWorkspace?.preferences,
});
const initialPreviewPreferences = initialWorkspace?.preview ?? defaultPreviewPreferences;
const printDensity = ref<PrintDensity>(initialPreviewPreferences.printDensity);
const autoRender = ref(initialPreviewPreferences.autoRender);
const strictMode = ref(initialPreviewPreferences.strict);
const sizeMode = ref<"zpl" | "custom">(initialPreviewPreferences.sizeMode);
const overrideWidth = ref(initialPreviewPreferences.width);
const overrideHeight = ref(initialPreviewPreferences.height);
const labels = shallowRef<readonly RenderedLabel<HTMLCanvasElement>[]>([]);
const renderDiagnostics = shallowRef<readonly ZplDiagnostic[]>([]);
const activeLabelIndex = ref(0);
const previewUrl = ref<string>();
const rendering = ref(false);
const renderFailure = ref<string>();
const editorCursor = computed<number>({
  get: () => activeDocument.value.cursorPosition,
  set: (value) => { activeDocument.value.cursorPosition = value; },
});
const cursorState = ref<EditorCursorState>({ line: 1, column: 1, selectionLength: 0 });
const highlightRange = ref<SourceSpan>();
const problemsOpen = ref(true);
const sidebarMode = ref<"files" | "commands">("files");
const commandQuery = ref("");
const selectedCommand = ref<string>();
const mobilePane = ref<"code" | "preview">("code");
const splitPercent = ref(56);
const zoom = ref(75);
const fitPreview = ref(true);
const settingsOpen = ref(false);
const previewSettingsOpen = ref(false);
const previewStale = ref(false);
const editorComponent = ref<MonacoEditorApi | null>(null);
const workbench = ref<HTMLElement | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
let renderTimer: number | undefined;
let renderSequence = 0;
let saveTimer: number | undefined;
let resizeCleanup: (() => void) | undefined;

const editorLimits = {
  maxDimension: 8_192,
  maxPixels: 5_000_000,
  maxGraphicBytes: 4_000_000,
  maxSessionBytes: 8_000_000,
  maxTemplateDepth: 8,
  maxExpandedCommands: 25_000,
  maxLabels: 5,
} as const;

const isDirty = computed(() => source.value !== activeDocument.value.savedSource);
const dirtyDocumentCount = computed(() => documents.value.filter((document) => document.source !== document.savedSource).length);
const activeLabel = computed(() => labels.value[activeLabelIndex.value]);
const dpi = computed(() => ({ 6: 150, 8: 203, 12: 300, 24: 600 })[printDensity.value]);
const languageDiagnostics = computed<readonly ZplDiagnostic[]>(() =>
  validateZplParameters(source.value).map((diagnostic) => ({
    code: diagnostic.code,
    severity: diagnostic.severity,
    phase: "semantic",
    message: diagnostic.message,
    span: diagnostic.span,
    command: diagnostic.command,
  }))
);
const diagnostics = computed<readonly ZplDiagnostic[]>(() => {
  const combined = [...renderDiagnostics.value, ...languageDiagnostics.value];
  return combined.filter((diagnostic, index) => combined.findIndex((candidate) =>
    candidate.code === diagnostic.code &&
    candidate.message === diagnostic.message &&
    candidate.span?.start === diagnostic.span?.start &&
    candidate.span?.end === diagnostic.span?.end
  ) === index);
});
const errorCount = computed(() => diagnostics.value.filter(({ severity }) => severity === "error").length);
const warningCount = computed(() => diagnostics.value.filter(({ severity }) => severity === "warning").length);
const parsedDocument = computed(() => parseDocument(source.value));
const parsedCommands = computed(() => parsedDocument.value.items.flatMap((item) => item.kind === "label" ? item.commands : [item]));
const parsedCommandCount = computed(() => parsedCommands.value.length);
const capabilityMap = new Map(commandCapabilities.map((capability) => [capability.canonical, capability]));
const selectedCommandInfo = computed(() => {
  if (!selectedCommand.value) return undefined;
  const capability = capabilityMap.get(selectedCommand.value);
  const definition = getZplCommandDefinition(selectedCommand.value);
  return capability && definition ? { capability, definition } : undefined;
});
const documentOutline = computed(() => parsedCommands.value.map((command) => {
  const capability = capabilityMap.get(command.canonical);
  return {
    command: command.canonical,
    name: capability?.name ?? "Unknown command",
    category: capability?.category ?? "printer" as CommandCategory,
    span: command.span,
    line: lineAt(command.span.start),
  };
}));
const visibleCapabilities = computed(() => {
  const query = commandQuery.value.toUpperCase();
  return commandCapabilities.filter((capability) => {
    if (!query) return true;
    const definition = getZplCommandDefinition(capability.canonical);
    return [
      capability.canonical,
      capability.name,
      capability.category,
      definition?.title,
      definition?.summary,
      ...definition?.signatures.flatMap((signature) => [
        signature.syntax,
        signature.label,
        ...signature.parameters.flatMap((parameter) => [parameter.key, parameter.name, parameter.documentation]),
      ]) ?? [],
    ].some((value) => value?.toUpperCase().includes(query));
  });
});
const previewImageStyle = computed(() => fitPreview.value || !activeLabel.value
  ? undefined
  : { width: `${Math.max(80, activeLabel.value.width * zoom.value / 100)}px`, maxWidth: "none", maxHeight: "none" });

let documentIdSequence = 0;

function createDocumentId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  documentIdSequence += 1;
  return `document-${Date.now().toString(36)}-${documentIdSequence}`;
}

function createWorkspaceDocument(
  documentSource: string,
  documentFilename: string,
  options: { id?: string; savedSource?: string; cursorPosition?: number; sampleId?: SampleId } = {},
): WorkspaceDocument {
  return {
    id: options.id ?? createDocumentId(),
    filename: documentFilename,
    source: documentSource,
    savedSource: options.savedSource ?? documentSource,
    cursorPosition: options.cursorPosition ?? 0,
    sampleId: options.sampleId,
  };
}

function normalizeEditorPreferences(value: unknown): EditorPreferences {
  if (!value || typeof value !== "object") return { ...defaultEditorPreferences };
  const candidate = value as Partial<EditorPreferences>;
  return {
    theme: candidate.theme === "dark" || candidate.theme === "system" ? candidate.theme : "light",
    fontSize: typeof candidate.fontSize === "number" ? Math.max(10, Math.min(24, candidate.fontSize)) : 13,
    wordWrap: typeof candidate.wordWrap === "boolean" ? candidate.wordWrap : true,
    minimap: typeof candidate.minimap === "boolean" ? candidate.minimap : true,
    renderWhitespace: candidate.renderWhitespace === "none" || candidate.renderWhitespace === "boundary" ||
      candidate.renderWhitespace === "trailing" || candidate.renderWhitespace === "all"
      ? candidate.renderWhitespace
      : "selection",
  };
}

function normalizePreviewPreferences(value: unknown): PreviewPreferences {
  if (!value || typeof value !== "object") return { ...defaultPreviewPreferences };
  const candidate = value as Partial<PreviewPreferences>;
  const density = candidate.printDensity;
  return {
    printDensity: density === 6 || density === 12 || density === 24 ? density : 8,
    autoRender: typeof candidate.autoRender === "boolean" ? candidate.autoRender : true,
    strict: typeof candidate.strict === "boolean" ? candidate.strict : false,
    sizeMode: candidate.sizeMode === "custom" ? "custom" : "zpl",
    width: typeof candidate.width === "number" ? Math.max(1, Math.min(8_192, Math.round(candidate.width))) : 812,
    height: typeof candidate.height === "number" ? Math.max(1, Math.min(8_192, Math.round(candidate.height))) : 1218,
  };
}

function restoreWorkspace(): StoredWorkspace | undefined {
  try {
    const value = window.localStorage.getItem(workspaceKey);
    if (value) {
      const parsed = JSON.parse(value) as Partial<StoredWorkspace>;
      if (parsed.version === 2 && Array.isArray(parsed.documents) && parsed.documents.length > 0) {
        const restoredDocuments = parsed.documents.flatMap((candidate) => {
          if (!candidate || typeof candidate !== "object") return [];
          const document = candidate as Partial<WorkspaceDocument>;
          if (typeof document.id !== "string" || typeof document.filename !== "string" || typeof document.source !== "string") return [];
          const sampleId = samples.some((sample) => sample.id === document.sampleId) ? document.sampleId : undefined;
          return [createWorkspaceDocument(document.source, document.filename, {
            id: document.id,
            savedSource: typeof document.savedSource === "string" ? document.savedSource : document.source,
            cursorPosition: typeof document.cursorPosition === "number" ? document.cursorPosition : 0,
            sampleId,
          })];
        });
        if (restoredDocuments.length > 0) {
          const activeDocumentId = restoredDocuments.some(({ id }) => id === parsed.activeDocumentId)
            ? parsed.activeDocumentId!
            : restoredDocuments[0]!.id;
          return {
            version: 2,
            activeDocumentId,
            documents: restoredDocuments,
            view: parsed.view === "visual" ? "visual" : "source",
            preferences: normalizeEditorPreferences(parsed.preferences),
            preview: normalizePreviewPreferences(parsed.preview),
          };
        }
      }
    }

    const legacyValue = window.localStorage.getItem(legacyWorkspaceKey);
    if (!legacyValue) return undefined;
    const legacy = JSON.parse(legacyValue) as { source?: unknown; filename?: unknown };
    if (typeof legacy.source !== "string" || typeof legacy.filename !== "string") return undefined;
    const matchingSample = samples.find((sample) => sample.source === legacy.source);
    const document = createWorkspaceDocument(legacy.source, legacy.filename, { sampleId: matchingSample?.id });
    return {
      version: 2,
      activeDocumentId: document.id,
      documents: [document],
      view: "source",
      preferences: { ...defaultEditorPreferences },
      preview: { ...defaultPreviewPreferences },
    };
  } catch {
    return undefined;
  }
}

function persistWorkspace(): void {
  if (saveTimer !== undefined) window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    try {
      const workspace: StoredWorkspace = {
        version: 2,
        activeDocumentId: activeDocumentId.value,
        documents: documents.value,
        view: editorView.value,
        preferences: editorPreferences.value,
        preview: {
          printDensity: printDensity.value,
          autoRender: autoRender.value,
          strict: strictMode.value,
          sizeMode: sizeMode.value,
          width: overrideWidth.value,
          height: overrideHeight.value,
        },
      };
      window.localStorage.setItem(workspaceKey, JSON.stringify(workspace));
    } catch {
      // Local persistence is a convenience; editing remains available if storage is blocked.
    }
  }, 250);
}

function activateDocument(documentId: string): void {
  if (!documents.value.some(({ id }) => id === documentId)) return;
  activeDocumentId.value = documentId;
  highlightRange.value = undefined;
  void nextTick(() => editorComponent.value?.focus());
}

function updateWorkspaceDocument(change: { id: string; source: string }): void {
  const document = documents.value.find(({ id }) => id === change.id);
  if (document && document.source !== change.source) document.source = change.source;
}

function availableFilename(requestedFilename: string): string {
  const normalized = requestedFilename.trim().replace(/[\\/]/g, "-") || "label.zpl";
  if (!documents.value.some(({ filename: openFilename }) => openFilename === normalized)) return normalized;
  const extensionIndex = normalized.lastIndexOf(".");
  const stem = extensionIndex > 0 ? normalized.slice(0, extensionIndex) : normalized;
  const extension = extensionIndex > 0 ? normalized.slice(extensionIndex) : "";
  let index = 2;
  while (documents.value.some(({ filename: openFilename }) => openFilename === `${stem}-${index}${extension}`)) index += 1;
  return `${stem}-${index}${extension}`;
}

function addDocument(nextSource: string, nextFilename: string, sampleId?: SampleId): WorkspaceDocument {
  const document = createWorkspaceDocument(nextSource, availableFilename(nextFilename), { sampleId });
  documents.value.push(document);
  activateDocument(document.id);
  return document;
}

function loadSample(id: SampleId): void {
  const sample = samples.find((candidate) => candidate.id === id);
  if (!sample) return;
  const existing = documents.value.find((document) => document.sampleId === id);
  if (existing) activateDocument(existing.id);
  else addDocument(sample.source, sample.filename, sample.id);
}

function newDocument(): void {
  addDocument("^XA\n^PW812\n^LL1218\n\n^FO40,40\n^A0N,40,40\n^FDNew label^FS\n\n^XZ\n", "untitled.zpl");
}

function closeDocument(documentId: string): void {
  const index = documents.value.findIndex(({ id }) => id === documentId);
  if (index < 0) return;
  const document = documents.value[index]!;
  if (document.source !== document.savedSource && !window.confirm(`Close ${document.filename} with unsaved changes?`)) return;
  documents.value.splice(index, 1);
  if (documents.value.length === 0) {
    const replacement = createWorkspaceDocument("^XA\n^XZ\n", "untitled.zpl");
    documents.value.push(replacement);
    activeDocumentId.value = replacement.id;
  } else if (activeDocumentId.value === documentId) {
    activeDocumentId.value = documents.value[Math.min(index, documents.value.length - 1)]!.id;
  }
  highlightRange.value = undefined;
}

function renameDocument(documentId: string): void {
  const document = documents.value.find(({ id }) => id === documentId);
  if (!document) return;
  const requested = window.prompt("Rename ZPL file", document.filename)?.trim();
  if (!requested || requested === document.filename) return;
  const sanitized = requested.replace(/[\\/]/g, "-");
  document.filename = documents.value.some(({ id, filename: openFilename }) => id !== documentId && openFilename === sanitized)
    ? availableFilename(sanitized)
    : sanitized;
}

function duplicateDocument(documentId: string): void {
  const document = documents.value.find(({ id }) => id === documentId);
  if (document) addDocument(document.source, document.filename);
}

function openFilePicker(): void {
  fileInput.value?.click();
}

async function openFile(file: File): Promise<void> {
  if (file.size > 8_000_000) {
    window.alert("This editor accepts ZPL files up to 8 MB.");
    return;
  }
  addDocument(await file.text(), file.name || "label.zpl");
}

function handleFileInput(event: Event): void {
  const input = event.currentTarget as HTMLInputElement;
  for (const file of Array.from(input.files ?? [])) void openFile(file);
  input.value = "";
}

function handleDrop(event: DragEvent): void {
  for (const file of Array.from(event.dataTransfer?.files ?? [])) void openFile(file);
}

function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function downloadZpl(): void {
  downloadBlob(new Blob([source.value], { type: "text/plain;charset=utf-8" }), filename.value);
  activeDocument.value.savedSource = source.value;
  persistWorkspace();
}

function downloadWorkspace(): void {
  const entries: Record<string, Uint8Array> = {};
  documents.value.forEach((document, index) => {
    let archiveName = document.filename.replace(/[\\/]/g, "-") || `label-${index + 1}.zpl`;
    if (entries[archiveName]) archiveName = `${index + 1}-${archiveName}`;
    entries[archiveName] = new TextEncoder().encode(document.source);
    document.savedSource = document.source;
  });
  const zipped = zipSync(entries, { level: 6 });
  const buffer = new ArrayBuffer(zipped.byteLength);
  new Uint8Array(buffer).set(zipped);
  downloadBlob(new Blob([buffer], { type: "application/zip" }), "zplr-workspace.zip");
  persistWorkspace();
}

async function downloadPng(): Promise<void> {
  const canvas = activeLabel.value?.canvas;
  if (!canvas) return;
  const blob = await canvasToPng(canvas);
  if (blob) downloadBlob(blob, `${filename.value.replace(/\.(?:zpl|prn)$/i, "") || "label"}-${activeLabelIndex.value + 1}.png`);
}

function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
}

async function downloadAllPngs(): Promise<void> {
  if (labels.value.length === 0) return;
  const baseName = filename.value.replace(/\.(?:zpl|prn)$/i, "") || "label";
  const entries: Record<string, Uint8Array> = {};
  await Promise.all(labels.value.map(async (label, index) => {
    const blob = await canvasToPng(label.canvas);
    if (blob) entries[`${baseName}-${index + 1}.png`] = new Uint8Array(await blob.arrayBuffer());
  }));
  if (Object.keys(entries).length === 0) return;
  const zipped = zipSync(entries, { level: 6 });
  const buffer = new ArrayBuffer(zipped.byteLength);
  new Uint8Array(buffer).set(zipped);
  downloadBlob(new Blob([buffer], { type: "application/zip" }), `${baseName}-labels.zip`);
}

async function updatePreview(sequence: number): Promise<void> {
  try {
    const result = await renderZpl(source.value, {
      printDensity: printDensity.value,
      strict: strictMode.value,
      width: sizeMode.value === "custom" ? safeDimension(overrideWidth.value, 812) : undefined,
      height: sizeMode.value === "custom" ? safeDimension(overrideHeight.value, 1218) : undefined,
      limits: editorLimits,
    });
    if (sequence !== renderSequence) return;
    labels.value = result.labels;
    renderDiagnostics.value = result.diagnostics;
    activeLabelIndex.value = Math.min(activeLabelIndex.value, Math.max(0, result.labels.length - 1));
    previewUrl.value = activeLabel.value?.canvas?.toDataURL("image/png");
  } catch (error) {
    if (sequence !== renderSequence) return;
    labels.value = [];
    renderDiagnostics.value = parsedDocument.value.diagnostics;
    previewUrl.value = undefined;
    renderFailure.value = error instanceof Error ? error.message : "The local renderer failed.";
  } finally {
    if (sequence === renderSequence) {
      rendering.value = false;
      previewStale.value = false;
    }
  }
}

function safeDimension(value: number, fallback: number): number {
  return Number.isFinite(value) ? Math.max(1, Math.min(editorLimits.maxDimension, Math.round(value))) : fallback;
}

function schedulePreview(delay = 120): void {
  if (renderTimer !== undefined) window.clearTimeout(renderTimer);
  const sequence = ++renderSequence;
  rendering.value = true;
  renderFailure.value = undefined;
  renderTimer = window.setTimeout(() => void updatePreview(sequence), delay);
}

function renderNow(): void {
  previewStale.value = false;
  schedulePreview(0);
}

function requestPreview(delay = 120): void {
  if (autoRender.value) schedulePreview(delay);
  else {
    renderDiagnostics.value = parsedDocument.value.diagnostics;
    previewStale.value = true;
  }
}

function formatDocument(): void {
  void editorComponent.value?.formatDocument();
}

function applyVisualEdit(edit: SourceEdit): void {
  const appliedByEditor = editorComponent.value?.applySourceEdit(edit) ?? false;
  if (!appliedByEditor) {
    const start = Math.max(0, Math.min(source.value.length, Math.trunc(edit.start)));
    const end = Math.max(start, Math.min(source.value.length, Math.trunc(edit.end)));
    source.value = `${source.value.slice(0, start)}${edit.text}${source.value.slice(end)}`;
  }
  // Designer operations always refresh immediately, even when manual preview
  // rendering is selected, so the visual surface remains authoritative.
  void nextTick(() => schedulePreview(0));
}

function resetEditorPreferences(): void {
  editorPreferences.value = { ...defaultEditorPreferences };
}

function insertCommand(command: string): void {
  editorComponent.value?.insertCommand(command);
}

function focusSpan(span?: SourceSpan): void {
  if (!span) return;
  editorView.value = "source";
  editorCursor.value = span.start;
  highlightRange.value = { ...span };
  showMobilePane("code");
  void nextTick(() => editorComponent.value?.focus());
}

async function selectRenderedField(event: MouseEvent): Promise<void> {
  const label = activeLabel.value;
  const image = event.currentTarget as HTMLImageElement;
  if (!label) return;
  const bounds = image.getBoundingClientRect();
  const x = ((event.clientX - bounds.left) / bounds.width) * label.width;
  const y = ((event.clientY - bounds.top) / bounds.height) * label.height;
  focusSpan(findHighlightRegionAtPoint(label.highlightRegions, x, y)?.sourceSpan);
}

function diagnosticKey(diagnostic: ZplDiagnostic, index: number): string {
  return `${diagnostic.code}:${diagnostic.span?.start ?? ""}:${index}`;
}

function lineAt(offset: number): number {
  let line = 1;
  for (let index = 0; index < Math.min(offset, source.value.length); index++) {
    if (source.value.charCodeAt(index) === 10) line++;
  }
  return line;
}

function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  return `${(value / 1024).toFixed(value >= 10_240 ? 0 : 1)} KB`;
}

function categoryTextClass(category: CommandCategory): string {
  if (category === "barcode") return "text-amber-700 dark:text-amber-300";
  if (category === "text") return "text-blue-700 dark:text-blue-300";
  if (category === "graphic") return "text-sky-700 dark:text-sky-300";
  if (category === "storage") return "text-violet-700 dark:text-violet-300";
  if (category === "network" || category === "rfid") return "text-rose-700 dark:text-rose-300";
  return "text-zinc-800 dark:text-zinc-200";
}

function statusDotClass(status: CommandCapabilityStatus): string {
  if (status === "supported") return "bg-emerald-500";
  if (status === "partial") return "bg-amber-500";
  if (status === "unsupported") return "bg-rose-400";
  return "bg-zinc-300 dark:bg-zinc-600";
}

function showMobilePane(pane: "code" | "preview"): void {
  mobilePane.value = pane;
  window.requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
}

function showEditorView(view: EditorView): void {
  editorView.value = view;
}

function showEditorSource(): void {
  editorView.value = "source";
  showMobilePane("code");
}

function showEditorPreview(): void {
  editorView.value = "source";
  showMobilePane("preview");
}

function applySplit(): void {
  if (!workbench.value || editorView.value !== "source") return;
  const sidebarWidth = window.innerWidth >= 1024 ? 240 : 0;
  const splitterWidth = 6;
  const available = Math.max(0, workbench.value.clientWidth - sidebarWidth - splitterWidth);
  const codePane = workbench.value.querySelector<HTMLElement>(".code-pane");
  const previewPane = workbench.value.querySelector<HTMLElement>(".preview-pane");
  if (codePane) codePane.style.flex = `0 0 ${available * splitPercent.value / 100}px`;
  if (previewPane) previewPane.style.flex = "1 1 0";
}

function startResize(event: PointerEvent): void {
  if (!workbench.value || window.innerWidth < 768) return;
  event.preventDefault();
  const move = (moveEvent: PointerEvent) => {
    if (!workbench.value) return;
    const rect = workbench.value.getBoundingClientRect();
    const sidebarWidth = window.innerWidth >= 1024 ? 240 : 0;
    const x = moveEvent.clientX - rect.left - sidebarWidth;
    const available = rect.width - sidebarWidth - 6;
    splitPercent.value = Math.min(72, Math.max(35, x / available * 100));
    applySplit();
  };
  const stop = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", stop);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    resizeCleanup = undefined;
  };
  document.body.style.cursor = "col-resize";
  document.body.style.userSelect = "none";
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", stop);
  resizeCleanup = stop;
}

function resizeWithKeyboard(event: KeyboardEvent): void {
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
  event.preventDefault();
  splitPercent.value = Math.min(72, Math.max(35, splitPercent.value + (event.key === "ArrowRight" ? 2 : -2)));
  applySplit();
}

function activateRelativeDocument(direction: number): void {
  const currentIndex = documents.value.findIndex(({ id }) => id === activeDocumentId.value);
  if (currentIndex < 0 || documents.value.length < 2) return;
  const nextIndex = (currentIndex + direction + documents.value.length) % documents.value.length;
  activateDocument(documents.value[nextIndex]!.id);
}

function handleKeyboardShortcut(event: KeyboardEvent): void {
  if (event.key === "Escape" && settingsOpen.value) {
    event.preventDefault();
    settingsOpen.value = false;
    return;
  }
  const modifier = event.metaKey || event.ctrlKey;
  if (event.ctrlKey && event.key === "Tab") {
    event.preventDefault();
    activateRelativeDocument(event.shiftKey ? -1 : 1);
    return;
  }
  if (!modifier) return;
  const fromSourceEditor = event.target instanceof Element
    && event.target.closest('[data-testid="zpl-editor"]') !== null;
  if (event.key.toLowerCase() === "a" && fromSourceEditor) {
    event.preventDefault();
    event.stopPropagation();
    editorComponent.value?.selectAll();
  } else if (event.key.toLowerCase() === "s") {
    event.preventDefault();
    if (event.shiftKey) downloadWorkspace();
    else downloadZpl();
  } else if (event.key.toLowerCase() === "o") {
    event.preventDefault();
    openFilePicker();
  } else if (event.key.toLowerCase() === "n") {
    event.preventDefault();
    newDocument();
  } else if (event.key.toLowerCase() === "w") {
    event.preventDefault();
    closeDocument(activeDocumentId.value);
  } else if (event.key.toLowerCase() === "p") {
    event.preventDefault();
    editorComponent.value?.commandPalette();
  } else if (event.key.toLowerCase() === "z" && editorView.value === "visual") {
    event.preventDefault();
    if (event.shiftKey) editorComponent.value?.redo();
    else editorComponent.value?.undo();
  } else if (event.key === ",") {
    event.preventDefault();
    settingsOpen.value = true;
  } else if ((event.ctrlKey && event.key.toLowerCase() === "h") || (event.metaKey && event.altKey && event.key.toLowerCase() === "f")) {
    event.preventDefault();
    editorComponent.value?.replace();
  } else if (event.key.toLowerCase() === "f" && event.shiftKey) {
    event.preventDefault();
    formatDocument();
  } else if (event.key === "Enter") {
    event.preventDefault();
    renderNow();
  }
}

watch(source, () => {
  highlightRange.value = undefined;
  requestPreview();
});
watch(documents, persistWorkspace, { deep: true });
watch(editorPreferences, persistWorkspace, { deep: true });
watch(editorView, (view) => {
  persistWorkspace();
  if (view === "visual") {
    renderNow();
  } else {
    void nextTick(() => {
      applySplit();
      window.dispatchEvent(new Event("resize"));
    });
  }
});
watch(activeDocumentId, () => {
  highlightRange.value = undefined;
  activeLabelIndex.value = 0;
  persistWorkspace();
  if (autoRender.value) schedulePreview(0);
  else {
    labels.value = [];
    renderDiagnostics.value = parsedDocument.value.diagnostics;
    previewUrl.value = undefined;
    previewStale.value = true;
  }
});
watch([printDensity, strictMode, sizeMode, overrideWidth, overrideHeight], () => {
  persistWorkspace();
  requestPreview();
});
watch(autoRender, (enabled) => {
  persistWorkspace();
  if (enabled) schedulePreview(0);
  else previewStale.value = true;
});
watch(activeLabelIndex, () => {
  previewUrl.value = activeLabel.value?.canvas?.toDataURL("image/png");
});
watch(splitPercent, applySplit);

onMounted(() => {
  schedulePreview(0);
  window.addEventListener("keydown", handleKeyboardShortcut, true);
  window.addEventListener("resize", applySplit);
  applySplit();
});

onBeforeUnmount(() => {
  renderSequence++;
  if (renderTimer !== undefined) window.clearTimeout(renderTimer);
  if (saveTimer !== undefined) window.clearTimeout(saveTimer);
  resizeCleanup?.();
  window.removeEventListener("keydown", handleKeyboardShortcut, true);
  window.removeEventListener("resize", applySplit);
});
</script>

<style scoped>
.editor-view-switch {
  height: 2rem;
  align-items: center;
  gap: 0.15rem;
  border: 1px solid rgb(228 228 231);
  border-radius: 0.55rem;
  background: rgb(250 250 250);
  padding: 0.15rem;
}

.editor-view-switch button {
  display: inline-flex;
  height: 1.55rem;
  align-items: center;
  gap: 0.3rem;
  border-radius: 0.38rem;
  padding-inline: 0.55rem;
  color: rgb(113 113 122);
  font-size: 0.65rem;
  font-weight: 600;
}

.editor-view-switch button:hover { color: rgb(24 24 27); }
.editor-view-switch button.active { background: white; color: rgb(24 24 27); box-shadow: 0 1px 2px rgb(0 0 0 / 0.08); }
.editor-view-switch button:focus-visible { outline: 2px solid rgb(113 113 122); outline-offset: 1px; }

.toolbar-button {
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  height: 2rem;
  border-radius: 0.5rem;
  padding-inline: 0.5rem;
  color: rgb(82 82 91);
  font-size: 0.75rem;
  font-weight: 500;
  transition: background-color 150ms, color 150ms;
}

.toolbar-button:hover:not(:disabled) {
  background: rgb(244 244 245);
  color: rgb(24 24 27);
}

.toolbar-button:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

.toolbar-button:focus-visible,
.icon-button-small:focus-visible,
.file-row:focus-visible,
.open-editor-main:focus-visible,
.open-editor-action:focus-visible,
.editor-tab button:focus-visible,
.outline-row:focus-visible,
.command-row:focus-visible,
.command-insert:focus-visible,
.command-insert-primary:focus-visible,
.command-back:focus-visible,
.diagnostic-row:focus-visible,
.zoom-button:focus-visible,
.status-button:focus-visible {
  outline: 2px solid rgb(113 113 122);
  outline-offset: -2px;
}

.icon-button-small {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.65rem;
  height: 1.65rem;
  border-radius: 0.35rem;
  color: rgb(113 113 122);
}

.icon-button-small:hover { background: rgb(228 228 231 / 0.75); color: rgb(24 24 27); }

.mobile-pane-tab {
  display: inline-flex;
  height: 2rem;
  align-items: center;
  gap: 0.35rem;
  border-radius: 0.4rem;
  padding-inline: 0.75rem;
  color: rgb(113 113 122);
  font-size: 0.75rem;
  font-weight: 600;
}

.mobile-pane-tab.active { background: white; color: rgb(24 24 27); box-shadow: 0 1px 2px rgb(0 0 0 / 0.06); }

.sidebar-tab {
  border-bottom: 2px solid transparent;
  color: rgb(113 113 122);
  font-size: 0.7rem;
  font-weight: 600;
}

.sidebar-tab.active { border-bottom-color: rgb(39 39 42); color: rgb(39 39 42); }

.sidebar-heading {
  display: flex;
  height: 1.75rem;
  align-items: center;
  justify-content: space-between;
  padding-inline: 0.75rem 0.4rem;
  color: rgb(82 82 91);
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.file-row {
  display: flex;
  width: 100%;
  height: 1.8rem;
  align-items: center;
  gap: 0.45rem;
  padding-inline: 0.75rem;
  color: rgb(82 82 91);
  font-size: 0.75rem;
  text-align: left;
}

.file-row:hover, .file-row.selected { background: rgb(228 228 231 / 0.6); color: rgb(24 24 27); }
.file-row.active { background: rgb(228 228 231 / 0.8); color: rgb(24 24 27); }

.open-editor-row {
  display: flex;
  width: 100%;
  height: 1.8rem;
  align-items: center;
  color: rgb(82 82 91);
  font-size: 0.75rem;
}

.open-editor-row:hover, .open-editor-row.active { background: rgb(228 228 231 / 0.7); color: rgb(24 24 27); }

.open-editor-main {
  display: flex;
  min-width: 0;
  height: 100%;
  flex: 1 1 0%;
  align-items: center;
  gap: 0.45rem;
  padding-left: 0.75rem;
  text-align: left;
}

.open-editor-action {
  display: inline-flex;
  width: 1.45rem;
  height: 1.45rem;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: 0.3rem;
  color: rgb(113 113 122);
  opacity: 0;
}

.open-editor-row:hover .open-editor-action,
.open-editor-row:focus-within .open-editor-action,
.open-editor-row.active .open-editor-action { opacity: 1; }
.open-editor-action:hover { background: rgb(212 212 216 / 0.8); color: rgb(24 24 27); }

.editor-tab {
  display: flex;
  height: 2rem;
  min-width: 8rem;
  max-width: 15rem;
  flex: 0 0 auto;
  align-items: center;
  border-inline: 1px solid transparent;
  border-top: 1px solid transparent;
  color: rgb(82 82 91);
  font-size: 0.75rem;
}

.editor-tab.active {
  border-color: rgb(228 228 231);
  border-bottom-color: white;
  background: white;
  color: rgb(24 24 27);
}

.tab-close-button {
  display: inline-flex;
  width: 1.75rem;
  height: 1.75rem;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: 0.35rem;
  color: rgb(113 113 122);
  opacity: 0;
}

.editor-tab:hover .tab-close-button,
.editor-tab:focus-within .tab-close-button,
.editor-tab.active .tab-close-button { opacity: 1; }
.tab-close-button:hover { background: rgb(228 228 231 / 0.8); color: rgb(24 24 27); }

.outline-row, .command-row {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 0.5rem;
  padding-inline: 0.65rem;
  text-align: left;
}

.outline-row { height: 1.65rem; font-size: 0.7rem; }
.command-row { min-height: 2.8rem; padding-block: 0.4rem; }
.outline-row:hover, .command-row:hover { background: rgb(228 228 231 / 0.6); }

.command-entry {
  display: flex;
  align-items: stretch;
}

.command-entry .command-row {
  min-width: 0;
  width: auto;
  flex: 1 1 0%;
}

.command-insert {
  display: inline-flex;
  width: 2rem;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  color: rgb(113 113 122);
  opacity: 0;
}

.command-entry:hover .command-insert,
.command-entry:focus-within .command-insert { opacity: 1; }
.command-insert:hover { background: rgb(228 228 231 / 0.8); color: rgb(24 24 27); }

.command-back {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border-radius: 0.35rem;
  color: rgb(113 113 122);
  font-size: 0.65rem;
  font-weight: 600;
}
.command-back:hover { color: rgb(24 24 27); }

.command-doc-section {
  margin-top: 1rem;
  border-top: 1px solid rgb(228 228 231);
  padding-top: 0.75rem;
}

.command-doc-heading {
  margin-bottom: 0.4rem;
  color: rgb(113 113 122);
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.command-syntax {
  display: block;
  overflow-x: auto;
  border: 1px solid rgb(228 228 231);
  border-radius: 0.4rem;
  background: white;
  padding: 0.45rem 0.55rem;
  color: rgb(39 39 42);
  font-size: 0.68rem;
  white-space: nowrap;
}

.command-choice {
  max-width: 100%;
  overflow: hidden;
  border: 1px solid rgb(228 228 231);
  border-radius: 0.3rem;
  background: white;
  padding: 0.1rem 0.3rem;
  color: rgb(82 82 91);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.58rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.command-choice:hover { border-color: rgb(161 161 170); color: rgb(24 24 27); }

.command-insert-primary {
  display: inline-flex;
  width: 100%;
  height: 2rem;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  border-radius: 0.45rem;
  background: rgb(24 24 27);
  color: white;
  font-size: 0.68rem;
  font-weight: 600;
}
.command-insert-primary:hover { background: rgb(63 63 70); }

.diagnostic-row {
  display: flex;
  width: 100%;
  min-height: 2rem;
  align-items: flex-start;
  gap: 0.5rem;
  border-bottom: 1px solid rgb(244 244 245);
  padding: 0.45rem 0.75rem;
  text-align: left;
  font-size: 0.7rem;
}

.diagnostic-row:hover:not(:disabled) { background: rgb(250 250 250); }
.diagnostic-row:disabled { cursor: default; }

.compact-select, .compact-input {
  height: 2rem;
  border: 1px solid rgb(228 228 231);
  border-radius: 0.5rem;
  background: white;
  padding-inline: 0.5rem;
  color: rgb(82 82 91);
  font-size: 0.7rem;
  outline: none;
}

.compact-select:focus, .compact-input:focus { border-color: rgb(113 113 122); box-shadow: 0 0 0 2px rgb(228 228 231); }

.label-tab {
  border-radius: 0.35rem;
  padding: 0.3rem 0.6rem;
  color: rgb(113 113 122);
  font-size: 0.65rem;
}

.label-tab.active { background: rgb(244 244 245); color: rgb(24 24 27); font-weight: 600; }

.preview-grid {
  background-color: rgb(244 244 245);
  background-image: linear-gradient(rgb(24 24 27 / 0.04) 1px, transparent 1px), linear-gradient(90deg, rgb(24 24 27 / 0.04) 1px, transparent 1px);
  background-size: 20px 20px;
}

.zoom-button {
  display: inline-flex;
  width: 1.75rem;
  height: 1.65rem;
  align-items: center;
  justify-content: center;
  color: rgb(113 113 122);
}

.zoom-button:hover { background: rgb(244 244 245); color: rgb(24 24 27); }

.preview-stat {
  display: flex;
  min-height: 3.2rem;
  flex-direction: column;
  justify-content: center;
  padding-inline: 0.75rem;
}

.preview-stat span { color: rgb(113 113 122); font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.05em; }
.preview-stat strong { margin-top: 0.15rem; color: rgb(63 63 70); font-size: 0.72rem; font-weight: 600; }

.status-button { display: inline-flex; align-items: center; gap: 0.25rem; border-radius: 0.2rem; padding-inline: 0.25rem; }
.status-button:hover { background: rgb(255 255 255 / 0.12); }

.settings-field, .settings-toggle {
  display: flex;
  min-height: 2.5rem;
  justify-content: space-between;
  gap: 1rem;
}

.settings-field > span, .settings-toggle > span { min-width: 0; }
.settings-field strong, .settings-toggle strong { display: block; color: rgb(39 39 42); font-size: 0.75rem; font-weight: 600; }
.settings-field small, .settings-toggle small { display: block; margin-top: 0.15rem; color: rgb(113 113 122); font-size: 0.65rem; line-height: 1rem; }

.settings-select {
  height: 2rem;
  min-width: 7.5rem;
  border: 1px solid rgb(228 228 231);
  border-radius: 0.5rem;
  background: white;
  padding-inline: 0.5rem;
  color: rgb(63 63 70);
  font-size: 0.7rem;
  outline: none;
}

.settings-select:focus { border-color: rgb(113 113 122); box-shadow: 0 0 0 2px rgb(228 228 231); }
.settings-toggle { align-items: center; }
.settings-toggle input { width: 1rem; height: 1rem; accent-color: rgb(24 24 27); }
kbd { border: 1px solid rgb(212 212 216); border-bottom-width: 2px; border-radius: 0.3rem; background: rgb(250 250 250); padding: 0.08rem 0.3rem; color: rgb(82 82 91); font-family: inherit; font-size: 0.62rem; }

@media (width < 768px) {
  .code-pane, .preview-pane { flex: 1 1 100% !important; width: 100%; }
  .mobile-hidden { display: none; }
  .preview-pane { border-left: 0; }
}

@media (prefers-color-scheme: dark) {
  .editor-view-switch { border-color: rgb(255 255 255 / 0.1); background: rgb(255 255 255 / 0.04); }
  .editor-view-switch button:hover { color: white; }
  .editor-view-switch button.active { background: rgb(255 255 255 / 0.1); color: white; box-shadow: none; }
  .toolbar-button { color: rgb(161 161 170); }
  .toolbar-button:hover:not(:disabled), .icon-button-small:hover { background: rgb(255 255 255 / 0.06); color: white; }
  .mobile-pane-tab.active { background: rgb(39 39 42); color: white; }
  .sidebar-tab.active { border-bottom-color: white; color: white; }
  .sidebar-heading { color: rgb(161 161 170); }
  .file-row { color: rgb(161 161 170); }
  .file-row:hover, .file-row.selected, .file-row.active, .open-editor-row:hover, .open-editor-row.active, .outline-row:hover, .command-row:hover { background: rgb(255 255 255 / 0.06); color: white; }
  .command-insert:hover { background: rgb(255 255 255 / 0.08); color: white; }
  .command-back:hover { color: white; }
  .command-doc-section { border-top-color: rgb(255 255 255 / 0.1); }
  .command-syntax, .command-choice { border-color: rgb(255 255 255 / 0.1); background: rgb(9 9 11); color: rgb(212 212 216); }
  .command-choice:hover { border-color: rgb(113 113 122); color: white; }
  .command-insert-primary { background: white; color: rgb(9 9 11); }
  .command-insert-primary:hover { background: rgb(228 228 231); }
  .open-editor-action:hover, .tab-close-button:hover { background: rgb(255 255 255 / 0.08); color: white; }
  .editor-tab.active { border-color: rgb(255 255 255 / 0.1); border-bottom-color: rgb(9 9 11); background: rgb(9 9 11); color: white; }
  .diagnostic-row { border-bottom-color: rgb(255 255 255 / 0.05); }
  .diagnostic-row:hover:not(:disabled) { background: rgb(255 255 255 / 0.04); }
  .compact-select, .compact-input { border-color: rgb(255 255 255 / 0.1); background: rgb(9 9 11); color: rgb(161 161 170); }
  .compact-select:focus, .compact-input:focus { border-color: rgb(113 113 122); box-shadow: 0 0 0 2px rgb(255 255 255 / 0.08); }
  .label-tab.active { background: rgb(255 255 255 / 0.08); color: white; }
  .preview-grid { background-color: rgb(24 24 27); background-image: linear-gradient(rgb(255 255 255 / 0.035) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255 / 0.035) 1px, transparent 1px); }
  .zoom-button:hover { background: rgb(255 255 255 / 0.06); color: white; }
  .preview-stat strong { color: rgb(228 228 231); }
  .status-button:hover { background: rgb(0 0 0 / 0.08); }
  .settings-field strong, .settings-toggle strong { color: rgb(228 228 231); }
  .settings-select { border-color: rgb(255 255 255 / 0.1); background: rgb(9 9 11); color: rgb(212 212 216); }
  .settings-select:focus { border-color: rgb(113 113 122); box-shadow: 0 0 0 2px rgb(255 255 255 / 0.08); }
  .settings-toggle input { accent-color: white; }
  kbd { border-color: rgb(82 82 91); background: rgb(39 39 42); color: rgb(212 212 216); }
}
</style>
