const ZPL_DECIMAL = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;

/** ^JM is a format-wide logical-dot size selected before the first ^FS. */
export function zplDotScale(commands: readonly { canonical: string; parameters: readonly string[] }[]): 1 | 2 {
  let scale: 1 | 2 = 1;
  for (const command of commands) {
    if (command.canonical === "^FS") break;
    if (command.canonical !== "^JM") continue;
    const mode = command.parameters[0]?.trim().toUpperCase() || "A";
    if (mode === "A") scale = 1;
    if (mode === "B") scale = 2;
  }
  return scale;
}

/** Parse the plain decimal syntax accepted by numeric ZPL parameters. */
export function zplNumber(value: string | undefined): number | undefined {
  const normalized = value?.trim() ?? "";
  if (!ZPL_DECIMAL.test(normalized)) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** Parse a base-10 integer without accepting JavaScript hex/exponent syntax. */
export function zplInteger(value: string | undefined): number | undefined {
  const parsed = zplNumber(value);
  return parsed !== undefined && Number.isSafeInteger(parsed)
    ? parsed
    : undefined;
}

const FORMAT_DPI = new Set([150, 200, 300, 600]);
const FORMAT_DPI_CONVERSIONS = new Set([
  "150:150",
  "150:300",
  "150:600",
  "200:200",
  "200:600",
  "300:300",
  "600:600",
]);

export interface ZplDpiConversion {
  base: number;
  desired: number;
}

/** Parse a complete, documented ^MU source-to-printer DPI pair. */
export function zplDpiConversion(
  baseValue: string | undefined,
  desiredValue: string | undefined
): ZplDpiConversion | undefined {
  const base = zplInteger(baseValue);
  const desired = zplInteger(desiredValue);
  return base !== undefined &&
    desired !== undefined &&
    FORMAT_DPI.has(base) &&
    FORMAT_DPI.has(desired) &&
    FORMAT_DPI_CONVERSIONS.has(`${base}:${desired}`)
    ? { base, desired }
    : undefined;
}

/**
 * Apply a documented ^MU source-to-printer DPI conversion. Missing or invalid
 * pairs leave the prior conversion in force; matching values turn it off.
 */
export function zplDotConversion(
  baseValue: string | undefined,
  desiredValue: string | undefined,
  previous: number
): number {
  const conversion = zplDpiConversion(baseValue, desiredValue);
  return conversion ? conversion.desired / conversion.base : previous;
}
