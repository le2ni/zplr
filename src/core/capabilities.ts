import type {
  CommandCapability,
  CommandCapabilityStatus,
  CommandCategory,
  CommandEffect,
  CommandPersistenceScope,
} from "@/types/ZplDocument";

const REFERENCE =
  "https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands.html";

type CapabilitySeed = Pick<
  CommandCapability,
  "name" | "category" | "effect" | "scope" | "status" | "limitations"
>;

const capabilitySeeds: Readonly<Record<string, CapabilitySeed>> = {
  "^A": raster("Scalable/Bitmapped Font", "text", "field"),
  "^A@": raster("Font by Name", "text", "field"),
  "^B0": raster("Aztec Bar Code", "barcode", "field"),
  "^B1": raster("Code 11 Bar Code", "barcode", "field"),
  "^B2": raster("Interleaved 2 of 5 Bar Code", "barcode", "field"),
  "^B3": raster("Code 39 Bar Code", "barcode", "field"),
  "^B4": raster("Code 49 Bar Code", "barcode", "field"),
  "^B5": raster("Planet Code Bar Code", "barcode", "field"),
  "^B7": raster("PDF417 Bar Code", "barcode", "field"),
  "^B8": raster("EAN-8 Bar Code", "barcode", "field"),
  "^B9": raster("UPC-E Bar Code", "barcode", "field"),
  "^BA": raster("Code 93 Bar Code", "barcode", "field"),
  "^BB": raster("CODABLOCK Bar Code", "barcode", "field"),
  "^BC": raster("Code 128 Bar Code", "barcode", "field"),
  "^BD": raster("UPS MaxiCode Bar Code", "barcode", "field"),
  "^BE": raster("EAN-13 Bar Code", "barcode", "field"),
  "^BF": raster("MicroPDF417 Bar Code", "barcode", "field"),
  "^BI": raster("Industrial 2 of 5 Bar Code", "barcode", "field"),
  "^BJ": raster("Standard 2 of 5 Bar Code", "barcode", "field"),
  "^BK": raster("ANSI Codabar Bar Code", "barcode", "field"),
  "^BL": raster("LOGMARS Bar Code", "barcode", "field"),
  "^BM": raster("MSI Bar Code", "barcode", "field"),
  "^BO": raster("Aztec Bar Code", "barcode", "field"),
  "^BP": raster("Plessey Bar Code", "barcode", "field"),
  "^BQ": raster("QR Code Bar Code", "barcode", "field"),
  "^BR": raster("GS1 DataBar Bar Code", "barcode", "field"),
  "^BS": raster("UPC/EAN Extension Bar Code", "barcode", "field"),
  "^BT": raster("TLC39 Bar Code", "barcode", "field"),
  "^BU": raster("UPC-A Bar Code", "barcode", "field"),
  "^BX": raster("Data Matrix Bar Code", "barcode", "field"),
  "^BY": raster("Bar Code Field Default", "barcode", "session"),
  "^BZ": raster("Postal Bar Code", "barcode", "field"),
  "^CC": job("Change Caret", "format", "session"),
  "~CC": job("Change Caret", "format", "session"),
  "^CD": job("Change Delimiter", "format", "session"),
  "~CD": job("Change Delimiter", "format", "session"),
  "^CF": raster("Change Default Font", "text", "session"),
  "^CI": partial(
    "Change International Font/Encoding",
    "text",
    "session",
    [
      "Table-specific EUC-CN and non-GB18030 ^CI16/^CI26 variants are not inferred without a compatible downloaded mapping; standard Unicode, Western, Shift-JIS, EUC-JP, and GB18030 paths are implemented.",
    ]
  ),
  "^CV": raster("Code Validation", "barcode", "session"),
  "^CM": job("Change Memory Letter Designation", "storage", "session"),
  "^CT": job("Change Tilde", "format", "session"),
  "~CT": job("Change Tilde", "format", "session"),
  "^CW": job("Font Identifier", "text", "session"),
  "~DB": job("Download Bitmap Font", "storage", "session"),
  "~DE": job("Download Encoding", "storage", "session"),
  "^DF": job("Download Format", "storage", "session"),
  "~DG": job("Download Graphics", "storage", "session"),
  "~DS": job("Download Intellifont", "storage", "session"),
  "~DT": job("Download Bounded TrueType Font", "storage", "session"),
  "~DU": job("Download Unbounded TrueType Font", "storage", "session"),
  "~DY": partial(
    "Download Object",
    "storage",
    "session",
    [
      "Legacy BAR-ONE AR-compressed (C) payloads are diagnosed but not decoded.",
      "Image decoding covers non-interlaced 1/2/4/8-bit grayscale or indexed PNG plus 8-bit-per-channel grayscale-alpha, RGB, or RGBA PNG; Windows BMP and OS/2 1.x core-header BMP; and 1-bit planar, 8-bit indexed/grayscale, or 24-bit RGB PCX.",
    ],
    "job"
  ),
  "~EG": job("Erase Download Graphics", "storage", "session"),
  "^FB": raster("Field Block", "text", "field"),
  "^FC": partial(
    "Field Clock",
    "text",
    "field",
    [
      "Localized weekday and month names use host Intl locale data; numeric clock fields remain deterministic, but localized wording can vary by runtime and printer firmware.",
    ]
  ),
  "^FD": raster("Field Data", "text", "field"),
  "^FE": raster("Field End", "text", "field"),
  "^FH": raster("Field Hexadecimal Indicator", "text", "field"),
  "^FN": raster("Field Number", "storage", "field"),
  "^FO": raster("Field Origin", "format", "field"),
  "^FP": partial(
    "Field Parameter",
    "text",
    "field",
    [
      "Vertical and reverse layout operates on Unicode code points rather than firmware combining semantic clusters.",
    ]
  ),
  "^FR": raster("Field Reverse Print", "format", "field"),
  "^FS": raster("Field Separator", "format", "field"),
  "^FT": partial(
    "Field Typeset",
    "format",
    "field",
    [
      "Explicit text origins and text justification are modeled; omitted-coordinate continuation and printer-specific baseline/justification interactions for every field type are not fully reproduced.",
    ]
  ),
  "^FV": raster("Field Variable", "text", "field"),
  "^FL": job("Font Linking", "text", "session"),
  "^FM": raster("Multiple Field Origin Locations", "format", "field"),
  "^FW": raster("Field Orientation", "format", "session"),
  "^FX": job("Comment", "format", "field"),
  "^GB": raster("Graphic Box", "graphic", "field"),
  "^GC": raster("Graphic Circle", "graphic", "field"),
  "^GD": raster("Graphic Diagonal Line", "graphic", "field"),
  "^GE": raster("Graphic Ellipse", "graphic", "field"),
  "^GF": partial(
    "Graphic Field",
    "graphic",
    "field",
    ["Zebra compressed-binary (C) payloads are diagnosed but not decoded."]
  ),
  "^GS": raster("Graphic Symbol", "graphic", "field"),
  "^ID": job("Object Delete", "storage", "session"),
  "^IL": raster("Image Load", "graphic", "field"),
  "^KL": partial(
    "Define Language",
    "text",
    "session",
    [
      "Localized weekday and month names use host Intl locale data and can vary by runtime and printer firmware.",
    ],
    "job"
  ),
  "^IM": raster("Image Move", "graphic", "field"),
  "^IS": job("Image Save", "storage", "session"),
  "^JM": {
    name: "Set Dots per Millimeter",
    category: "format",
    effect: "job",
    scope: "session",
    status: "unsupported",
    limitations: [
      "Changing printhead resolution inside a ZPL job is not modeled; select printDensity in the render options.",
    ],
  },
  "^LH": raster("Label Home", "format", "session"),
  "^LL": raster("Label Length", "format", "session"),
  "^LR": raster("Label Reverse Print", "format", "session"),
  "^LS": raster("Label Shift", "format", "session"),
  "^LT": raster("Label Top", "format", "session"),
  "^MC": raster("Map Clear", "format", "session"),
  "^ML": raster("Maximum Label Length", "format", "session"),
  "^MN": raster("Media Tracking", "format", "session"),
  "^MU": raster("Set Units of Measurement", "format", "session"),
  "^PM": raster("Printing Mirror Image", "format", "format"),
  "^PA": partial(
    "Advanced Text Properties",
    "text",
    "session",
    [
      "Bidirectional ordering and Arabic shaping use a deterministic subset rather than a full Unicode/OpenType layout engine; the default-glyph switch is not modeled.",
    ]
  ),
  "^PO": raster("Print Orientation", "format", "session"),
  "^PQ": job("Print Quantity", "format", "format"),
  "^PW": raster("Print Width", "format", "session"),
  "^SE": raster("Select Encoding Table", "text", "session"),
  "^SF": partial(
    "Serialization Field",
    "text",
    "field",
    [
      "Serialization is Unicode-code-point based; newer printer-firmware combining-cluster and control/bidirectional-character behavior is not modeled.",
    ]
  ),
  "^SL": partial(
    "Set Mode and Language",
    "text",
    "session",
    [
      "Localized weekday and month names use host Intl locale data and can vary by runtime and printer firmware.",
    ]
  ),
  "^SN": raster("Serialization Data", "text", "field"),
  "^SO": raster("Set Offset", "text", "session"),
  "^ST": job("Set Date and Time", "text", "session"),
  "^SZ": {
    name: "Set ZPL Version",
    category: "format",
    effect: "job",
    scope: "session",
    status: "unsupported",
    limitations: ["ZPL mode 1 compatibility semantics are not modeled."],
  },
  "^TB": partial(
    "Text Blocks",
    "text",
    "field",
    [
      "Rotation, bounds, wrapping, truncation, and literal << escapes are modeled; other firmware complex-layout escape instructions are skipped.",
    ]
  ),
  "^TO": job("Transfer Object", "storage", "session"),
  "^XA": job("Start Format", "format", "format"),
  "^XF": job("Recall Format", "storage", "field"),
  "^XG": raster("Recall Graphic", "graphic", "field"),
  "^XZ": job("End Format", "format", "format"),
};

