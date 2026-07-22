<template>
  <div
    ref="editorContainer"
    class="monaco-editor-container h-full w-full"
    data-testid="zpl-editor"
  ></div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import loader from "@monaco-editor/loader";
// edcore.main installs Monaco's standalone editor contributions (hover,
// suggest, formatting, symbols, folding, and command palette) without also
// registering dozens of unrelated programming languages.
import "monaco-editor/esm/vs/editor/edcore.main.js";
import * as MonacoRuntime from "monaco-editor/esm/vs/editor/editor.api";
import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import type * as Monaco from "monaco-editor";
import type {
  CommandCapability,
  ZplDiagnostic,
} from "../../src/index.web";
import { configureZplLanguage, zplSnippetForSource } from "../zplLanguage";

export interface EditorCursorState {
  line: number;
  column: number;
  selectionLength: number;
}

export interface EditorPreferences {
  theme: "light" | "dark" | "system";
  fontSize: number;
  wordWrap: boolean;
  minimap: boolean;
  renderWhitespace: "none" | "boundary" | "selection" | "trailing" | "all";
}

export interface EditorWorkspaceModel {
  id: string;
  filename: string;
  source: string;
}

export interface EditorSourceEdit {
  start: number;
  end: number;
  text: string;
}

export interface EditorSourceEditTransaction {
  edits: readonly EditorSourceEdit[];
}

export type EditorSourceChange = EditorSourceEdit | EditorSourceEditTransaction;

self.MonacoEnvironment = {
  getWorker: () => new EditorWorker(),
};
loader.config({ monaco: MonacoRuntime });

const props = withDefaults(defineProps<{
  modelValue: string;
  capabilities: readonly CommandCapability[];
  diagnostics?: readonly ZplDiagnostic[];
  cursorPosition?: number;
  highlightRange?: { start: number; end: number };
  filename?: string;
  documentId?: string;
  workspaceDocuments?: readonly EditorWorkspaceModel[];
  preferences?: EditorPreferences;
}>(), {
  diagnostics: () => [],
  filename: "label.zpl",
  documentId: "default",
  workspaceDocuments: () => [],
  preferences: () => ({
    theme: "light",
    fontSize: 13,
    wordWrap: true,
    minimap: true,
    renderWhitespace: "selection",
  }),
});

const emit = defineEmits<{
  "update:modelValue": [value: string];
  "update:workspaceDocument": [change: { id: string; source: string }];
  "activate:workspaceDocument": [documentId: string];
  "update:cursorPosition": [position: number];
  "update:cursorState": [state: EditorCursorState];
  "update:focused": [focused: boolean];
  ready: [];
}>();

const editorContainer = ref<HTMLElement | null>(null);
let editor: Monaco.editor.IStandaloneCodeEditor | null = null;
let model: Monaco.editor.ITextModel | null = null;
let monaco: typeof Monaco | null = null;
const models = new Map<string, Monaco.editor.ITextModel>();
const modelListeners = new Map<string, Monaco.IDisposable>();
const synchronizingModels = new Set<string>();
const viewStates = new Map<string, Monaco.editor.ICodeEditorViewState | null>();
let currentDocumentId = props.documentId;
let decorationIds: string[] = [];
let darkModeQuery: MediaQueryList | null = null;
let languageService: Monaco.IDisposable | null = null;
let disposed = false;

interface SnippetControllerContribution extends Monaco.editor.IEditorContribution {
  insert(template: string, options?: { adjustWhitespace?: boolean }): void;
}

const handleDarkModeChange = (event: MediaQueryListEvent) => {
  if (editor && monaco && props.preferences.theme === "system") {
    monaco.editor.setTheme(event.matches ? "zpl-dark" : "zpl-light");
  }
};

function resolvedTheme(): "zpl-dark" | "zpl-light" {
  if (props.preferences.theme === "dark") return "zpl-dark";
  if (props.preferences.theme === "light") return "zpl-light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "zpl-dark" : "zpl-light";
}

