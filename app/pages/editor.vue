<template>
  <div>
    <ClientOnly>
      <EditorClient />
      <template #fallback>
        <EditorLoadingShell />
      </template>
    </ClientOnly>

    <section aria-labelledby="editor-guide-title" class="border-t border-zinc-200 bg-white px-6 py-12 text-zinc-900 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-100">
      <div class="mx-auto max-w-4xl">
        <h2 id="editor-guide-title" class="text-2xl font-bold">How to edit and export a ZPL label</h2>
        <p class="mt-4 text-sm/7">
          This free online ZPL editor combines a code workspace, a live label preview, and a visual designer.
          Open a .zpl file or paste Zebra Programming Language into the source editor. Labels, images, fonts,
          and imported CSV or JSON records are processed on your device, with no account or label upload required.
        </p>
        <ol class="mt-6 list-decimal space-y-3 pl-5 text-sm/7">
          <li>Start with a complete label between <NuxtLink to="/zpl-commands/caret-xa" class="underline">^XA</NuxtLink> and <NuxtLink to="/zpl-commands/caret-xz" class="underline">^XZ</NuxtLink>, or open one of the editor's examples.</li>
          <li>Set the print density in Editor and printer settings. Check the label width with <NuxtLink to="/zpl-commands/caret-pw" class="underline">^PW</NuxtLink> and length with <NuxtLink to="/zpl-commands/caret-ll" class="underline">^LL</NuxtLink>; these dimensions are in printer dots.</li>
          <li>Edit the source or select supported fields in the visual designer. Use the Problems panel to inspect diagnostics linked to the relevant command.</li>
          <li>Save the ZPL source for your printing workflow, export a PNG preview, or save the complete workspace as a ZIP. Variable-data records can be exported as a batch of PNG labels.</li>
        </ol>
        <p class="mt-6 text-sm/7">
          A preview helps check layout before printing. Printer configuration, resident fonts, and hardware commands
          can affect the physical result. Check the <NuxtLink to="/zpl-commands" class="underline">ZPL command reference and support notes</NuxtLink>
          and test on your target printer before a production run.
        </p>
        <p class="mt-6 text-sm/7">
          For a quick preview, use the <NuxtLink to="/" class="underline">online ZPL viewer</NuxtLink>.
          The editor needs JavaScript enabled in a modern browser; the instructions and command reference remain readable without it.
        </p>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
const config = useRuntimeConfig();
const canonical = `${config.public.siteUrl}/editor`;

useSeoMeta({
  title: "Free Online ZPL Editor & Visual Label Designer | ZPLr",
  description: "Open ZPL files, edit code or design labels visually, and export PNGs. Free browser editor with live previews, command help, and local processing.",
  robots: "index, follow",
  ogType: "website",
  ogTitle: "Free Online ZPL Editor & Visual Label Designer | ZPLr",
  ogDescription: "Open ZPL files, design labels, and export PNG previews locally in your browser.",
  ogUrl: canonical,
});

useHead({
  link: [
    { rel: "canonical", href: canonical },
  ],
});
</script>
