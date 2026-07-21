const ZPL_DECIMAL = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;

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
    desired >= base
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