function applyPreferences(): void {
  if (!editor || !monaco) return;
  monaco.editor.setTheme(resolvedTheme());
  editor.updateOptions({
    fontSize: Math.max(10, Math.min(24, props.preferences.fontSize)),
    lineHeight: Math.max(18, Math.round(props.preferences.fontSize * 1.6)),
    wordWrap: props.preferences.wordWrap ? "on" : "off",
    renderWhitespace: props.preferences.renderWhitespace,
    minimap: {
      enabled: props.preferences.minimap,
      renderCharacters: false,
      showSlider: "mouseover",
      size: "fit",
      maxColumn: 80,
    },
  });
}

function modelUri(documentId: string, filename: string): Monaco.Uri {
  return monaco!.Uri.parse(`inmemory://zplr/${encodeURIComponent(documentId)}/${encodeURIComponent(filename)}`);
}

function getOrCreateModel(documentId: string, filename: string, value: string): Monaco.editor.ITextModel {
  const existing = models.get(documentId);
  if (existing) return existing;
  const created = monaco!.editor.createModel(value, "zpl", modelUri(documentId, filename));
  models.set(documentId, created);
  modelListeners.set(documentId, created.onDidChangeContent(() => {
    if (synchronizingModels.has(documentId)) return;
    const nextValue = created.getValue();
    emit("update:workspaceDocument", { id: documentId, source: nextValue });
    if (documentId === currentDocumentId) emit("update:modelValue", nextValue);
  }));
  return created;
}

function synchronizeModelValue(documentId: string, targetModel: Monaco.editor.ITextModel, value: string): void {
  if (targetModel.getValue() === value) return;
  synchronizingModels.add(documentId);
  try {
    targetModel.setValue(value);
  } finally {
    synchronizingModels.delete(documentId);
  }
}

function switchDocument(documentId: string): void {
  if (!editor || !monaco || documentId === currentDocumentId) return;
  viewStates.set(currentDocumentId, editor.saveViewState());
  decorationIds = editor.deltaDecorations(decorationIds, []);

  currentDocumentId = documentId;
  const workspaceDocument = props.workspaceDocuments.find(({ id }) => id === documentId);
  const nextModel = getOrCreateModel(documentId, workspaceDocument?.filename ?? props.filename, props.modelValue);
  synchronizeModelValue(documentId, nextModel, props.modelValue);
  model = nextModel;
  editor.setModel(nextModel);

  const viewState = viewStates.get(documentId);
  if (viewState) editor.restoreViewState(viewState);
  else applyCursor(props.cursorPosition);
  applyHighlight(props.highlightRange);
  applyDiagnostics(props.diagnostics);
  emitCursorState();
  editor.focus();
}

function applyCursor(position: number | undefined): void {
  if (!editor || !model || position === undefined) return;
  const resolved = model.getPositionAt(Math.max(0, Math.min(position, model.getValueLength())));
  editor.setPosition(resolved);
  editor.revealPositionInCenterIfOutsideViewport(resolved);
}

function applyExternalCursor(position: number | undefined): void {
  if (!editor || !model || position === undefined) return;
  const currentPosition = editor.getPosition();
  if (currentPosition && model.getOffsetAt(currentPosition) === position) return;
  applyCursor(position);
}

function applyHighlight(range: { start: number; end: number } | undefined): void {
  if (!editor || !monaco || !model) return;
  decorationIds = editor.deltaDecorations(decorationIds, []);
  if (!range) return;
  const start = model.getPositionAt(range.start);
  const end = model.getPositionAt(range.end);
  decorationIds = editor.deltaDecorations([], [{
    range: new monaco.Range(start.lineNumber, start.column, end.lineNumber, end.column),
    options: {
      className: "highlighted-command",
      inlineClassName: "highlighted-command-inline",
      overviewRuler: {
        color: "rgba(24, 24, 27, .35)",
        position: monaco.editor.OverviewRulerLane.Full,
      },
    },
  }]);
}

function markerSeverity(severity: ZplDiagnostic["severity"]): Monaco.MarkerSeverity {
  if (!monaco) return 1;
  if (severity === "error") return monaco.MarkerSeverity.Error;
  if (severity === "warning") return monaco.MarkerSeverity.Warning;
  return monaco.MarkerSeverity.Info;
}

