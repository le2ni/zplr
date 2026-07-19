import { getCommandCapabilityStatus } from "./capabilities";
import {
  ParseDocumentOptions,
  SourceSpan,
  ZplCommandNode,
  ZplDiagnostic,
  ZplDocument,
  ZplLabelNode,
  ZplPrefixKind,
} from "@/types/ZplDocument";

const STX = "\u0002";
const ETX = "\u0003";
const SI = "\u000f";

interface LexicalState {
  formatPrefix: string;
  controlPrefix: string;
  delimiter: string;
}

interface TokenizeResult {
  commands: ZplCommandNode[];
  diagnostics: ZplDiagnostic[];
}

function diagnostic(
  code: string,
  message: string,
  span: SourceSpan,
  severity: "warning" | "error" = "warning",
  command?: string
): ZplDiagnostic {
  return { code, message, span, severity, command, phase: "parse" };
}

function isControlCharacter(value: string): boolean {
  return value === STX || value === ETX || value === SI;
}

function isBoundary(value: string, state: LexicalState): boolean {
  return (
    value === state.formatPrefix ||
    value === state.controlPrefix ||
    isControlCharacter(value)
  );
}

function findBoundary(
  source: string,
  from: number,
  state: LexicalState
): number {
  for (let index = from; index < source.length; index++) {
    if (isBoundary(source[index], state)) return index;
  }
  return source.length;
}

function controlCharacterCommand(value: string): string {
  if (value === STX) return "XA";
  if (value === ETX) return "XZ";
  return "FS";
}

function commandCodeAt(
  source: string,
  prefixIndex: number
): { code: string; length: number } | undefined {
  const first = source[prefixIndex + 1];
  if (!first) return undefined;

  if (first === "A") {
    if (source[prefixIndex + 2] === "@") return { code: "A@", length: 2 };
    return { code: "A", length: 1 };
  }

  const code = source.slice(prefixIndex + 1, prefixIndex + 3);
  if (!/^[A-Z0-9]{2}$/.test(code)) return undefined;
  return { code, length: 2 };
}

function tokenize(source: string): TokenizeResult {
  const commands: ZplCommandNode[] = [];
  const diagnostics: ZplDiagnostic[] = [];
  const state: LexicalState = {
    formatPrefix: "^",
    controlPrefix: "~",
    delimiter: ",",
  };

  let index = 0;
  while (index < source.length) {
    const boundary = findBoundary(source, index, state);
    if (boundary > index) {
      const skipped = source.slice(index, boundary);
      if (skipped.trim().length > 0) {
        diagnostics.push(
          diagnostic(
            "TEXT_OUTSIDE_COMMAND",
            "Text outside a ZPL command was ignored.",
            { start: index, end: boundary }
          )
        );
      }
    }
    if (boundary >= source.length) break;

    const prefix = source[boundary];
    if (isControlCharacter(prefix)) {
      const code = controlCharacterCommand(prefix);
      commands.push({
        kind: "command",
        code,
        prefix,
        prefixKind: "control-character",
        rawParameters: "",
        parameters: [],
        delimiter: state.delimiter,
        span: { start: boundary, end: boundary + 1 },
        index: 0,
        capability: getCommandCapabilityStatus(code),
      });
      index = boundary + 1;
      continue;
    }

    const codeInfo = commandCodeAt(source, boundary);
    if (!codeInfo) {
      const end = Math.min(boundary + 3, source.length);
      diagnostics.push(
        diagnostic(
          "INVALID_COMMAND",
          "A command prefix was not followed by a valid ZPL command code.",
          { start: boundary, end },
          "error"
        )
      );
      index = boundary + 1;
      continue;
    }

    const prefixKind: ZplPrefixKind =
      prefix === state.formatPrefix ? "format" : "control";
    const parameterStart = boundary + 1 + codeInfo.length;
    const changesLexicalState = ["CC", "CD", "CT"].includes(codeInfo.code);
    const end = changesLexicalState
      ? Math.min(parameterStart + 1, source.length)
      : findBoundary(source, parameterStart, state);
    const rawParameters = source.slice(parameterStart, end);
    const activeDelimiter = state.delimiter;

    const node: ZplCommandNode = {
      kind: "command",
      code: codeInfo.code,
      prefix,
      prefixKind,
      rawParameters,
      parameters:
        rawParameters.length === 0 ? [] : rawParameters.split(activeDelimiter),
      delimiter: activeDelimiter,
      span: { start: boundary, end },
      index: 0,
      capability: getCommandCapabilityStatus(codeInfo.code),
    };
    commands.push(node);

    if (node.capability === "unknown") {
      diagnostics.push(
        diagnostic(
          "UNKNOWN_COMMAND",
          `${node.code} is not recognized and was retained without interpretation.`,
          node.span,
          "warning",
          node.code
        )
      );
    } else if (node.capability === "unsupported") {
      diagnostics.push(
        diagnostic(
          "UNSUPPORTED_COMMAND",
          `${node.code} is recognized but is not supported by this profile.`,
          node.span,
          "warning",
          node.code
        )
      );
    }

    if (changesLexicalState && rawParameters.length === 0) {
      diagnostics.push(
        diagnostic(
          "MISSING_PREFIX_PARAMETER",
          `${codeInfo.code} requires the next character as its parameter.`,
          node.span,
          "error",
          codeInfo.code
        )
      );
    } else if (codeInfo.code === "CC") {
      state.formatPrefix = rawParameters[0];
    } else if (codeInfo.code === "CT") {
      state.controlPrefix = rawParameters[0];
    } else if (codeInfo.code === "CD") {
      state.delimiter = rawParameters[0];
    }

    if (state.formatPrefix === state.controlPrefix) {
      diagnostics.push(
        diagnostic(
          "PREFIX_COLLISION",
          "Format and control prefixes are the same; commands are treated as format commands.",
          node.span,
          "warning",
          node.code
        )
      );
    }

    index = Math.max(end, boundary + 1);
  }

  return { commands, diagnostics };
}

