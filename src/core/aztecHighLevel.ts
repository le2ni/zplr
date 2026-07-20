/*
 * Aztec high-level text compaction.
 *
 * The state-machine structure is derived from ZXing's Apache-2.0 licensed
 * Aztec HighLevelEncoder.  This local form adds ISO/IEC 24778 FLG(n) tokens,
 * which are required for Zebra's ECIC input protocol and are not exposed by
 * ZXing's byte-only public encoder.
 */

export type AztecHighLevelToken =
  | Readonly<{ kind: "byte"; value: number }>
  | Readonly<{ kind: "flag"; digits: string }>;

const MODE_UPPER = 0;
const MODE_LOWER = 1;
const MODE_DIGIT = 2;
const MODE_MIXED = 3;
const MODE_PUNCT = 4;

const LATCH_TABLE = [
  Int32Array.from([
    0,
    (5 << 16) + 28,
    (5 << 16) + 30,
    (5 << 16) + 29,
    (10 << 16) + (29 << 5) + 30,
  ]),
  Int32Array.from([
    (9 << 16) + (30 << 4) + 14,
    0,
    (5 << 16) + 30,
    (5 << 16) + 29,
    (10 << 16) + (29 << 5) + 30,
  ]),
  Int32Array.from([
    (4 << 16) + 14,
    (9 << 16) + (14 << 5) + 28,
    0,
    (9 << 16) + (14 << 5) + 29,
    (14 << 16) + (14 << 10) + (29 << 5) + 30,
  ]),
  Int32Array.from([
    (5 << 16) + 29,
    (5 << 16) + 28,
    (10 << 16) + (29 << 5) + 30,
    0,
    (5 << 16) + 30,
  ]),
  Int32Array.from([
    (5 << 16) + 31,
    (10 << 16) + (31 << 5) + 28,
    (10 << 16) + (31 << 5) + 30,
    (10 << 16) + (31 << 5) + 29,
    0,
  ]),
] as const;

const SHIFT_TABLE = Array.from({ length: 5 }, () => {
  const row = new Int32Array(5);
  row.fill(-1);
  return row;
});
SHIFT_TABLE[MODE_UPPER][MODE_PUNCT] = 0;
SHIFT_TABLE[MODE_LOWER][MODE_PUNCT] = 0;
SHIFT_TABLE[MODE_LOWER][MODE_UPPER] = 28;
SHIFT_TABLE[MODE_MIXED][MODE_PUNCT] = 0;
SHIFT_TABLE[MODE_DIGIT][MODE_PUNCT] = 0;
SHIFT_TABLE[MODE_DIGIT][MODE_UPPER] = 15;

const CHAR_MAP = Array.from({ length: 5 }, () => new Int32Array(256));
CHAR_MAP[MODE_UPPER][32] = 1;
for (let value = 65; value <= 90; value++) {
  CHAR_MAP[MODE_UPPER][value] = value - 63;
}
CHAR_MAP[MODE_LOWER][32] = 1;
for (let value = 97; value <= 122; value++) {
  CHAR_MAP[MODE_LOWER][value] = value - 95;
}
CHAR_MAP[MODE_DIGIT][32] = 1;
for (let value = 48; value <= 57; value++) {
  CHAR_MAP[MODE_DIGIT][value] = value - 46;
}
CHAR_MAP[MODE_DIGIT][44] = 12;
CHAR_MAP[MODE_DIGIT][46] = 13;

const MIXED_TABLE = [
  0,
  32,
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  12,
  13,
  27,
  28,
  29,
  30,
  31,
  64,
  92,
  94,
  95,
  96,
  124,
  126,
  127,
] as const;
MIXED_TABLE.forEach((value, index) => {
  CHAR_MAP[MODE_MIXED][value] = index;
});