function applyDiagnostics(diagnostics: readonly ZplDiagnostic[]): void {
  if (!monaco || !model) return;
  const markers: Monaco.editor.IMarkerData[] = diagnostics.map((diagnostic) => {
    const startOffset = diagnostic.span?.start ?? 0;
    const endOffset = Math.max(startOffset + 1, diagnostic.span?.end ?? startOffset + 1);
    const start = model!.getPositionAt(Math.min(startOffset, model!.getValueLength()));
    const end = model!.getPositionAt(Math.min(endOffset, model!.getValueLength()));
    return {
      severity: markerSeverity(diagnostic.severity),
      message: diagnostic.message,
      code: diagnostic.code,
      source: `ZPLr ${diagnostic.phase}`,
      startLineNumber: start.lineNumber,
      startColumn: start.column,
      endLineNumber: end.lineNumber,
      endColumn: end.column,
      tags: diagnostic.code === "UNSUPPORTED_COMMAND"
        ? [monaco!.MarkerTag.Deprecated]
        : undefined,
    };
  });
  monaco.editor.setModelMarkers(model, "zplr", markers);
}

function insertSnippet(snippet: string): void {
  if (!editor) return;
  editor.focus();
  const snippetController = editor.getContribution<SnippetControllerContribution>("snippetController2");
  if (snippetController) {
    snippetController.insert(snippet, { adjustWhitespace: false });
    return;
  }
  editor.trigger("zplr", "editor.action.insertSnippet", { snippet });
}

function selectAllSource(): void {
  const activeModel = editor?.getModel();
  if (!editor || !activeModel) return;
  editor.focus();
  editor.setSelection(activeModel.getFullModelRange());
}

function selectSourceRange(range: { start: number; end: number }, focusEditor: boolean): void {
  if (!editor || !model || !monaco) return;
  // The code workbench can be revealed from WYSIWYG after Monaco was
  // laid out at zero width/height. Measure the now-visible container before
  // calculating the centered scroll position.
  editor.layout();
  const startOffset = Math.max(0, Math.min(model.getValueLength(), Math.trunc(range.start)));
  const endOffset = Math.max(startOffset, Math.min(model.getValueLength(), Math.trunc(range.end)));
  const start = model.getPositionAt(startOffset);
  const end = model.getPositionAt(endOffset);
  const selection = new monaco.Range(start.lineNumber, start.column, end.lineNumber, end.column);
  if (focusEditor) editor.focus();
  editor.setSelection(selection);
  editor.revealRangeInCenter(selection, monaco.editor.ScrollType.Immediate);
}

function revealSourceRange(range: { start: number; end: number }): void {
  selectSourceRange(range, true);
}

function synchronizeSourceRange(range: { start: number; end: number }): void {
  selectSourceRange(range, false);
}

function clearSourceSelection(): void {
  if (!editor || !monaco) return;
  const position = editor.getPosition();
  if (position) editor.setSelection(new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column));
}

function applySourceEdit(change: EditorSourceChange): boolean {
  if (!editor || !model) return false;
  const requested = "edits" in change ? [...change.edits] : [change];
  const normalized = requested
    .map((edit) => {
      const startOffset = Math.max(0, Math.min(model!.getValueLength(), Math.trunc(edit.start)));
      const endOffset = Math.max(startOffset, Math.min(model!.getValueLength(), Math.trunc(edit.end)));
      return { ...edit, startOffset, endOffset };
    })
    .sort((left, right) => left.startOffset - right.startOffset || left.endOffset - right.endOffset);
  if (normalized.length === 0) return false;
  for (let index = 1; index < normalized.length; index++) {
    if (normalized[index]!.startOffset < normalized[index - 1]!.endOffset) return false;
  }
  editor.pushUndoStop();
  const applied = editor.executeEdits("zplr.visual-editor", normalized.map((edit) => {
    const start = model!.getPositionAt(edit.startOffset);
    const end = model!.getPositionAt(edit.endOffset);
    return {
      range: {
        startLineNumber: start.lineNumber,
        startColumn: start.column,
        endLineNumber: end.lineNumber,
        endColumn: end.column,
      },
      text: edit.text,
      forceMoveMarkers: true,
    };
  }));
  editor.pushUndoStop();
  return applied;
}

