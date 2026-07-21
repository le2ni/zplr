const CODE39_CHARACTERS = [
  "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J",
  "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T",
  "U", "V", "W", "X", "Y", "Z", "-", ".", " ", "$",
  "/", "+", "%", "*",
] as const;

const CODE39_ENCODINGS = [
  20957, 29783, 23639, 30485, 20951, 29813, 23669, 20855, 29789, 23645,
  29975, 23831, 30533, 22295, 30149, 24005, 21623, 29981, 23837, 22301,
  30023, 23879, 30545, 22343, 30161, 24017, 21959, 30065, 23921, 22385,
  29015, 18263, 29141, 17879, 29045, 18293, 17783, 29021, 18269, 17477,
  17489, 17681, 20753, 35770,
] as const;

const CODE128_ENCODINGS = [
  11011001100, 11001101100, 11001100110, 10010011000, 10010001100,
  10001001100, 10011001000, 10011000100, 10001100100, 11001001000,
  11001000100, 11000100100, 10110011100, 10011011100, 10011001110,
  10111011000, 10011101100, 10011100110, 11001110010, 11001011100,
  11001001110, 11011100100, 11001110100, 11101101110, 11101001100,
  11100101100, 11100100110, 11101100100, 11100110100, 11100110010,
  11011011000, 11011000110, 11000110110, 10100011000, 10001011000,
  10001000110, 10110001000, 10001101000, 10001100010, 11010001000,
  11000101000, 11000100010, 10110111000, 10110001110, 10001101110,
  10111011000, 10111000110, 10001110110, 11101110110, 11010001110,
  11000101110, 11011101000, 11011100010, 11011101110, 11101011000,
  11101000110, 11100010110, 11101101000, 11101100010, 11100011010,
  11101111010, 11001000010, 11110001010, 10100110000, 10100001100,
  10010110000, 10010000110, 10000101100, 10000100110, 10110010000,
  10110000100, 10011010000, 10011000010, 10000110100, 10000110010,
  11000010010, 11001010000, 11110111010, 11000010100, 10001111010,
  10100111100, 10010111100, 10010011110, 10111100100, 10011110100,
  10011110010, 11110100100, 11110010100, 11110010010, 11011011110,
  11011110110, 11110110110, 10101111000, 10100011110, 10001011110,
  10111101000, 10111100010, 11110101000, 11110100010, 10111011110,
  10111101110, 11101011110, 11110101110, 11010000100, 11010010000,
  11010011100, 1100011101011,
] as const;

export function code39CheckDigit(data: string): string {
  const sum = [...data].reduce(
    (total, character) => total + CODE39_CHARACTERS.indexOf(character as never),
    0
  );
  return CODE39_CHARACTERS[sum % 43];
}

function code39Bits(character: string): string {
  const index = CODE39_CHARACTERS.indexOf(character as never);
  return index < 0 ? "" : CODE39_ENCODINGS[index].toString(2);
}

export function code39Runs(
  data: string
): Array<{ black: boolean; units: number }> {
  const bits =
    code39Bits("*") +
    [...data].map((character) => `${code39Bits(character)}0`).join("") +
    code39Bits("*");
  const runs: Array<{ black: boolean; units: number }> = [];
  let current = bits[0];
  let length = 0;
  for (const bit of bits) {
    if (bit === current) {
      length++;
    } else {
      runs.push({ black: current === "1", units: length });
      current = bit;
      length = 1;
    }
  }
  if (length > 0) runs.push({ black: current === "1", units: length });
  return runs;
}

function mod10CheckDigit(data: string): string {
  if (!/^\d+$/.test(data)) {
    throw new Error("A Code 128 UCC check digit requires numeric field data.");
  }
  let sum = 0;
  let weight = 3;
  for (let index = data.length - 1; index >= 0; index--) {
    sum += Number(data[index]) * weight;
    weight = weight === 3 ? 1 : 3;
  }
  return String((10 - (sum % 10)) % 10);
}

type Code128Set = "A" | "B" | "C";

function code128DisplayValue(value: number, set: Code128Set): string {
  if (set === "C") return String(value).padStart(2, "0");
  if (set === "A") {
    return String.fromCharCode(value < 64 ? value + 32 : value - 64);
  }
  return String.fromCharCode(value + 32);
}

function code128Value(character: string, set: Exclude<Code128Set, "C">): number {
  const codePoint = character.charCodeAt(0);
  if (set === "A") {
    if (codePoint < 0 || codePoint > 95) {
      throw new Error("Code 128 subset A field data contains an invalid character.");
    }
    return codePoint < 32 ? codePoint + 64 : codePoint - 32;
  }
  if (codePoint < 32 || codePoint > 127) {
    throw new Error("Code 128 subset B field data contains an invalid character.");
  }
  return codePoint - 32;
}