const zplCommands = words(`
^A ^A@ ^B0 ^B1 ^B2 ^B3 ^B4 ^B5 ^B7 ^B8 ^B9 ^BA ^BB ^BC ^BD ^BE ^BF ^BI ^BJ
^BK ^BL ^BM ^BO ^BP ^BQ ^BR ^BS ^BT ^BU ^BX ^BY ^BZ ^CC ~CC ^CD ~CD ^CF ^CI
^CM ^CN ^CO ^CP ^CT ~CT ^CV ^CW ~DB ~DE ^DF ~DG ~DN ~DS ~DT ~DU ~DY ~EG ^FB
^FC ^FD ^FE ^FH ^FL ^FM ^FN ^FO ^FP ^FR ^FS ^FT ^FV ^FW ^FX ^GB ^GC ^GD ^GE
^GF ^GS ~HB ~HD ^HF ^HG ^HH ~HI ~HM ~HQ ~HS ^HT ~HU ^HV ^HW ^HY ^HZ ^ID ^IL
^IM ^IS ~JA ^JB ~JB ~JC ~JD ~JE ~JF ~JG ^JH ^JI ~JI ^JJ ~JL ^JM ~JN ~JO ~JP
~JQ ~JR ^JS ~JS ^JT ^JU ^JW ~JX ^JZ ~KB ^KD ^KL ^KN ^KP ^KV ^LF ^LH ^LL ^LR
^LS ^LT ^MA ^MC ^MD ^MF ^MI ^ML ^MM ^MN ^MP ^MT ^MU ^MW ^PA ^PF ^PH ~PH ~PL
^PM ~PM ^PN ^PO ^PP ~PP ^PQ ~PR ^PR ~PS ^PW ~RO ^SC ~SD ^SE ^SF ^SI ^SL ^SN
^SO ^SP ^SQ ^SR ^SS ^ST ^SX ^SZ ~TA ^TB ^TO ~WC ^WD ~WQ ^XA ^XB ^XF ^XG ^XS
^XZ ^ZZ
`);