function emitCursorState(): void {
  if (!editor || !model) return;
  const position = editor.getPosition();
  const selection = editor.getSelection();
  if (!position) return;
  const offset = model.getOffsetAt(position);
  emit("update:cursorPosition", offset);
  emit("update:cursorState", {
    line: position.lineNumber,
    column: position.column,
    selectionLength: selection ? model.getValueLengthInRange(selection) : 0,
  });
}

onMounted(async () => {
  if (!editorContainer.value) return;
  const runtime = await loader.init();
  if (disposed || !editorContainer.value) return;
  monaco = runtime;

  if (!monaco.languages.getLanguages().some(({ id }) => id === "zpl")) {
    monaco.languages.register({
      id: "zpl",
      aliases: ["ZPL", "ZPL II"],
      extensions: [".zpl", ".prn"],
      mimetypes: ["text/x-zpl"],
    });
  }
  languageService = configureZplLanguage(monaco, props.capabilities);

  monaco.editor.defineTheme("zpl-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "7C8A72", fontStyle: "italic" },
      { token: "keyword.control", foreground: "D8B4FE", fontStyle: "bold" },
      { token: "keyword.field", foreground: "5EEAD4", fontStyle: "bold" },
      { token: "keyword.barcode", foreground: "FDE68A", fontStyle: "bold" },
      { token: "keyword.font", foreground: "93C5FD" },
      { token: "keyword.graphic", foreground: "7DD3FC" },
      { token: "keyword.storage", foreground: "C4B5FD" },
      { token: "keyword.network", foreground: "FDA4AF" },
      { token: "keyword.rfid", foreground: "FDBA74" },
      { token: "number", foreground: "BBF7D0" },
      { token: "string", foreground: "FCA5A5" },
      { token: "string.escape", foreground: "FDBA74", fontStyle: "bold" },
      { token: "constant", foreground: "C4B5FD" },
      { token: "zplFormat", foreground: "D8B4FE", fontStyle: "bold" },
      { token: "zplText", foreground: "93C5FD" },
      { token: "zplBarcode", foreground: "FDE68A", fontStyle: "bold" },
      { token: "zplGraphic", foreground: "7DD3FC" },
      { token: "zplStorage", foreground: "C4B5FD" },
      { token: "zplNetwork", foreground: "FDA4AF" },
      { token: "zplRfid", foreground: "FDBA74" },
      { token: "zplPrinter", foreground: "D8B4FE", fontStyle: "bold" },
    ],
    colors: {
      "editor.background": "#18181b",
      "editorGutter.background": "#18181b",
      "editorLineNumber.foreground": "#71717a",
      "editorLineNumber.activeForeground": "#e4e4e7",
      "editorIndentGuide.background1": "#27272a",
    },
  });

  monaco.editor.defineTheme("zpl-light", {
    base: "vs",
    inherit: true,
    rules: [
      { token: "comment", foreground: "6B8062", fontStyle: "italic" },
      { token: "keyword.control", foreground: "7C3AED", fontStyle: "bold" },
      { token: "keyword.field", foreground: "0F766E", fontStyle: "bold" },
      { token: "keyword.barcode", foreground: "9A6700", fontStyle: "bold" },
      { token: "keyword.font", foreground: "1D4ED8" },
      { token: "keyword.graphic", foreground: "0369A1" },
      { token: "keyword.storage", foreground: "6D28D9" },
      { token: "keyword.network", foreground: "BE123C" },
      { token: "keyword.rfid", foreground: "C2410C" },
      { token: "number", foreground: "047857" },
      { token: "string", foreground: "B42318" },
      { token: "string.escape", foreground: "C2410C", fontStyle: "bold" },
      { token: "constant", foreground: "6D28D9" },
      { token: "zplFormat", foreground: "7C3AED", fontStyle: "bold" },
      { token: "zplText", foreground: "1D4ED8" },
      { token: "zplBarcode", foreground: "9A6700", fontStyle: "bold" },
      { token: "zplGraphic", foreground: "0369A1" },
      { token: "zplStorage", foreground: "6D28D9" },
      { token: "zplNetwork", foreground: "BE123C" },
      { token: "zplRfid", foreground: "C2410C" },
      { token: "zplPrinter", foreground: "7C3AED", fontStyle: "bold" },
    ],
    colors: {
      "editor.background": "#ffffff",
      "editorGutter.background": "#ffffff",
      "editorLineNumber.foreground": "#a1a1aa",
      "editorLineNumber.activeForeground": "#3f3f46",
      "editorIndentGuide.background1": "#f4f4f5",
      "editor.selectionBackground": "#dbeafe",
      "editor.inactiveSelectionBackground": "#e4e4e780",
      "editor.lineHighlightBackground": "#fafafa",
      "editorSuggestWidget.background": "#ffffff",
      "editorHoverWidget.background": "#ffffff",
    },
  });

  for (const document of props.workspaceDocuments) {
    getOrCreateModel(document.id, document.filename, document.source);
  }
  model = getOrCreateModel(currentDocumentId, props.filename, props.modelValue);
  editor = monaco.editor.create(editorContainer.value, {
    model,
    theme: resolvedTheme(),
    extraEditorClassName: "zpl-user-select",
    automaticLayout: true,
    ariaLabel: "ZPL source editor",
    fontSize: props.preferences.fontSize,
    lineHeight: Math.max(18, Math.round(props.preferences.fontSize * 1.6)),
    fontLigatures: false,
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    lineNumbers: "on",
    lineNumbersMinChars: 3,
    glyphMargin: true,
    folding: true,
    foldingStrategy: "auto",
    showFoldingControls: "mouseover",
    scrollBeyondLastLine: false,
    smoothScrolling: true,
    wordWrap: props.preferences.wordWrap ? "on" : "off",
    wrappingIndent: "same",
    renderWhitespace: props.preferences.renderWhitespace,
    renderLineHighlight: "all",
    rulers: [80],
    padding: { top: 12, bottom: 16 },
    minimap: {
      enabled: props.preferences.minimap,
      renderCharacters: false,
      showSlider: "mouseover",
      size: "fit",
      maxColumn: 80,
    },
    suggest: {
      showStatusBar: true,
      preview: true,
      shareSuggestSelections: false,
    },
    quickSuggestions: { comments: false, strings: false, other: true },
    parameterHints: { enabled: true, cycle: true },
    inlayHints: { enabled: "off" },
    hover: { enabled: true, delay: 250 },
    fixedOverflowWidgets: true,
    tabSize: 2,
  });
  editor.addAction({
    id: "zplr.format-document",
    label: "Format ZPL Document",
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF],
    run: () => editor?.getAction("editor.action.formatDocument")?.run(),
  });
  editor.addAction({
    id: "zplr.select-all-source",
    label: "ZPL: Select All Source",
    run: selectAllSource,
  });
  editor.addAction({
    id: "zplr.insert-label",
    label: "ZPL: Insert Label Template",
    run: () => insertSnippet("^XA\n^PW${1:812}\n^LL${2:1218}\n^FO${3:40},${4:40}^A0N,${5:40},${5:40}^FD${6:Label text}^FS\n^XZ"),
  });
  editor.addAction({
    id: "zplr.quick-fix",
    label: "ZPL: Show Quick Fixes",
    keybindings: [monaco.KeyMod.Alt | monaco.KeyCode.Enter],
    run: () => editor?.getAction("editor.action.quickFix")?.run(),
  });

  editor.onDidChangeCursorPosition(emitCursorState);
  editor.onDidChangeCursorSelection(emitCursorState);
  editor.onDidFocusEditorText(() => emit("update:focused", true));
  editor.onDidBlurEditorText(() => emit("update:focused", false));
  editor.onDidChangeModel(() => {
    const nextModel = editor?.getModel();
    const nextEntry = [...models.entries()].find(([, candidate]) => candidate === nextModel);
    if (!nextModel || !nextEntry) return;
    model = nextModel;
    if (nextEntry[0] === currentDocumentId) return;
    currentDocumentId = nextEntry[0];
    decorationIds = [];
    emit("activate:workspaceDocument", currentDocumentId);
    emitCursorState();
  });

  darkModeQuery = window.matchMedia("(prefers-color-scheme: dark)");
  darkModeQuery.addEventListener("change", handleDarkModeChange);
  applyPreferences();
  applyCursor(props.cursorPosition);
  applyHighlight(props.highlightRange);
  applyDiagnostics(props.diagnostics);
  emitCursorState();
  emit("ready");
});