function encodeCode128NoSelectedMode(data: string): {
  values: number[];
  display: string;
} {
  if (data.length === 0) throw new Error("Code 128 field data is empty.");

  let sourceIndex = 0;
  let set: Code128Set = "B";
  let start = 104;
  const startCode = data.slice(0, 2);
  if (startCode === ">9" || startCode === ">:" || startCode === ">;") {
    set = startCode === ">9" ? "A" : startCode === ">:" ? "B" : "C";
    start = set === "A" ? 103 : set === "B" ? 104 : 105;
    sourceIndex = 2;
  }

  const values: number[] = [];
  let display = "";
  let shift = false;
  const appendDirectValue = (value: number) => {
    values.push(value);
    display += code128DisplayValue(value, set);
  };

  while (sourceIndex < data.length) {
    if (data[sourceIndex] === ">") {
      const invocation = data[sourceIndex + 1];
      if (invocation === undefined) {
        throw new Error("A Code 128 invocation marker is incomplete.");
      }
      sourceIndex += 2;
      if (invocation === "<") {
        if (set === "C") {
          throw new Error("A literal > cannot be encoded while Code 128 subset C is active.");
        }
        values.push(code128Value(">", set));
        display += ">";
      } else if (invocation === "0") {
        appendDirectValue(30);
      } else if (invocation === "=") {
        appendDirectValue(94);
      } else if (invocation === "1") {
        appendDirectValue(95);
      } else if (invocation === "2") {
        values.push(96);
      } else if (invocation === "3") {
        values.push(97);
      } else if (invocation === "4") {
        if (set === "C") {
          throw new Error("Code 128 SHIFT is invalid in subset C.");
        }
        values.push(98);
        shift = true;
      } else if (invocation === "5") {
        values.push(99);
        set = "C";
      } else if (invocation === "6") {
        values.push(100);
        set = "B";
      } else if (invocation === "7") {
        values.push(101);
        set = "A";
      } else if (invocation === "8") {
        values.push(102);
      } else {
        throw new Error(`Unsupported Code 128 invocation code >${invocation}.`);
      }
      continue;
    }

    if (set === "C") {
      const pair = data.slice(sourceIndex, sourceIndex + 2);
      if (!/^\d{2}$/.test(pair)) {
        throw new Error("Code 128 subset C requires pairs of numeric digits.");
      }
      values.push(Number(pair));
      display += pair;
      sourceIndex += 2;
      continue;
    }

    const character = data[sourceIndex++];
    const activeSet: "A" | "B" = shift ? (set === "A" ? "B" : "A") : set;
    values.push(code128Value(character, activeSet));
    display += character;
    shift = false;
  }
  if (shift) throw new Error("Code 128 SHIFT requires a following character.");

  const checksum =
    (start + values.reduce((sum, value, index) => sum + value * (index + 1), 0)) %
    103;
  return { values: [start, ...values, checksum, 106], display };
}

function normalizeCode128LiteralGreater(data: string): string | undefined {
  let normalized = "";
  for (let index = 0; index < data.length; index++) {
    if (data[index] !== ">") {
      normalized += data[index];
      continue;
    }
    if (data[index + 1] !== "<") return undefined;
    normalized += ">";
    index++;
  }
  return normalized;
}

function digitRunLength(data: string, from: number): number {
  let length = 0;
  while (/^\d$/.test(data[from + length] ?? "")) length++;
  return length;
}

function preferredCode128Set(character: string): "A" | "B" {
  const codePoint = character.charCodeAt(0);
  if (codePoint < 32) return "A";
  if (codePoint <= 127) return "B";
  throw new Error("Code 128 automatic mode supports ASCII field data only.");
}

function encodeCode128AutomaticMode(data: string): {
  values: number[];
  display: string;
} {
  if (data.length === 0) throw new Error("Code 128 field data is empty.");
  const initialDigits = digitRunLength(data, 0);
  let set: Code128Set =
    initialDigits >= 4 && initialDigits % 2 === 0
      ? "C"
      : preferredCode128Set(data[0]);
  const start = set === "A" ? 103 : set === "B" ? 104 : 105;
  const dataValues: number[] = [];
  let index = 0;

  while (index < data.length) {
    const digits = digitRunLength(data, index);
    if (set !== "C" && digits >= 4) {
      if (digits % 2 === 1) {
        dataValues.push(code128Value(data[index], set));
        index++;
      }
      dataValues.push(99);
      set = "C";
      continue;
    }

    if (set === "C") {
      if (digits >= 2) {
        dataValues.push(Number(data.slice(index, index + 2)));
        index += 2;
        continue;
      }
      const nextSet = preferredCode128Set(data[index]);
      dataValues.push(nextSet === "A" ? 101 : 100);
      set = nextSet;
      continue;
    }

    const character = data[index];
    const codePoint = character.charCodeAt(0);
    if ((set === "A" && codePoint > 95) || (set === "B" && codePoint < 32)) {
      const nextSet = set === "A" ? "B" : "A";
      dataValues.push(nextSet === "A" ? 101 : 100);
      set = nextSet;
      continue;
    }
    dataValues.push(code128Value(character, set));
    index++;
  }

  const checksum =
    (start +
      dataValues.reduce(
        (sum, value, valueIndex) => sum + value * (valueIndex + 1),
        0
      )) %
    103;
  return {
    values: [start, ...dataValues, checksum, 106],
    display: data,
  };
}

export function encodeCode128Raster(
  data: string,
  mode: "N" | "A",
  uccCheckDigit = false
): { bits: string; display: string } {
  const encodedData = uccCheckDigit ? data + mod10CheckDigit(data) : data;
  let encoded: { values: number[]; display: string };
  if (mode === "N") {
    encoded = encodeCode128NoSelectedMode(encodedData);
  } else {
    const normalized = normalizeCode128LiteralGreater(encodedData);
    encoded =
      normalized === undefined
        ? encodeCode128NoSelectedMode(encodedData)
        : encodeCode128AutomaticMode(normalized);
  }
  return {
    bits: encoded.values
      .map((value) => CODE128_ENCODINGS[value]?.toString() ?? "")
      .join(""),
    display: encoded.display,
  };
}
