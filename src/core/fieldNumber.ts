export interface ParsedFieldNumber {
  readonly number: string;
  readonly prompt?: string;
}

/** Parse Zebra's compact `^FN#"prompt"` payload. */
export function parseFieldNumber(value: string | undefined): ParsedFieldNumber | undefined {
  const source = value?.trim() ?? "";
  const match = /^(\d+)(?:"([^"]{0,255})")?$/.exec(source);
  if (!match) return undefined;
  const parsed = Number(match[1]);
  if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > 9_999) return undefined;
  return {
    number: String(parsed),
    prompt: match[2] || undefined,
  };
}