watch(() => props.cursorPosition, applyExternalCursor);
watch(() => props.highlightRange, applyHighlight, { immediate: true });
watch(() => props.diagnostics, applyDiagnostics, { deep: true });
watch(() => props.documentId, switchDocument);
watch(() => props.workspaceDocuments, (workspaceDocuments) => {
  if (!monaco || workspaceDocuments.length === 0) return;
  const openIds = new Set(workspaceDocuments.map(({ id }) => id));
  for (const document of workspaceDocuments) {
    const workspaceModel = getOrCreateModel(document.id, document.filename, document.source);
    if (document.id !== currentDocumentId && workspaceModel.getValue() !== document.source) {
      synchronizeModelValue(document.id, workspaceModel, document.source);
    }
  }
  for (const [documentId, openModel] of models) {
    if (openIds.has(documentId) || documentId === currentDocumentId) continue;
    monaco.editor.setModelMarkers(openModel, "zplr", []);
    modelListeners.get(documentId)?.dispose();
    modelListeners.delete(documentId);
    openModel.dispose();
    models.delete(documentId);
    viewStates.delete(documentId);
  }
}, { deep: true });
watch(() => props.preferences, applyPreferences, { deep: true });
watch(
  () => props.modelValue,
  (newValue) => {
    if (!editor || !model || model.getValue() === newValue) return;
    const currentPosition = editor.getPosition();
    synchronizeModelValue(currentDocumentId, model, newValue);
    if (currentPosition) editor.setPosition(currentPosition);
  }
);