const PUNCT_TABLE = [
  0,
  13,
  0,
  0,
  0,
  0,
  33,
  39,
  35,
  36,
  37,
  38,
  39,
  40,
  41,
  42,
  43,
  44,
  45,
  46,
  47,
  58,
  59,
  60,
  61,
  62,
  63,
  91,
  93,
  123,
  125,
] as const;
PUNCT_TABLE.forEach((value, index) => {
  if (value !== 0) CHAR_MAP[MODE_PUNCT][value] = index;
});

function appendValueBits(output: string[], value: number, bitCount: number): void {
  let bits = "";
  for (let shift = bitCount - 1; shift >= 0; shift--) {
    bits += (value & (1 << shift)) === 0 ? "0" : "1";
  }
  output.push(bits);
}

interface EncodingToken {
  readonly previous?: EncodingToken;
  appendTo(output: string[], source: Uint8Array): void;
}

class SimpleToken implements EncodingToken {
  constructor(
    readonly previous: EncodingToken | undefined,
    private readonly value: number,
    private readonly bitCount: number
  ) {}

  appendTo(output: string[]): void {
    appendValueBits(output, this.value, this.bitCount);
  }
}

class BinaryShiftToken implements EncodingToken {
  constructor(
    readonly previous: EncodingToken | undefined,
    private readonly start: number,
    private readonly byteCount: number
  ) {}

  appendTo(output: string[], source: Uint8Array): void {
    for (let offset = 0; offset < this.byteCount; offset++) {
      if (offset === 0 || (offset === 31 && this.byteCount <= 62)) {
        appendValueBits(output, 31, 5);
        if (this.byteCount > 62) {
          appendValueBits(output, this.byteCount - 31, 16);
        } else if (offset === 0) {
          appendValueBits(output, Math.min(this.byteCount, 31), 5);
        } else {
          appendValueBits(output, this.byteCount - 31, 5);
        }
      }
      appendValueBits(output, source[this.start + offset], 8);
    }
  }
}

const EMPTY_TOKEN: EncodingToken = new SimpleToken(undefined, 0, 0);

class State {
  static readonly INITIAL = new State(EMPTY_TOKEN, MODE_UPPER, 0, 0);

  constructor(
    private readonly token: EncodingToken,
    readonly mode: number,
    readonly binaryShiftByteCount: number,
    readonly bitCount: number
  ) {}

  private withSimpleBits(value: number, bitCount: number, mode = this.mode): State {
    return new State(
      new SimpleToken(this.token, value, bitCount),
      mode,
      0,
      this.bitCount + bitCount
    );
  }

  latchAndAppend(mode: number, value: number): State {
    let token = this.token;
    let bitCount = this.bitCount;
    if (mode !== this.mode) {
      const latch = LATCH_TABLE[this.mode][mode];
      const latchBits = latch >>> 16;
      token = new SimpleToken(token, latch & 0xffff, latchBits);
      bitCount += latchBits;
    }
    const valueBits = mode === MODE_DIGIT ? 4 : 5;
    return new State(
      new SimpleToken(token, value, valueBits),
      mode,
      0,
      bitCount + valueBits
    );
  }

  shiftAndAppend(mode: number, value: number): State {
    const shiftBits = this.mode === MODE_DIGIT ? 4 : 5;
    const shifted = new SimpleToken(
      new SimpleToken(this.token, SHIFT_TABLE[this.mode][mode], shiftBits),
      value,
      5
    );
    return new State(shifted, this.mode, 0, this.bitCount + shiftBits + 5);
  }

  appendFlagDigits(digits: string): State {
    let state = this.withSimpleBits(digits.length, 3);
    for (const digit of digits) {
      state = state.withSimpleBits(Number(digit) + 2, 4);
    }
    return state;
  }

