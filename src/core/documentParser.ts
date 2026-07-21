import {
  commandCapabilities,
  getCommandCapability,
  getCommandCapabilityStatus,
} from "./capabilities";
import {
  ParseDocumentOptions,
  SourceSpan,
  ZplCommandNode,
  ZplDiagnostic,
  ZplDocument,
  ZplLabelNode,
  ZplPrefixKind,
  ZplSyntaxState,
} from "@/types/ZplDocument";

const STX = "\u0002";
const ETX = "\u0003";
const SI = "\u000f";

type LexicalState = ZplSyntaxState;

interface TokenizeResult {
  commands: ZplCommandNode[];
  diagnostics: ZplDiagnostic[];
  syntax: ZplSyntaxState;
}

function diagnostic(
  code: string,
  message: string,
  span: SourceSpan,
  severity: "info" | "warning" | "error" = "warning",
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

function binaryCommandEnd(
  source: string,
  parameterStart: number,
  delimiter: string,
  code: string,
  prefixKind: ZplPrefixKind,
  state: LexicalState
): number | undefined {
  const headerFields =
    code === "DY" && prefixKind === "control"
      ? 5
      : code === "GF" && prefixKind === "format"
      ? 4
      : 0;
  if (headerFields === 0) return undefined;
  const delimiters: number[] = [];
  for (let index = parameterStart; index < source.length; index++) {
    if (source[index] === delimiter) {
      delimiters.push(index);
      if (delimiters.length === headerFields) break;
    } else if (isBoundary(source[index], state)) {
      return undefined;
    }
  }
  if (delimiters.length < headerFields) return undefined;
  const lastDelimiter = delimiters[headerFields - 1];
  const header = source.slice(parameterStart, lastDelimiter).split(delimiter);
  const format = header[code === "DY" ? 1 : 0]?.trim().toUpperCase();
  if (format !== "B" && format !== "C") return undefined;
  const byteCount = header[code === "DY" ? 3 : 1]?.trim() ?? "";
  if (!/^\d+$/.test(byteCount)) return undefined;
  const bytes = Number(byteCount);
  if (!Number.isSafeInteger(bytes)) return undefined;
  return Math.min(source.length, lastDelimiter + 1 + bytes);
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

function tokenize(
  source: string,
  initialSyntax: Partial<ZplSyntaxState> = {}
): TokenizeResult {
  const commands: ZplCommandNode[] = [];
  const diagnostics: ZplDiagnostic[] = [];
  const state: LexicalState = {
    formatPrefix: initialSyntax.formatPrefix?.[0] ?? "^",
    controlPrefix: initialSyntax.controlPrefix?.[0] ?? "~",
    delimiter: initialSyntax.delimiter?.[0] ?? ",",
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
        canonical: `^${code}`,
        prefix,
        prefixKind: "control-character",
        rawParameters: "",
        parameters: [],
        delimiter: state.delimiter,
        span: { start: boundary, end: boundary + 1 },
        index: 0,
        capability: getCommandCapabilityStatus(`^${code}`),
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
    const canonicalPrefix = prefixKind === "format" ? "^" : "~";
    const canonical = `${canonicalPrefix}${codeInfo.code}`;
    const parameterStart = boundary + 1 + codeInfo.length;
    const changesLexicalState = ["^CC", "~CC", "^CD", "~CD", "^CT", "~CT"].includes(
      canonical
    );
    const binaryEnd = binaryCommandEnd(
      source,
      parameterStart,
      state.delimiter,
      codeInfo.code,
      prefixKind,
      state
    );
    const end = changesLexicalState
      ? Math.min(parameterStart + 1, source.length)
      : binaryEnd ?? findBoundary(source, parameterStart, state);
    const rawParameters = source.slice(parameterStart, end);
    const activeDelimiter = state.delimiter;

    const node: ZplCommandNode = {
      kind: "command",
      code: codeInfo.code,
      canonical,
      prefix,
      prefixKind,
      rawParameters,
      parameters:
        rawParameters.length === 0 ? [] : rawParameters.split(activeDelimiter),
      delimiter: activeDelimiter,
      span: { start: boundary, end },
      index: 0,
      capability: getCommandCapabilityStatus(canonical),
    };
    commands.push(node);

    if (node.capability === "unknown") {
      const codeIsKnown = commandCapabilities.some(
        (capability) => capability.code === node.code
      );
      diagnostics.push(
        diagnostic(
          codeIsKnown ? "INVALID_COMMAND_PREFIX" : "UNKNOWN_COMMAND",
          codeIsKnown
            ? `${node.canonical} uses a prefix that is not documented for ${node.code}.`
            : `${node.canonical} is not recognized and was retained without interpretation.`,
          node.span,
          "warning",
          node.canonical
        )
      );
    } else if (node.capability === "unsupported") {
      diagnostics.push(
        diagnostic(
          "UNSUPPORTED_COMMAND",
          `${node.canonical} is recognized but is not supported by this profile.`,
          node.span,
          "warning",
          node.canonical
        )
      );
    } else if (node.capability === "partial") {
      const limitations = getCommandCapability(node.canonical)?.limitations ?? [];
      diagnostics.push(
        diagnostic(
          "PARTIALLY_SUPPORTED_COMMAND",
          `${node.canonical} is supported with limitations${
            limitations.length ? `: ${limitations.join(" ")}` : "."
          }`,
          node.span,
          "info",
          node.canonical
        )
      );
    } else if (node.capability === "non-rendering") {
      diagnostics.push(
        diagnostic(
          "NON_RENDERING_COMMAND",
          `${node.canonical} is recognized and has no label-raster effect.`,
          node.span,
          "info",
          node.canonical
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
          node.canonical
        )
      );
    } else if (node.canonical === "^CC" || node.canonical === "~CC") {
      state.formatPrefix = rawParameters[0];
    } else if (node.canonical === "^CT" || node.canonical === "~CT") {
      state.controlPrefix = rawParameters[0];
    } else if (node.canonical === "^CD" || node.canonical === "~CD") {
      state.delimiter = rawParameters[0];
    }

    if (state.formatPrefix === state.controlPrefix) {
      diagnostics.push(
        diagnostic(
          "PREFIX_COLLISION",
          "Format and control prefixes are the same; commands are treated as format commands.",
          node.span,
          "warning",
          node.canonical
        )
      );
    }

    index = Math.max(end, boundary + 1);
  }

  return { commands, diagnostics, syntax: { ...state } };
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

function groupItems(
  commands: ZplCommandNode[],
  diagnostics: ZplDiagnostic[]
): { items: Array<ZplLabelNode | ZplCommandNode>; labels: ZplLabelNode[] } {
  const items: Array<ZplLabelNode | ZplCommandNode> = [];
  const labels: ZplLabelNode[] = [];
  let current: ZplCommandNode[] = [];
  let explicit = false;

  const currentIsSessionSetup = () =>
    !explicit &&
    current.length > 0 &&
    current.every(
      (command) => getCommandCapability(command.canonical)?.scope === "session"
    );

  const finishSessionSetup = () => {
    items.push(...current);
    current = [];
    explicit = false;
  };

  const finishCurrent = () => {
    if (current.length > 0) {
      const label = makeLabel(current, explicit);
      labels.push(label);
      items.push(label);
    }
    current = [];
    explicit = false;
  };

  for (const command of commands) {
    if (command.canonical === "^XA") {
      if (current.length > 0) {
        if (currentIsSessionSetup()) {
          finishSessionSetup();
        } else if (explicit) {
          diagnostics.push(
            diagnostic(
              "NESTED_FORMAT",
              "A new XA command started before the previous format ended.",
              command.span,
              "error",
              "^XA"
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

    if (command.canonical === "^XZ") {
      if (current.length === 0) {
        diagnostics.push(
          diagnostic(
            "UNMATCHED_FORMAT_END",
            "XZ was received without a matching XA.",
            command.span,
            "error",
            "^XZ"
          )
        );
        items.push(command);
        continue;
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

    if (!explicit && current.length === 0) {
      const capability = getCommandCapability(command.canonical);
      if (capability?.effect === "job" || capability?.effect === "device") {
        items.push(command);
        continue;
      }
    }

    current.push(command);
  }

  if (current.length > 0) {
    if (currentIsSessionSetup()) {
      finishSessionSetup();
    } else {
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
  }

  return { items, labels };
}

export function parseDocument(
  source: string,
  options: ParseDocumentOptions = {}
): ZplDocument {
  const profile = "zpl-ii-2025" as const;
  if (typeof source !== "string") {
    return {
      kind: "document",
      source: "",
      profile,
      items: [],
      labels: [],
      syntax: {
        formatPrefix: options.initialSyntax?.formatPrefix?.[0] ?? "^",
        controlPrefix: options.initialSyntax?.controlPrefix?.[0] ?? "~",
        delimiter: options.initialSyntax?.delimiter?.[0] ?? ",",
      },
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
  const tokenized = tokenize(source, options.initialSyntax);
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
  const { items, labels } = groupItems(tokenized.commands, diagnostics);

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
    items,
    labels,
    syntax: tokenized.syntax,
    diagnostics,
  };
}
