import {
  getZplCommandGuide,
  zplCommandGuides,
  zplDocumentationCoverage,
} from "../../../web/zplDocumentation";

export default defineEventHandler((event) => {
  const slug = (getRouterParam(event, "slug") ?? "").replace(/\.json$/, "");
  const guide = getZplCommandGuide(slug);
  if (!guide) {
    throw createError({
      statusCode: 404,
      statusMessage: "ZPL command not found",
    });
  }

  const guideIndex = zplCommandGuides.findIndex(({ slug: candidate }) => candidate === guide.slug);
  const adjacentGuide = (index: number) => {
    const candidate = zplCommandGuides[index];
    return candidate
      ? {
          canonical: candidate.canonical,
          slug: candidate.slug,
          title: candidate.title,
        }
      : undefined;
  };

  return {
    guide,
    previousGuide: adjacentGuide(guideIndex - 1),
    nextGuide: adjacentGuide(guideIndex + 1),
    coverage: zplDocumentationCoverage,
  };
});