onBeforeUnmount(() => {
  disposed = true;
  darkModeQuery?.removeEventListener("change", handleDarkModeChange);
  languageService?.dispose();
  if (monaco) {
    for (const openModel of models.values()) monaco.editor.setModelMarkers(openModel, "zplr", []);
  }
  editor?.dispose();
  for (const listener of modelListeners.values()) listener.dispose();
  modelListeners.clear();
  for (const openModel of models.values()) openModel.dispose();
  models.clear();
  viewStates.clear();
});

defineExpose({
  getEditor: () => editor,
  focus: () => editor?.focus(),
  formatDocument: () => editor?.getAction("editor.action.formatDocument")?.run(),
  find: () => editor?.getAction("actions.find")?.run(),
  replace: () => editor?.getAction("editor.action.startFindReplaceAction")?.run(),
  commandPalette: () => {
    editor?.focus();
    editor?.trigger("toolbar", "editor.action.quickCommand", null);
  },
  triggerSuggest: () => {
    editor?.focus();
    return editor?.getAction("editor.action.triggerSuggest")?.run();
  },
  undo: () => editor?.trigger("toolbar", "undo", null),
  redo: () => editor?.trigger("toolbar", "redo", null),
  applySourceEdit,
  revealSpan: revealSourceRange,
  syncSpan: synchronizeSourceRange,
  clearSelection: clearSourceSelection,
  selectAll: selectAllSource,
  insertCommand: (command: string) => {
    const position = editor?.getPosition();
    const offset = position && model ? model.getOffsetAt(position) : 0;
    insertSnippet(zplSnippetForSource(command, model?.getValue() ?? "", offset));
  },
});
</script>

<style>
.monaco-editor.zpl-user-select .lines-content,
.monaco-editor.zpl-user-select .view-lines,
.monaco-editor.zpl-user-select .view-line {
  -webkit-user-select: text;
  user-select: text;
}

.monaco-editor .highlighted-command {
  background-color: rgb(24 24 27 / 0.1);
  border-left: 2px solid rgb(24 24 27 / 0.65);
}

.monaco-editor .highlighted-command-inline {
  background-color: rgb(24 24 27 / 0.08);
}

@media (prefers-color-scheme: dark) {
  .monaco-editor .highlighted-command {
    background-color: rgb(255 255 255 / 0.12);
    border-left-color: rgb(255 255 255 / 0.7);
  }

  .monaco-editor .highlighted-command-inline {
    background-color: rgb(255 255 255 / 0.1);
  }
}
</style>
