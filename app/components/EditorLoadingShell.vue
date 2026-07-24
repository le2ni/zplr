<template>
  <main class="flex h-dvh items-center justify-center bg-white dark:bg-zinc-950">
    <div class="text-center">
      <img :src="logoUrl" class="mx-auto h-10 dark:invert" alt="ZPLr" />
      <h1 class="sr-only">ZPL Editor</h1>
      <p class="mt-4 text-sm text-zinc-500 dark:text-zinc-400" role="status">Opening the local ZPL editor…</p>
    </div>
  </main>
</template>

<script setup lang="ts">
import logoUrl from "../../web/assets/logo.svg";
</script>
