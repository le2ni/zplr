export interface TextCluster {
  character: string;
  start: number;
  end: number;
}

let segmenter: Intl.Segmenter | undefined;

/** Use the runtime API without bundling segmentation code or Unicode tables. */
export function textClusters(value: string): TextCluster[] {
  if (typeof Intl !== "undefined" && typeof Intl.Segmenter === "function") {
    segmenter ??= new Intl.Segmenter("en", { granularity: "grapheme" });
    return Array.from(segmenter.segment(value), ({ segment, index }) => ({
      character: segment,
      start: index,
      end: index + segment.length,
    }));
  }
  // Preserve the earlier code-point behavior on runtimes without Segmenter.
  let offset = 0;
  return Array.from(value, (character) => {
    const start = offset;
    offset += character.length;
    return { character, start, end: offset };
  });
}

/** Controls and bidi formatting are retained in backing stores but consume no mask. */
export function isSerializationControl(value: string): boolean {
  return /^[\u0000-\u001f\u007f-\u009f\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]+$/u.test(value);
}