  addBinaryShiftChar(index: number): State {
    let token = this.token;
    let mode = this.mode;
    let bitCount = this.bitCount;
    if (mode === MODE_PUNCT || mode === MODE_DIGIT) {
      const latch = LATCH_TABLE[mode][MODE_UPPER];
      const latchBits = latch >>> 16;
      token = new SimpleToken(token, latch & 0xffff, latchBits);
      bitCount += latchBits;
      mode = MODE_UPPER;
    }
    const delta =
      this.binaryShiftByteCount === 0 || this.binaryShiftByteCount === 31
        ? 18
        : this.binaryShiftByteCount === 62
        ? 9
        : 8;
    let state = new State(
      token,
      mode,
      this.binaryShiftByteCount + 1,
      bitCount + delta
    );
    if (state.binaryShiftByteCount === 2078) state = state.endBinaryShift(index + 1);
    return state;
  }

  endBinaryShift(index: number): State {
    if (this.binaryShiftByteCount === 0) return this;
    return new State(
      new BinaryShiftToken(
        this.token,
        index - this.binaryShiftByteCount,
        this.binaryShiftByteCount
      ),
      this.mode,
      0,
      this.bitCount
    );
  }

  isBetterThanOrEqualTo(other: State): boolean {
    let candidate =
      this.bitCount + (LATCH_TABLE[this.mode][other.mode] >>> 16);
    if (this.binaryShiftByteCount < other.binaryShiftByteCount) {
      candidate += binaryShiftCost(other) - binaryShiftCost(this);
    } else if (
      this.binaryShiftByteCount > other.binaryShiftByteCount &&
      other.binaryShiftByteCount > 0
    ) {
      candidate += 10;
    }
    return candidate <= other.bitCount;
  }

  toBitString(source: Uint8Array): string {
    const symbols: EncodingToken[] = [];
    for (
      let token: EncodingToken | undefined = this.endBinaryShift(source.length).token;
      token;
      token = token.previous
    ) {
      symbols.unshift(token);
    }
    const output: string[] = [];
    for (const token of symbols) token.appendTo(output, source);
    return output.join("");
  }
}

function binaryShiftCost(state: State): number {
  if (state.binaryShiftByteCount > 62) return 21;
  if (state.binaryShiftByteCount > 31) return 20;
  return state.binaryShiftByteCount > 0 ? 10 : 0;
}

function simplifyStates(states: readonly State[]): State[] {
  let result: State[] = [];
  for (const candidate of states) {
    let add = true;
    for (const existing of [...result]) {
      if (existing.isBetterThanOrEqualTo(candidate)) {
        add = false;
        break;
      }
      if (candidate.isBetterThanOrEqualTo(existing)) {
        result = result.filter((state) => state !== existing);
      }
    }
    if (add) result.push(candidate);
  }
  return result;
}

function statesForByte(
  states: readonly State[],
  source: Uint8Array,
  index: number
): State[] {
  const result: State[] = [];
  const character = source[index] & 0xff;
  for (const state of states) {
    const inCurrentMode = CHAR_MAP[state.mode][character] > 0;
    let withoutBinary: State | undefined;
    for (let mode = MODE_UPPER; mode <= MODE_PUNCT; mode++) {
      const value = CHAR_MAP[mode][character];
      if (value <= 0) continue;
      withoutBinary ??= state.endBinaryShift(index);
      if (!inCurrentMode || mode === state.mode || mode === MODE_DIGIT) {
        result.push(withoutBinary.latchAndAppend(mode, value));
      }
      if (!inCurrentMode && SHIFT_TABLE[state.mode][mode] >= 0) {
        result.push(withoutBinary.shiftAndAppend(mode, value));
      }
    }
    if (state.binaryShiftByteCount > 0 || !inCurrentMode) {
      result.push(state.addBinaryShiftChar(index));
    }
  }
  return simplifyStates(result);
}