const networkCommands = words(`
^KC ^NB ^NC ~NC ^ND ^NI ^NN ^NP ~NR ^NS ^NT ~NT ^NW ^WA ^WE ^WL ~WL ^WP ^WR
~WR ^WS ^WX
`);

const rfidCommands = words(`^HL ~HL ^HR ^RB ^RF ^RL ^RS ^RU ^RW`);

const knownNames: Readonly<Record<string, string>> = {
  "^B0": "Aztec Bar Code",
  "^B1": "Code 11 Bar Code",
  "^B2": "Interleaved 2 of 5 Bar Code",
  "^B4": "Code 49 Bar Code",
  "^B5": "Planet Code Bar Code",
  "^BA": "Code 93 Bar Code",
  "^BB": "CODABLOCK Bar Code",
  "^BD": "UPS MaxiCode Bar Code",
  "^BF": "MicroPDF417 Bar Code",
  "^BI": "Industrial 2 of 5 Bar Code",
  "^BJ": "Standard 2 of 5 Bar Code",
  "^BK": "ANSI Codabar Bar Code",
  "^BL": "LOGMARS Bar Code",
  "^BM": "MSI Bar Code",
  "^BO": "Aztec Bar Code",
  "^BP": "Plessey Bar Code",
  "^BR": "GS1 DataBar Bar Code",
  "^BS": "UPC/EAN Extension Bar Code",
  "^BT": "TLC39 Bar Code",
  "^BZ": "Postal Bar Code",
  "^CM": "Change Memory Letter Designation",
  "~DB": "Download Bitmap Font",
  "~DE": "Download Encoding",
  "~DS": "Download Intellifont",
  "~DT": "Download Bounded TrueType Font",
  "~DU": "Download Unbounded TrueType Font",
  "~DY": "Download Object",
  "~EG": "Erase Download Graphics",
  "^FC": "Field Clock",
  "^FE": "Field End",
  "^FL": "Font Linking",
  "^FM": "Multiple Field Origin Locations",
  "^FP": "Field Parameter",
  "^GS": "Graphic Symbol",
  "^IL": "Image Load",
  "^IM": "Image Move",
  "^IS": "Image Save",
  "^MC": "Map Clear",
  "^ML": "Maximum Label Length",
  "^MU": "Set Units of Measurement",
  "^PA": "Advanced Text Properties",
  "^SE": "Select Encoding Table",
  "^SF": "Serialization Field",
  "^SN": "Serialization Data",
  "^TB": "Text Blocks",
  "^TO": "Transfer Object",
  "^SZ": "Set ZPL Version",
  "^MD": "Media Darkness",
  "^MM": "Print Mode",
  "^MN": "Media Tracking",
  "^MT": "Media Type",
  "^PQ": "Print Quantity",
  "^PR": "Print Rate",
  "~JA": "Cancel All",
  "~JC": "Set Media Sensor Calibration",
  "~TA": "Tear-Off Adjust",
};

