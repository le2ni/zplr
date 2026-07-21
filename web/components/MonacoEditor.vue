<template>
  <div
    ref="editorContainer"
    class="h-full w-full monaco-editor-container"
    data-testid="zpl-editor"
  ></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import loader from "@monaco-editor/loader";
import * as MonacoRuntime from "monaco-editor/esm/vs/editor/editor.api";
import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import type * as Monaco from "monaco-editor";
import type { CommandCapability } from "../../src/index.web";

self.MonacoEnvironment = {
  getWorker: () => new EditorWorker(),
};
loader.config({ monaco: MonacoRuntime });

const props = defineProps<{
  modelValue: string;
  capabilities: readonly CommandCapability[];
  cursorPosition?: number;
  highlightRange?: { start: number; end: number };
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
  "update:cursorPosition": [position: number];
}>();

const editorContainer = ref<HTMLElement | null>(null);
let editor: Monaco.editor.IStandaloneCodeEditor | null = null;
let monaco: typeof Monaco | null = null;
let decorationIds: string[] = [];
let darkModeQuery: MediaQueryList | null = null;
let tokenProvider: Monaco.IDisposable | null = null;
let disposed = false;
const handleDarkModeChange = (event: MediaQueryListEvent) => {
  if (editor && monaco) {
    monaco.editor.setTheme(event.matches ? "zpl-dark" : "zpl-light");
  }
};

function commandPattern(
  capabilities: readonly CommandCapability[],
  predicate: (capability: CommandCapability) => boolean
): RegExp {
  const alternatives = capabilities
    .filter(predicate)
    .map(({ canonical }) => canonical.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .sort((left, right) => right.length - left.length || left.localeCompare(right));
  return alternatives.length > 0
    ? new RegExp(`(?:${alternatives.join("|")})`)
    : /(?!)/;
}

function configureTokens(): void {
  if (!monaco || props.capabilities.length === 0) return;
  tokenProvider?.dispose();
  const category = (name: CommandCapability["category"]) =>
    commandPattern(props.capabilities, (capability) => capability.category === name);
  const other = commandPattern(
    props.capabilities,
    ({ category: name }) => !["barcode", "text", "graphic"].includes(name)
  );
  tokenProvider = monaco.languages.setMonarchTokensProvider("zpl", {
    defaultToken: "",
    tokenPostfix: ".zpl",
    tokenizer: {
      root: [
        [/\^FX/, { token: "comment", next: "@comment" }],
        [/\^FD/, { token: "keyword.field", next: "@fieldData" }],
        [category("barcode"), "keyword.barcode"],
        [category("text"), "keyword.font"],
        [category("graphic"), "keyword.graphic"],
        [other, "keyword.control"],
        [/[+-]?\d+(?:\.\d+)?/, "number"],
        [/,/, "delimiter"],
        [/[a-zA-Z_$][\w$]*/, "identifier"],
      ],
      comment: [
        [/[^\^~]+/, "comment"],
        [/[\^~]/, { token: "@rematch", next: "@pop" }],
      ],
      fieldData: [
        [/[^\^~]+/, "string"],
        [/[\^~]/, { token: "@rematch", next: "@pop" }],
      ],
    },
  });
}

function applyCursor(position: number | undefined): void {
  const model = editor?.getModel();
  if (!editor || !model || position === undefined) return;
  const resolved = model.getPositionAt(position);
  editor.setPosition(resolved);
  editor.revealPositionInCenter(resolved);
}

function applyHighlight(range: { start: number; end: number } | undefined): void {
  const model = editor?.getModel();
  if (!editor || !monaco || !model) return;
  decorationIds = editor.deltaDecorations(decorationIds, []);
  if (!range) return;
  const start = model.getPositionAt(range.start);
  const end = model.getPositionAt(range.end);
  decorationIds = editor.deltaDecorations([], [
    {
      range: new monaco.Range(
        start.lineNumber,
        start.column,
        end.lineNumber,
        end.column
      ),
      options: {
        className: "highlighted-command",
        inlineClassName: "highlighted-command-inline",
      },
    },
  ]);
}

onMounted(async () => {
  if (!editorContainer.value) return;

  const runtime = await loader.init();
  if (disposed || !editorContainer.value) return;
  monaco = runtime;

  if (!monaco.languages.getLanguages().some(({ id }) => id === "zpl")) {
    monaco.languages.register({ id: "zpl" });
  }
  configureTokens();

  // Define ZPL theme
  monaco.editor.defineTheme("zpl-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "6A9955", fontStyle: "italic" },
      { token: "keyword.control", foreground: "C586C0", fontStyle: "bold" },
      { token: "keyword.field", foreground: "4EC9B0" },
      { token: "keyword.barcode", foreground: "DCDCAA" },
      { token: "keyword.font", foreground: "569CD6" },
      { token: "keyword.graphic", foreground: "4FC1FF" },
      { token: "number", foreground: "B5CEA8" },
      { token: "string", foreground: "CE9178" },
      { token: "delimiter", foreground: "D4D4D4" },
    ],
    colors: {
      "editor.background": "#111827", // gray-900 dark
    },
  });

  monaco.editor.defineTheme("zpl-light", {
    base: "vs",
    inherit: true,
    rules: [
      { token: "comment", foreground: "008000", fontStyle: "italic" },
      { token: "keyword.control", foreground: "AF00DB", fontStyle: "bold" },
      { token: "keyword.field", foreground: "267F99" },
      { token: "keyword.barcode", foreground: "795E26" },
      { token: "keyword.font", foreground: "0000FF" },
      { token: "keyword.graphic", foreground: "098658" },
      { token: "number", foreground: "098658" },
      { token: "string", foreground: "A31515" },
      { token: "delimiter", foreground: "000000" },
    ],
    colors: {
      "editor.background": "#F3F4F6", // gray-100
    },
  });

  // Detect dark mode
  const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

  // Create editor
  editor = monaco.editor.create(editorContainer.value, {
    value: props.modelValue,
    language: "zpl",
    theme: isDark ? "zpl-dark" : "zpl-light",
    automaticLayout: true,
    minimap: { enabled: false },
    fontSize: 14,
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    lineNumbers: "on",
    scrollBeyondLastLine: false,
    wordWrap: "on",
    wrappingIndent: "same",
    ariaLabel: "ZPL source editor",
  });

  // Listen for content changes
  editor.onDidChangeModelContent(() => {
    if (editor) {
      emit("update:modelValue", editor.getValue());
    }
  });

  // Listen for cursor position changes
  editor.onDidChangeCursorPosition((e) => {
    if (editor) {
      const model = editor.getModel();
      if (model) {
        const offset = model.getOffsetAt(e.position);
        emit("update:cursorPosition", offset);
      }
    }
  });

  // Listen for dark mode changes
  darkModeQuery = window.matchMedia("(prefers-color-scheme: dark)");
  darkModeQuery.addEventListener("change", handleDarkModeChange);
  applyCursor(props.cursorPosition);
  applyHighlight(props.highlightRange);
});

