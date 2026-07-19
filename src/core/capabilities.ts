import {
  CommandCapability,
  CommandCapabilityStatus,
} from "@/types/ZplDocument";

const capabilities = [
  { code: "A", name: "Scalable/Bitmapped Font", status: "supported" },
  { code: "A@", name: "Font by Name", status: "unsupported" },
  { code: "B3", name: "Code 39 Bar Code", status: "supported" },
  {
    code: "B4",
    name: "Code 49 Bar Code",
    status: "unsupported",
    limitations: ["No Code 49 encoder is bundled."],
  },
  {
    code: "BC",
    name: "Code 128 Bar Code",
    status: "partial",
    limitations: ["Modes U and D are not supported."],
  },
  {
    code: "BQ",
    name: "QR Code Bar Code",
    status: "partial",
    limitations: [
      "QR Model 1, mixed/divided input, and Kanji manual input are not supported.",
    ],
  },
  { code: "BY", name: "Bar Code Field Default", status: "supported" },
  { code: "CC", name: "Change Caret", status: "supported" },
  { code: "CD", name: "Change Delimiter", status: "supported" },
  { code: "CF", name: "Change Default Font", status: "supported" },
  {
    code: "CI",
    name: "Change International Font/Encoding",
    status: "unsupported",
    limitations: ["Character-set remapping is not implemented."],
  },
  { code: "CT", name: "Change Tilde", status: "supported" },
  { code: "FB", name: "Field Block", status: "supported" },
  { code: "FD", name: "Field Data", status: "supported" },
  { code: "FH", name: "Field Hexadecimal Indicator", status: "supported" },
  { code: "FO", name: "Field Origin", status: "supported" },
  { code: "FR", name: "Field Reverse Print", status: "supported" },
  { code: "FS", name: "Field Separator", status: "supported" },
  { code: "FW", name: "Field Orientation", status: "supported" },
  { code: "FX", name: "Comment", status: "supported" },
  { code: "GB", name: "Graphic Box", status: "supported" },
  { code: "GC", name: "Graphic Circle", status: "supported" },
  { code: "LH", name: "Label Home", status: "supported" },
  { code: "LR", name: "Label Reverse Print", status: "supported" },
  { code: "XA", name: "Start Format", status: "supported" },
  { code: "XZ", name: "End Format", status: "supported" },
] as const satisfies readonly CommandCapability[];

export const commandCapabilities: readonly CommandCapability[] = capabilities;

const capabilityMap = new Map(
  commandCapabilities.map((capability) => [capability.code, capability])
);

export function getCommandCapability(
  code: string
): CommandCapability | undefined {
  return capabilityMap.get(code);
}

export function getCommandCapabilityStatus(
  code: string
): CommandCapabilityStatus {
  return getCommandCapability(code)?.status ?? "unknown";
}
