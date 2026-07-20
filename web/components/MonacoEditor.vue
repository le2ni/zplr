<template>
  <div ref="editorContainer" class="h-full w-full monaco-editor-container"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import loader from "@monaco-editor/loader";
import type * as Monaco from "monaco-editor";

const props = defineProps<{
  modelValue: string;
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
const handleDarkModeChange = (event: MediaQueryListEvent) => {
  if (editor && monaco) {
    monaco.editor.setTheme(event.matches ? "zpl-dark" : "zpl-light");
  }
};

onMounted(async () => {
  if (!editorContainer.value) return;

  // Load Monaco
  monaco = await loader.init();

  // Register ZPL language
  monaco.languages.register({ id: "zpl" });

  // Define ZPL language tokens
  monaco.languages.setMonarchTokensProvider("zpl", {
    defaultToken: "",
    tokenPostfix: ".zpl",

    // ZPL command prefixes
    commandStart: /[\^~]/,

    tokenizer: {
      root: [
        // Comments (ZPL uses ^FX for comments)
        [/\^FX.*$/, "comment"],

        // Control commands (^XA, ^XZ, etc.)
        [
          /[\^~](XA|XZ|LL|PW|LH|LT|LS|CI|CC|CD|CT|CW|FT|PQ|PR)/,
          "keyword.control",
        ],

        // Field commands
        [
          /[\^~](FO|FD|FS|FB|FN|FP|FV|FW|FM|FR|GB|GC|GD|GE|GF|GP)/,
          "keyword.field",
        ],

        // Barcode commands
        [
          /[\^~](B[0-9A-Z]|BC|BD|BE|BF|BI|BJ|BK|BL|BM|BN|BO|BP|BQ|BR|BS|BT|BU|BX|BY|BZ)/,
          "keyword.barcode",
        ],

        // Font and text commands
        [/[\^~](A|CF|CFA|CV)/, "keyword.font"],

        // Graphic commands
        [/[\^~](G[A-Z])/, "keyword.graphic"],

        // Parameters (numbers after commands)
        [/[0-9]+/, "number"],

        // Separators
        [/[,]/, "delimiter"],

        // Text data (between ^FD and ^FS)
        [/(?<=\^FD)[^\^~]*(?=\^FS)/, "string"],

        // Any other text
        [/[a-zA-Z_$][\w$]*/, "identifier"],
      ],
    },
  });

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
});

// Watch for cursor position updates from parent
watch(
  () => props.cursorPosition,
  (newPosition) => {
    if (editor && newPosition !== undefined) {
      const model = editor.getModel();
      if (model) {
        const position = model.getPositionAt(newPosition);
        editor.setPosition(position);
        editor.revealPositionInCenter(position);
      }
    }
  }
);

// Watch for highlight range updates from parent
watch(
  () => props.highlightRange,
  (newRange) => {
    if (editor && monaco) {
      const model = editor.getModel();
      if (model) {
        // Clear previous decorations
        decorationIds = editor.deltaDecorations(decorationIds, []);
        
        if (newRange) {
          const startPos = model.getPositionAt(newRange.start);
          const endPos = model.getPositionAt(newRange.end);
          
          // Add new decoration with highlight
          decorationIds = editor.deltaDecorations(
            [],
            [
              {
                range: new monaco.Range(
                  startPos.lineNumber,
                  startPos.column,
                  endPos.lineNumber,
                  endPos.column
                ),
                options: {
                  className: "highlighted-command",
                  inlineClassName: "highlighted-command-inline",
                },
              },
            ]
          );
        }
      }
    }
  },
  { immediate: true }
);

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
  darkModeQuery?.removeEventListener("change", handleDarkModeChange);
  if (editor) {
    editor.dispose();
  }
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
