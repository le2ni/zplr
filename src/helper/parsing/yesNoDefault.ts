export function yesNoDefault(value: string, def: boolean): boolean {
  if (!value) return def;
  const normalized = value.trim();
  if (normalized === "Y") {
    return true;
  } else if (normalized === "N") {
    return false;
  } else {
    return def;
  }
}