function makeLabel(
  commands: ZplCommandNode[],
  explicit: boolean
): ZplLabelNode {
  commands.forEach((command, index) => {
    command.index = index;
  });
  return {
    kind: "label",
    explicit,
    commands,
    span: {
      start: commands[0]?.span.start ?? 0,
      end: commands[commands.length - 1]?.span.end ?? 0,
    },
  };
}

function groupLabels(
  commands: ZplCommandNode[],
  diagnostics: ZplDiagnostic[]
): ZplLabelNode[] {
  const labels: ZplLabelNode[] = [];
  let current: ZplCommandNode[] = [];
  let explicit = false;

  const finishCurrent = () => {
    if (current.length > 0) labels.push(makeLabel(current, explicit));
    current = [];
    explicit = false;
  };

  for (const command of commands) {
    if (command.code === "XA") {
      if (current.length > 0) {
        if (explicit) {
          diagnostics.push(
            diagnostic(
              "NESTED_FORMAT",
              "A new XA command started before the previous format ended.",
              command.span,
              "error",
              "XA"
            )
          );
        } else {
          diagnostics.push(
            diagnostic(
              "IMPLICIT_LABEL",
              "Commands before XA were retained as an implicit label.",
              { start: current[0].span.start, end: current[current.length - 1].span.end }
            )
          );
        }
        finishCurrent();
      }
      explicit = true;
      current.push(command);
      continue;
    }

    if (command.code === "XZ") {
      if (current.length === 0) {
        diagnostics.push(
          diagnostic(
            "UNMATCHED_FORMAT_END",
            "XZ was received without a matching XA.",
            command.span,
            "error",
            "XZ"
          )
        );
      } else if (!explicit) {
        diagnostics.push(
          diagnostic(
            "IMPLICIT_LABEL",
            "A fragment ending in XZ was retained as an implicit label.",
            { start: current[0].span.start, end: command.span.end }
          )
        );
      }
      current.push(command);
      finishCurrent();
      continue;
    }

    current.push(command);
  }

  if (current.length > 0) {
    diagnostics.push(
      diagnostic(
        explicit ? "UNTERMINATED_FORMAT" : "IMPLICIT_LABEL",
        explicit
          ? "The label started with XA but did not end with XZ."
          : "Commands outside XA/XZ were retained as an implicit label.",
        { start: current[0].span.start, end: current[current.length - 1].span.end },
        explicit ? "error" : "warning"
      )
    );
    finishCurrent();
  }

  return labels;
}

export function parseDocument(
  source: string,
  options: ParseDocumentOptions = {}
): ZplDocument {
  const profile = "zpl-ii-2006";
  if (typeof source !== "string") {
    return {
      kind: "document",
      source: "",
      profile,
      labels: [],
      diagnostics: [
        diagnostic(
          "INVALID_INPUT",
          "ZPL source must be a string.",
          { start: 0, end: 0 },
          "error"
        ),
      ],
    };
  }
  const tokenized = tokenize(source);
  const diagnostics = [...tokenized.diagnostics];
  if (options.profile !== undefined && options.profile !== profile) {
    diagnostics.push(
      diagnostic(
        "UNSUPPORTED_PROFILE",
        `Profile ${String(options.profile)} is not supported; ${profile} was used.`,
        { start: 0, end: 0 },
        "error"
      )
    );
  }
  const labels = groupLabels(tokenized.commands, diagnostics);

  diagnostics.forEach((item) => {
    const labelIndex = labels.findIndex(
      (label) =>
        item.span !== undefined &&
        item.span.start >= label.span.start &&
        item.span.start < label.span.end
    );
    if (labelIndex >= 0) item.labelIndex = labelIndex;
  });

  return {
    kind: "document",
    source,
    profile,
    labels,
    diagnostics,
  };
}
