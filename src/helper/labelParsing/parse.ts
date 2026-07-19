import { CommandMap, Commands } from "@/commands";
import { parseDocument } from "@/core/documentParser";
import { CommandClass } from "@/types/CommandClass";
import { ZplLabelNode } from "@/types/ZplDocument";

const parsedLabelNode = Symbol("zplr.parsedLabelNode");

interface ParsedLabelMetadata {
  label: ZplLabelNode;
  commandIndexMap: ReadonlyMap<number, number>;
}

type StructuralCommand = "XA" | "XZ" | "CC" | "CD" | "CT";

export function nextCommandIndex(
  zpl: string,
  caret: string,
  tilde: string
): number {
  const caretIndex = zpl.indexOf(caret);
  const tildeIndex = zpl.indexOf(tilde);
  let index = zpl.length;
  if (caretIndex !== -1) index = Math.min(index, caretIndex);
  if (tildeIndex !== -1) index = Math.min(index, tildeIndex);
  return index;
}

export function skipToCommandStart(
  zpl: string,
  caret: string,
  tilde: string
): string {
  return zpl.slice(nextCommandIndex(zpl, caret, tilde));
}

export function getCommandEnd(
  zpl: string,
  caret: string,
  tilde: string
): number {
  return nextCommandIndex(zpl.slice(1), caret, tilde) + 1;
}

function legacyCommandName(commandText: string): string | undefined {
  if (commandText.startsWith("A@")) return "A@";
  if (commandText.startsWith("A")) return "A";
  const command = commandText.slice(0, 2);
  return /^[A-Z0-9]{2}$/.test(command) ? command : undefined;
}

export function getCommandInfo(
  zpl: string,
  caret: string,
  tilde: string
):
  | {
      name: Commands | StructuralCommand | "A@";
      paramText: string;
      remaining: string;
    }
  | undefined {
  if (zpl[0] !== caret && zpl[0] !== tilde) return undefined;
  const commandName = legacyCommandName(zpl.slice(1));
  if (!commandName) return undefined;
  const commandEnd = getCommandEnd(zpl, caret, tilde);
  return {
    name: commandName as Commands | StructuralCommand | "A@",
    paramText: zpl.slice(commandName.length + 1, commandEnd),
    remaining: zpl.slice(commandEnd),
  };
}

export function getParsedLabelNode(
  commands: readonly CommandClass[]
): ZplLabelNode | undefined {
  return getParsedLabelMetadata(commands)?.label;
}

export function getParsedLabelMetadata(
  commands: readonly CommandClass[]
): ParsedLabelMetadata | undefined {
  return (
    commands as CommandClass[] & {
      [parsedLabelNode]?: ParsedLabelMetadata;
    }
  )[parsedLabelNode];
}

/**
 * Legacy parser adapter. New integrations should use parseDocument() so unknown
 * commands and structured diagnostics remain available.
 */
export function parse(zpl: string): CommandClass[][] {
  const document = parseDocument(zpl);
  return document.labels.map((label) => {
    const commands: CommandClass[] = [];
    const commandIndexMap = new Map<number, number>();
    for (const node of label.commands) {
      const commandClass = CommandMap[node.code as Commands];
      if (!commandClass) continue;
      const normalizedParameters =
        node.code === "FD" || node.code === "FX"
          ? node.rawParameters
          : node.parameters.join(",");
      const commandInstance = new commandClass(
        normalizedParameters
      ) as CommandClass;
      commandInstance.sourceStart = node.span.start;
      commandInstance.sourceEnd = node.span.end;
      commandIndexMap.set(node.index, commands.length);
      commands.push(commandInstance);
    }

    Object.defineProperty(commands, parsedLabelNode, {
      value: { label, commandIndexMap } satisfies ParsedLabelMetadata,
      configurable: false,
      enumerable: false,
      writable: false,
    });
    return commands;
  });
}

export { parseDocument } from "@/core/documentParser";