// Commands in these sets can change label dots or resources needed to produce
// them. They must remain unsupported (and diagnostic-producing) until their
// behavior is implemented; classifying them as non-rendering would be silent
// semantic loss. All remaining printer commands are device/status operations.
const unsupportedTextCommands = new Set(words(``));
const unsupportedGraphicCommands = new Set(words(``));
const unsupportedFormatCommands = new Set(words(``));
const unsupportedStorageCommands = new Set(
  words(``)
);

function words(value: string): string[] {
  const normalized = value.trim();
  return normalized ? normalized.split(/\s+/) : [];
}

function raster(
  name: string,
  category: CommandCategory,
  scope: CommandPersistenceScope
): CapabilitySeed {
  return { name, category, effect: "raster", scope, status: "supported" };
}

function job(
  name: string,
  category: CommandCategory,
  scope: CommandPersistenceScope
): CapabilitySeed {
  return { name, category, effect: "job", scope, status: "supported" };
}

function partial(
  name: string,
  category: CommandCategory,
  scope: CommandPersistenceScope,
  limitations: readonly string[],
  effect: CommandEffect = "raster"
): CapabilitySeed {
  return { name, category, effect, scope, status: "partial", limitations };
}

function canonicalCapability(
  canonical: string,
  seed: CapabilitySeed
): CommandCapability {
  return {
    canonical,
    prefix: canonical[0] as "^" | "~",
    code: canonical.slice(1),
    reference: REFERENCE,
    ...seed,
  };
}

function defaultCapability(
  canonical: string,
  category: CommandCategory,
  status: "non-rendering" | "unsupported",
  scope: CommandPersistenceScope = "session"
): CommandCapability {
  const device = status === "non-rendering";
  return canonicalCapability(canonical, {
    name: knownNames[canonical] ?? `Recognized ZPL command ${canonical}`,
    category,
    effect: device ? "device" : "raster",
    scope,
    status,
    limitations: device
      ? ["Recognized by the renderer but has no label-raster effect."]
      : ["Recognized by the modern profile but not rendered by this release."],
  });
}

const allCanonical = new Set([...zplCommands, ...networkCommands, ...rfidCommands]);

export const commandCapabilities: readonly CommandCapability[] = [
  ...allCanonical,
].map((canonical) => {
  const seed = capabilitySeeds[canonical];
  if (seed) return canonicalCapability(canonical, seed);
  if (networkCommands.includes(canonical)) {
    return defaultCapability(canonical, "network", "non-rendering");
  }
  if (rfidCommands.includes(canonical)) {
    return defaultCapability(canonical, "rfid", "non-rendering");
  }
  if (canonical.startsWith("^B")) {
    return defaultCapability(canonical, "barcode", "unsupported", "field");
  }
  if (unsupportedTextCommands.has(canonical)) {
    return defaultCapability(canonical, "text", "unsupported", "field");
  }
  if (unsupportedGraphicCommands.has(canonical)) {
    return defaultCapability(canonical, "graphic", "unsupported", "field");
  }
  if (unsupportedFormatCommands.has(canonical)) {
    return defaultCapability(canonical, "format", "unsupported", "format");
  }
  if (unsupportedStorageCommands.has(canonical)) {
    const capability = defaultCapability(
      canonical,
      "storage",
      "unsupported",
      "session"
    );
    return { ...capability, effect: "job" };
  }
  return defaultCapability(canonical, "printer", "non-rendering");
});

const capabilityMap = new Map(
  commandCapabilities.map((capability) => [capability.canonical, capability])
);

/** Look up a canonical command identity such as ^FO or ~DG. */
export function getCommandCapability(
  command: string
): CommandCapability | undefined {
  const normalized = command.trim().toUpperCase();
  if (!normalized.startsWith("^") && !normalized.startsWith("~")) return undefined;
  return capabilityMap.get(normalized);
}

export function getCommandCapabilityStatus(
  command: string
): CommandCapabilityStatus {
  return getCommandCapability(command)?.status ?? "unknown";
}

export function getCommandEffect(command: string): CommandEffect | undefined {
  return getCommandCapability(command)?.effect;
}