// Watch for cursor position updates from parent
watch(
  () => props.cursorPosition,
  applyCursor
);

// Watch for highlight range updates from parent
watch(
  () => props.highlightRange,
  applyHighlight,
  { immediate: true }
);

watch(() => props.capabilities, configureTokens);

// Watch for external value changes
watch(
  () => props.modelValue,
  (newValue) => {
    if (editor && editor.getValue() !== newValue) {
      const model = editor.getModel();
      if (model) {
        const currentPosition = editor.getPosition();
        model.setValue(newValue);
        if (currentPosition) {
          editor.setPosition(currentPosition);
        }
      }
    }
  }
);

onBeforeUnmount(() => {
  disposed = true;
  darkModeQuery?.removeEventListener("change", handleDarkModeChange);
  tokenProvider?.dispose();
  const model = editor?.getModel();
  editor?.dispose();
  model?.dispose();
});

// Expose editor for parent component if needed
defineExpose({
  getEditor: () => editor,
});
</script>

<style>
/* Highlight decoration styles */
.monaco-editor .highlighted-command {
  background-color: rgba(255, 165, 0, 0.2);
}

.monaco-editor .highlighted-command-inline {
  background-color: rgba(255, 165, 0, 0.15);
}

/* Dark mode adjustments */
@media (prefers-color-scheme: dark) {
  .monaco-editor .highlighted-command {
    background-color: rgba(255, 165, 0, 0.25);
  }
  
  .monaco-editor .highlighted-command-inline {
    background-color: rgba(255, 165, 0, 0.2);
  }
}
</style>
