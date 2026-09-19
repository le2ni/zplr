<template>
  <main class="flex h-dvh items-center justify-center bg-white dark:bg-zinc-950">
    <div class="text-center">
      <img :src="logoUrl" class="mx-auto h-10 dark:invert" alt="ZPLr" />
      <h1 class="mt-5 text-2xl font-bold text-zinc-900 dark:text-white">ZPL Editor</h1>
      <p class="mt-4 text-sm text-zinc-500 dark:text-zinc-400" role="status">Opening the local ZPL editor…</p>
      <p class="mx-auto mt-4 max-w-md px-6 text-sm/6 text-zinc-600 dark:text-zinc-300">
        Edit Zebra label code, preview barcodes, and export PNG images in your browser.
      </p>
      <a href="#editor-guide-title" class="mt-5 inline-block text-sm text-blue-700 underline dark:text-blue-300">Read the editor instructions</a>
    </div>
  </main>
</template>

<script setup lang="ts">
import logoUrl from "../../web/assets/logo.svg";
</script>
