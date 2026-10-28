import type { ZplCommandNode } from "@/types/ZplDocument";
import { isSerializationControl, textClusters } from "./textClusters";

export const SERIALIZATION_STEP: unique symbol = Symbol("serialization-step");
export type SerializationCommand = ZplCommandNode & { [SERIALIZATION_STEP]?: number };

function serializationAlphabet(mask: string): string | undefined {
  if (mask === "D") return "0123456789";
  if (mask === "d") return "0123456789";
  if (mask === "H") return "0123456789ABCDEF";
  if (mask === "h") return "0123456789abcdef";
  if (mask === "O") return "01234567";
  if (mask === "o") return "01234567";
  if (mask === "A") return "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  if (mask === "a") return "abcdefghijklmnopqrstuvwxyz";
  if (mask === "N") return "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  if (mask === "n") return "0123456789abcdefghijklmnopqrstuvwxyz";
  return undefined;
}

export function serializeMasked(
  value: string,
  mask: string,
  increment: string,
  step: number
): string {
  const characters = textClusters(value).map(({ character }) => character);
  const serializable = characters.flatMap((character, index) =>
    isSerializationControl(character) ? [] : [index]
  );
  const masks = [...mask];
  const increments = textClusters(increment)
    .map(({ character }) => character)
    .filter((character) => !isSerializationControl(character));
  const start = serializable.length - masks.length;
  const positions: Array<{
    characterIndex: number;
    maskIndex: number;
    alphabet: string;
  }> = [];
  for (let maskIndex = 0; maskIndex < masks.length; maskIndex++) {
    const alphabet = serializationAlphabet(masks[maskIndex]);
    const characterIndex = serializable[start + maskIndex];
    if (alphabet && characterIndex !== undefined) {
      positions.push({ characterIndex, maskIndex, alphabet });
    }
  }
  if (positions.length === 0 || step === 0) return value;

  let carry = 0n;
  for (let index = positions.length - 1; index >= 0; index--) {
    const position = positions[index];
    const base = BigInt(position.alphabet.length);
    const currentDigit = position.alphabet.indexOf(characters[position.characterIndex]);
    // A cluster outside this mask's alphabet is not a digit and cannot carry
    // into the next position (for example lowercase data under an N mask).
    if (currentDigit < 0) {
      carry = 0n;
      continue;
    }
    const incrementIndex = increments.length - masks.length + position.maskIndex;
    const incrementCharacter = increments[incrementIndex];
    const incrementDigit = !increment.trim()
      ? (index === positions.length - 1 ? 1 : 0)
      : Math.max(0, position.alphabet.indexOf(incrementCharacter ?? ""));
    const next = BigInt(currentDigit) + BigInt(incrementDigit) * BigInt(step) + carry;
    characters[position.characterIndex] = position.alphabet[Number(next % base)];
    carry = next / base;
  }
  return characters.join("");
}