function statesForPair(
  states: readonly State[],
  index: number,
  pairCode: number
): State[] {
  const result: State[] = [];
  for (const state of states) {
    const withoutBinary = state.endBinaryShift(index);
    result.push(withoutBinary.latchAndAppend(MODE_PUNCT, pairCode));
    if (state.mode !== MODE_PUNCT) {
      result.push(withoutBinary.shiftAndAppend(MODE_PUNCT, pairCode));
    }
    if (pairCode === 3 || pairCode === 4) {
      result.push(
        withoutBinary
          .latchAndAppend(MODE_DIGIT, 16 - pairCode)
          .latchAndAppend(MODE_DIGIT, 1)
      );
    }
    if (state.binaryShiftByteCount > 0) {
      result.push(state.addBinaryShiftChar(index).addBinaryShiftChar(index + 1));
    }
  }
  return simplifyStates(result);
}

function statesForFlag(
  states: readonly State[],
  index: number,
  digits: string
): State[] {
  const result: State[] = [];
  for (const state of states) {
    const withoutBinary = state.endBinaryShift(index);
    if (state.mode === MODE_PUNCT) {
      result.push(withoutBinary.latchAndAppend(MODE_PUNCT, 0).appendFlagDigits(digits));
    } else {
      result.push(withoutBinary.shiftAndAppend(MODE_PUNCT, 0).appendFlagDigits(digits));
      result.push(withoutBinary.latchAndAppend(MODE_PUNCT, 0).appendFlagDigits(digits));
    }
  }
  return simplifyStates(result);
}

/** Encodes byte and FLG(n) tokens into the source-message bit stream. */
export function encodeAztecHighLevel(tokens: readonly AztecHighLevelToken[]): string {
  const source = Uint8Array.from(
    tokens.map((token) => (token.kind === "byte" ? token.value : 0))
  );
  let states: State[] = [State.INITIAL];
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    if (token.kind === "flag") {
      if (!/^\d{0,6}$/.test(token.digits)) {
        throw new Error("Aztec FLG(n) must contain zero through six decimal digits.");
      }
      states = statesForFlag(states, index, token.digits);
      continue;
    }
    const next = tokens[index + 1];
    const nextByte = next?.kind === "byte" ? next.value : -1;
    const pairCode =
      token.value === 13 && nextByte === 10
        ? 2
        : token.value === 46 && nextByte === 32
        ? 3
        : token.value === 44 && nextByte === 32
        ? 4
        : token.value === 58 && nextByte === 32
        ? 5
        : 0;
    if (pairCode > 0) {
      states = statesForPair(states, index, pairCode);
      index++;
    } else {
      states = statesForByte(states, source, index);
    }
  }
  const best = states.reduce((left, right) =>
    left.bitCount <= right.bitCount ? left : right
  );
  return best.toBitString(source);
}

/** Parses Zebra's ESC+n ECIC convention into Aztec high-level tokens. */
export function parseZplAztecTokens(
  bytes: Uint8Array,
  ecic: boolean
): AztecHighLevelToken[] {
  if (!ecic) return [...bytes].map((value) => ({ kind: "byte", value }));
  const tokens: AztecHighLevelToken[] = [];
  for (let index = 0; index < bytes.length; index++) {
    const value = bytes[index];
    if (value !== 0x1b) {
      tokens.push({ kind: "byte", value });
      continue;
    }
    const flag = bytes[index + 1];
    if (flag === 0x1b) {
      tokens.push({ kind: "byte", value: 0x1b });
      index++;
      continue;
    }
    if (flag < 0x30 || flag > 0x36) {
      throw new Error(
        "Aztec ECIC escape must be followed by ESC or a digit from 0 through 6."
      );
    }
    const count = flag - 0x30;
    const end = index + 2 + count;
    if (end > bytes.length) throw new Error("Aztec ECIC escape is truncated.");
    const digits = String.fromCharCode(...bytes.slice(index + 2, end));
    if (!/^\d*$/.test(digits)) {
      throw new Error("Aztec ECIC escape contains a non-decimal ECI digit.");
    }
    tokens.push({ kind: "flag", digits });
    index = end - 1;
  }
  return tokens;
}

