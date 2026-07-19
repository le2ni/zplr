import { stripWhitespace } from "./stripWhitespace";

export function parseNumber(
  value: string,
  def: number,
  min?: number,
  max?: number
): number {
  const stripped = stripWhitespace(value);
  const parsed = parseFloat(stripped);
  const num = isNaN(parsed) ? def : parsed;
  return Math.min(Math.max(num, min ?? -Infinity), max ?? Infinity);
}
