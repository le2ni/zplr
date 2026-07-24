<template>
  <ClientOnly>
    <EditorClient />
    <template #fallback>
      <EditorLoadingShell />
    </template>
  </ClientOnly>
</template>

<script setup lang="ts">
import logoUrl from "../../web/assets/logo.svg";

const config = useRuntimeConfig();
const canonical = `${config.public.siteUrl}/editor`;

useSeoMeta({
  title: "Online ZPL Editor & Visual Designer — ZPLr",
  description: "Edit, preview, and visually design ZPL labels locally in your browser with ZPLr.",
  robots: "noindex, follow",
  ogTitle: "Online ZPL Editor & Visual Designer — ZPLr",
  ogDescription: "Edit and render ZPL labels locally in your browser.",
  ogUrl: canonical,
});

useHead({
  link: [
    { rel: "canonical", href: canonical },
    { rel: "icon", type: "image/svg+xml", href: logoUrl },
  ],
});
</script>
